// IndexedDB wrapper for offline-first cache (parent + student portals).
// Stores arbitrary JSON blobs keyed by section + user id, with a timestamp.

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "gifford-offline-v1";
const STORE = "sections";
const PREFS = "preferences";

interface CacheRow {
  key: string;
  data: unknown;
  syncedAt: number;
}

interface PrefRow {
  key: string;
  enabled: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(PREFS)) {
          db.createObjectStore(PREFS, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export function buildKey(section: string, userId: string | undefined | null) {
  return `${section}::${userId ?? "anon"}`;
}

export async function saveSection(section: string, userId: string | null | undefined, data: unknown) {
  try {
    const db = await getDB();
    const row: CacheRow = { key: buildKey(section, userId), data, syncedAt: Date.now() };
    await db.put(STORE, row);
  } catch (e) {
    console.warn("[offline] saveSection failed", section, e);
  }
}

export async function loadSection<T = unknown>(
  section: string,
  userId: string | null | undefined,
): Promise<{ data: T; syncedAt: number } | null> {
  try {
    const db = await getDB();
    const row = (await db.get(STORE, buildKey(section, userId))) as CacheRow | undefined;
    if (!row) return null;
    return { data: row.data as T, syncedAt: row.syncedAt };
  } catch (e) {
    console.warn("[offline] loadSection failed", section, e);
    return null;
  }
}

export async function clearSection(section: string, userId: string | null | undefined) {
  try {
    const db = await getDB();
    await db.delete(STORE, buildKey(section, userId));
  } catch {}
}

export async function getOfflinePref(section: string, userId: string | null | undefined): Promise<boolean> {
  try {
    const db = await getDB();
    const row = (await db.get(PREFS, buildKey(section, userId))) as PrefRow | undefined;
    return row?.enabled ?? false;
  } catch {
    return false;
  }
}

export async function setOfflinePref(section: string, userId: string | null | undefined, enabled: boolean) {
  try {
    const db = await getDB();
    await db.put(PREFS, { key: buildKey(section, userId), enabled });
  } catch {}
}

export async function totalCachedBytesEstimate(): Promise<number | null> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return est.usage ?? null;
    }
  } catch {}
  return null;
}
