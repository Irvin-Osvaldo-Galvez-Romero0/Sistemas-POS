/**
 * Transactional Concurrency Control & Web Locks API Wrapper (ISO/IEC 25010)
 * Prevents race conditions during rapid barcode bursts, concurrent checkouts, and shift cuts.
 */

class InMemoryMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) next();
        });
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  isLocked(): boolean {
    return this.locked;
  }
}

const mutexRegistry = new Map<string, InMemoryMutex>();

function getMutex(name: string): InMemoryMutex {
  let m = mutexRegistry.get(name);
  if (!m) {
    m = new InMemoryMutex();
    mutexRegistry.set(name, m);
  }
  return m;
}

export const LOCK_NAMES = {
  CHECKOUT: 'pos_transaction_checkout_lock',
  SHIFT_CUT: 'pos_transaction_shift_cut_lock',
  HARDWARE_DRAWER: 'pos_hardware_drawer_lock',
  OUTBOX_SYNC: 'pos_outbox_sync_lock',
} as const;

/**
 * Executes an async task under an exclusive lock.
 * Uses Web Locks API (navigator.locks) when supported, with an in-memory Mutex fallback.
 */
export async function runWithTransactionLock<T>(
  lockName: string,
  task: () => Promise<T> | T
): Promise<T> {
  // Check if native Web Locks API is available (Modern Browsers)
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
    return new Promise<T>((resolve, reject) => {
      navigator.locks.request(
        lockName,
        { mode: 'exclusive' },
        async () => {
          try {
            const result = await task();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      ).catch(reject);
    });
  }

  // Fallback: In-memory Mutex queue
  const mutex = getMutex(lockName);
  const release = await mutex.acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

/**
 * Checks if a named transaction lock is currently held.
 */
export function isTransactionLockHeld(lockName: string): boolean {
  const mutex = mutexRegistry.get(lockName);
  return mutex ? mutex.isLocked() : false;
}
