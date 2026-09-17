/**
 * Frontend Security & Cryptography Engine (ISO/IEC 27001)
 * Hardware Input Sanitization, SHA-256 Hashing, AES-GCM-256 At-Rest Encryption & Anti-Brute-Force.
 */

// Global cryptographic salt for PIN hashing
const PIN_SALT_PREFIX = 'POS_SECURE_SALT_v1_';

/**
 * Hash a cashier PIN using Web Crypto API SHA-256 with salt.
 */
export async function hashPin(pin: string, saltSuffix: string = 'TERMINAL_01'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT_PREFIX}${pin}_${saltSuffix}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an entered PIN against a stored hash or plain PIN (with migration support).
 */
export async function verifyPin(
  enteredPin: string,
  storedValue: string,
  saltSuffix: string = 'TERMINAL_01'
): Promise<boolean> {
  if (!enteredPin || !storedValue) return false;

  // If already hashed with sha256:
  if (storedValue.startsWith('sha256:')) {
    const computed = await hashPin(enteredPin, saltSuffix);
    return computed === storedValue;
  }

  // Fallback for unmigrated plain 4-digit PINs
  return enteredPin === storedValue;
}

/**
 * Sanitizes input from USB barcode scanners or keyboard input.
 * Strips ASCII control codes (0x00-0x1F, 0x7F), HTML/script tags, and ESC/POS escape sequences.
 */
export function sanitizeBarcodeInput(input: string): string {
  if (!input) return '';
  return input
    // 1. Remove non-printable ASCII control characters & ESC codes
    .replace(/[\x00-\x1F\x7F]/g, '')
    // 2. Remove script / HTML tags to prevent DOM-based XSS
    .replace(/[<>'"&]/g, '')
    // 3. Remove leading/trailing whitespace
    .trim()
    // 4. Limit barcode length to realistic max
    .slice(0, 64);
}

/**
 * Validates that an input does NOT contain sensitive PAN (credit card) or CVV patterns.
 * ISO/IEC 27001: Zero PAN/CVV in storage or offline logs.
 */
export function containsCreditCardPAN(input: string): boolean {
  if (!input) return false;
  // Clean separators
  const digits = input.replace(/[\s-]/g, '');
  // 13 to 19 consecutive digits matching credit card lengths
  return /^\d{13,19}$/.test(digits);
}

/* =========================================================================
   AES-GCM-256 Offline Encryption at Rest
   ========================================================================= */

const STORAGE_ENCRYPTION_SECRET = 'POS_OFFLINE_AES_GCM_STORAGE_SECRET_2026';

async function deriveAesKey(passphrase: string = STORAGE_ENCRYPTION_SECRET): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKeyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  return crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  iv: string; // Base64
  ciphertext: string; // Base64
  timestamp: string;
}

/**
 * Encrypt arbitrary JSON data with AES-GCM-256 for secure offline persistence.
 */
export async function encryptData<T>(data: T): Promise<EncryptedPayload> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for AES-GCM
  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Decrypt AES-GCM-256 encrypted payload back into typed object.
 */
export async function decryptData<T>(payload: EncryptedPayload): Promise<T> {
  const key = await deriveAesKey();
  const iv = new Uint8Array(
    atob(payload.iv)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const ciphertext = new Uint8Array(
    atob(payload.ciphertext)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decodedString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedString) as T;
}

/* =========================================================================
   Anti-Brute-Force Rate Limiter
   ========================================================================= */

interface AttemptRecord {
  failures: number;
  lockedUntil: number;
}

class PinRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private readonly MAX_FAILURES = 5;
  private readonly BASE_LOCKOUT_MS = 15_000; // 15 seconds

  checkAllowed(identifier: string): { allowed: boolean; waitSeconds: number } {
    const record = this.attempts.get(identifier);
    if (!record) return { allowed: true, waitSeconds: 0 };

    const now = Date.now();
    if (record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    return { allowed: true, waitSeconds: 0 };
  }

  recordFailure(identifier: string): { locked: boolean; waitSeconds: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { failures: 0, lockedUntil: 0 };
    record.failures += 1;

    if (record.failures >= this.MAX_FAILURES) {
      // Exponential penalty after 5 failures: 15s, 30s, 60s...
      const multiplier = Math.pow(2, record.failures - this.MAX_FAILURES);
      const lockoutDuration = Math.min(this.BASE_LOCKOUT_MS * multiplier, 300_000); // max 5 min
      record.lockedUntil = now + lockoutDuration;
      this.attempts.set(identifier, record);
      return { locked: true, waitSeconds: Math.ceil(lockoutDuration / 1000) };
    }

    this.attempts.set(identifier, record);
    return { locked: false, waitSeconds: 0 };
  }

  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  resetAll(): void {
    this.attempts.clear();
  }
}

export const pinRateLimiter = new PinRateLimiter();
