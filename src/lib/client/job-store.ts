"use client";

import { siteConfig } from "@/config/site";
import type { ReconciliationResult, StatementSummary, Transaction } from "@/lib/schema/statement";

/**
 * Local job state.
 *
 * The customer has to survive a redirect to Stripe and back, which means something about
 * the conversion must outlive the page. We keep it in IndexedDB on the customer's own
 * device rather than on a server, and we keep as little as possible:
 *
 * - the sealed envelope, which is ciphertext when `EXPORT_SEAL_SECRET` is configured;
 * - the digest, which is a one-way hash;
 * - the ten-row preview and the summary, which the customer has already seen on screen.
 *
 * That record is then encrypted again at rest with a per-device AES-GCM key that is
 * generated as non-extractable and stored as a `CryptoKey` handle. The key material never
 * exists as bytes in JavaScript, so it cannot be read out of storage by inspection, copied
 * to another device, or exfiltrated as a string. Script running on this origin could still
 * use the handle, so this is defence against someone with the disk, not against XSS —
 * which is why the CSP is strict and no third-party script runs on the app route.
 *
 * Records self-destruct after an hour, or when the customer uses the explicit delete
 * control. Downloading does not delete them — the pack is four separate files, and a
 * customer who took the CSV should still be able to take the workbook.
 */

const DB_NAME = "statement-reconcile";
const DB_VERSION = 1;
const JOB_STORE = "jobs";
const KEY_STORE = "keys";
const KEY_ID = "record-key-v1";

const TTL_MS = siteConfig.limits.localJobTtlMinutes * 60 * 1000;

export type StoredJob = {
  jobId: string;
  digest: string;
  sealed: string;
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  preview: Transaction[];
  totalTransactions: number;
  warnings: string[];
  /** Set once the customer returns from a completed checkout. */
  sessionId?: string;
  createdAt: number;
};

type EncryptedRecord = {
  jobId: string;
  digest: string;
  nonce: ArrayBuffer;
  payload: ArrayBuffer;
  createdAt: number;
  expiresAt: number;
};

export function storageAvailable(): boolean {
  return (
    typeof indexedDB !== "undefined" &&
    typeof globalThis.crypto !== "undefined" &&
    Boolean(globalThis.crypto.subtle)
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(JOB_STORE)) {
        db.createObjectStore(JOB_STORE, { keyPath: "jobId" });
      }
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function recordKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await promisify<CryptoKey | undefined>(
    db.transaction(KEY_STORE, "readonly").objectStore(KEY_STORE).get(KEY_ID),
  );
  if (existing) return existing;

  const key = await globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await promisify(db.transaction(KEY_STORE, "readwrite").objectStore(KEY_STORE).put(key, KEY_ID));
  return key;
}

/**
 * Persist a job, reporting whether it actually landed.
 *
 * The caller needs the answer rather than a fire-and-forget promise: a browser that cannot
 * store the sealed result is a browser where paying would buy a download that then fails, and
 * the customer has to be warned about that *before* the payment button appears. Private
 * browsing modes and blocked-storage settings both surface here.
 */
export async function saveJob(job: StoredJob): Promise<boolean> {
  if (!storageAvailable()) return false;
  const db = await openDb();
  try {
    const key = await recordKey(db);
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(job));
    const payload = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: new TextEncoder().encode(job.digest) },
      key,
      plaintext,
    );

    const record: EncryptedRecord = {
      jobId: job.jobId,
      digest: job.digest,
      nonce: nonce.buffer as ArrayBuffer,
      payload,
      createdAt: job.createdAt,
      expiresAt: job.createdAt + TTL_MS,
    };
    await promisify(db.transaction(JOB_STORE, "readwrite").objectStore(JOB_STORE).put(record));
    plaintext.fill(0);
  } catch {
    return false;
  } finally {
    db.close();
  }
  await pruneExpired();
  return true;
}

async function decode(key: CryptoKey, record: EncryptedRecord): Promise<StoredJob | null> {
  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(record.nonce),
        additionalData: new TextEncoder().encode(record.digest),
      },
      key,
      record.payload,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as StoredJob;
  } catch {
    // A record we cannot open is worthless. Treat it as absent; pruning removes it.
    return null;
  }
}

export async function loadJob(jobId: string): Promise<StoredJob | null> {
  if (!storageAvailable()) return null;
  const db = await openDb();
  try {
    const record = await promisify<EncryptedRecord | undefined>(
      db.transaction(JOB_STORE, "readonly").objectStore(JOB_STORE).get(jobId),
    );
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      await promisify(db.transaction(JOB_STORE, "readwrite").objectStore(JOB_STORE).delete(jobId));
      return null;
    }
    return decode(await recordKey(db), record);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * Find the job matching a paid digest.
 *
 * After returning from Stripe the browser knows the session, and `/api/checkout/verify`
 * turns that into a digest. Looking the job up by digest rather than by an id carried
 * through the redirect means the download still works if the customer paid in a different
 * tab, or came back from their email later.
 */
export async function findJobByDigest(digest: string): Promise<StoredJob | null> {
  if (!storageAvailable()) return null;
  const db = await openDb();
  try {
    const records = await promisify<EncryptedRecord[]>(
      db.transaction(JOB_STORE, "readonly").objectStore(JOB_STORE).getAll(),
    );
    const match = records.find(
      (record) => record.digest === digest && record.expiresAt > Date.now(),
    );
    if (!match) return null;
    return decode(await recordKey(db), match);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function listJobs(): Promise<
  Array<Pick<StoredJob, "jobId" | "digest" | "createdAt">>
> {
  if (!storageAvailable()) return [];
  const db = await openDb();
  try {
    const records = await promisify<EncryptedRecord[]>(
      db.transaction(JOB_STORE, "readonly").objectStore(JOB_STORE).getAll(),
    );
    return records
      .filter((record) => record.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ jobId, digest, createdAt }) => ({ jobId, digest, createdAt }));
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  if (!storageAvailable()) return;
  const db = await openDb();
  try {
    await promisify(db.transaction(JOB_STORE, "readwrite").objectStore(JOB_STORE).delete(jobId));
  } catch {
    // Nothing to recover: the record either went away or was never there.
  } finally {
    db.close();
  }
}

/** Remove every stored job. Wired to the "Delete my data" control. */
export async function clearAllJobs(): Promise<void> {
  if (!storageAvailable()) return;
  const db = await openDb();
  try {
    await promisify(db.transaction(JOB_STORE, "readwrite").objectStore(JOB_STORE).clear());
  } catch {
    // Ignore: clearing is best-effort and the records expire on their own.
  } finally {
    db.close();
  }
}

export async function pruneExpired(): Promise<void> {
  if (!storageAvailable()) return;
  const db = await openDb();
  try {
    const store = db.transaction(JOB_STORE, "readwrite").objectStore(JOB_STORE);
    const records = await promisify<EncryptedRecord[]>(store.getAll());
    const now = Date.now();
    for (const record of records) {
      if (record.expiresAt <= now) store.delete(record.jobId);
    }
  } catch {
    // Best-effort.
  } finally {
    db.close();
  }
}
