// Local persistence for designs and uploaded images (IndexedDB). Nothing is sent
// to a server. Falls back to memory when IndexedDB is unavailable (private modes).
import type { Doc } from "./model";

const DB_NAME = "chart-designer";
const DB_VERSION = 1;
export type ProjectSummary = { id: string; name: string; width: number; height: number; updatedAt: number; elements: number };
export type Asset = { id: string; name: string; src: string; width: number; height: number; createdAt: number };

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = { projects: new Map<string, Doc>(), assets: new Map<string, Asset>() };

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
        if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** True when designs are saved persistently (false = only for this tab). */
export async function storageAvailable(): Promise<boolean> {
  return (await openDb()) !== null;
}

function tx<T>(db: IDBDatabase, store: "projects" | "assets", mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error ?? req.error);
    t.onabort = () => reject(t.error ?? new Error("Transaction aborted"));
  });
}

export async function saveProject(doc: Doc): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.projects.set(doc.id, doc);
    return;
  }
  await tx(db, "projects", "readwrite", (s) => s.put(doc));
}

export async function loadProject(id: string): Promise<Doc | null> {
  const db = await openDb();
  if (!db) return memory.projects.get(id) ?? null;
  return ((await tx(db, "projects", "readonly", (s) => s.get(id))) as Doc | undefined) ?? null;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDb();
  const docs = db ? ((await tx(db, "projects", "readonly", (s) => s.getAll())) as Doc[]) : [...memory.projects.values()];
  return docs.map((d) => ({ id: d.id, name: d.name, width: d.width, height: d.height, updatedAt: d.updatedAt, elements: d.elements.length })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.projects.delete(id);
    return;
  }
  await tx(db, "projects", "readwrite", (s) => s.delete(id));
}

export async function saveAsset(asset: Asset): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.assets.set(asset.id, asset);
    return;
  }
  await tx(db, "assets", "readwrite", (s) => s.put(asset));
}

export async function listAssets(): Promise<Asset[]> {
  const db = await openDb();
  const all = db ? ((await tx(db, "assets", "readonly", (s) => s.getAll())) as Asset[]) : [...memory.assets.values()];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    memory.assets.delete(id);
    return;
  }
  await tx(db, "assets", "readwrite", (s) => s.delete(id));
}

const LAST_KEY = "chart-designer:last";
export function rememberLastProject(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // Storage blocked: the project is still saved in IndexedDB.
  }
}
export function lastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
