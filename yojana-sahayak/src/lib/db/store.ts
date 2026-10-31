/**
 * Device-local storage. Chat history, saved schemes and reports live in
 * IndexedDB; the UI language lives in localStorage so it is readable
 * synchronously before first paint. Nothing here is ever sent to a server.
 */
import type { Language } from "../api/types";
import type { Msg } from "../chat/reducer";

const DB_NAME = "yojana-sahayak";
const DB_VERSION = 1;
const STORES = ["chat", "savedSchemes", "reports"] as const;
type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(store, mode).objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const db = {
  get: <T,>(store: StoreName, key: string) => tx<T | undefined>(store, "readonly", (s) => s.get(key)),
  put: (store: StoreName, key: string, value: unknown) => tx(store, "readwrite", (s) => s.put(value, key)),
  del: (store: StoreName, key: string) => tx(store, "readwrite", (s) => s.delete(key)),
  keys: (store: StoreName) => tx<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys()),
  clear: (store: StoreName) => tx(store, "readwrite", (s) => s.clear()),
};

// ---- chat ----
const SESSION_KEY = "current";
export interface StoredChat {
  sessionId: string;
  messages: Msg[];
}
export async function loadChat(): Promise<StoredChat | undefined> {
  try {
    return await db.get<StoredChat>("chat", SESSION_KEY);
  } catch {
    return undefined;
  }
}
export async function saveChat(c: StoredChat): Promise<void> {
  try {
    // Never persist half-streamed messages.
    await db.put("chat", SESSION_KEY, { ...c, messages: c.messages.filter((m) => m.state !== "streaming") });
  } catch {
    /* storage may be blocked (private mode) — chat still works in memory */
  }
}
export async function clearChat(): Promise<void> {
  try {
    await db.clear("chat");
  } catch {
    /* ignore */
  }
}

// ---- saved schemes ----
export const savedSchemes = {
  list: async (): Promise<string[]> => {
    try {
      return (await db.keys("savedSchemes")).map(String);
    } catch {
      return [];
    }
  },
  add: (id: string) => db.put("savedSchemes", id, { savedAt: Date.now() }),
  remove: (id: string) => db.del("savedSchemes", id),
};

// ---- problem reports (local only in mock) ----
// INTEGRATE: when the backend exposes a report endpoint, POST here instead of storing locally.
export async function saveReport(messageId: string, note: string): Promise<void> {
  await db.put("reports", `${messageId}-${Date.now()}`, { messageId, note, at: Date.now() });
}

// ---- language ----
const LANG_KEY = "ys.lang";
export function getLanguage(): Language {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "hi" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}
export function setLanguage(l: Language) {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}
