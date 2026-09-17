/**
 * Outbox Pattern Engine with IndexedDB (GSTACK & ISO/IEC 25010)
 * Immediate local persistence with offline resilience and idempotent UUID v4 + Terminal ID contracts.
 */

import { SaleTransaction } from '../types/pos';
import { encryptData, EncryptedPayload } from './security';

export interface OutboxRecord {
  id: string; // Idempotent key: TERM_ID:UUID_v4
  folio: string;
  timestamp: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  encryptedPayload: EncryptedPayload;
  total: number;
  itemsCount: number;
}

const DB_NAME = 'POS_OUTBOX_DB_V1';
const STORE_NAME = 'outbox_transactions';
const DB_VERSION = 1;

// In-memory fallback if IndexedDB is not available
const memoryOutbox = new Map<string, OutboxRecord>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && !!window.indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB not available'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates an idempotent ticket contract ID (Terminal ID + UUID v4).
 */
export function generateIdempotentTicketId(terminalId: string = 'TERM_01'): string {
  const uuid = typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : 'uuid-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now();
  return `${terminalId}:${uuid}`;
}

/**
 * Enqueue a completed sale transaction into the encrypted Outbox.
 */
export async function enqueueTransaction(
  sale: SaleTransaction,
  terminalId: string = 'TERM_01'
): Promise<OutboxRecord> {
  const recordId = generateIdempotentTicketId(terminalId);
  const encrypted = await encryptData(sale);

  const record: OutboxRecord = {
    id: recordId,
    folio: sale.folio,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    retryCount: 0,
    encryptedPayload: encrypted,
    total: sale.total,
    itemsCount: sale.items.length,
  };

  if (!isIndexedDBAvailable()) {
    memoryOutbox.set(record.id, record);
    return record;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all pending transactions ready for sync.
 */
export async function getPendingTransactions(): Promise<OutboxRecord[]> {
  if (!isIndexedDBAvailable()) {
    return Array.from(memoryOutbox.values()).filter((r) => r.status === 'PENDING');
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const req = index.getAll('PENDING');

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mark a transaction as successfully synced with the remote server.
 */
export async function markTransactionSynced(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const r = memoryOutbox.get(id);
    if (r) r.status = 'SYNCED';
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as OutboxRecord | undefined;
      if (record) {
        record.status = 'SYNCED';
        store.put(record);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Retrieve Outbox metrics for live dashboard diagnostics.
 */
export async function getOutboxStats(): Promise<{ pending: number; synced: number; total: number }> {
  if (!isIndexedDBAvailable()) {
    const list = Array.from(memoryOutbox.values());
    const pending = list.filter((r) => r.status === 'PENDING').length;
    const synced = list.filter((r) => r.status === 'SYNCED').length;
    return { pending, synced, total: list.length };
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const list = (req.result || []) as OutboxRecord[];
      const pending = list.filter((r) => r.status === 'PENDING').length;
      const synced = list.filter((r) => r.status === 'SYNCED').length;
      resolve({ pending, synced, total: list.length });
    };
    req.onerror = () => reject(req.error);
  });
}
