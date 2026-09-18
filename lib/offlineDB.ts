// Browser-only check for Next.js SSR
const isBrowser = typeof window !== "undefined";

const DB_NAME = "daily-goal-offline";
const DB_VERSION = 1;

export interface OfflineChange {
  id: string;
  table: string;
  action: "insert" | "update" | "delete" | "upsert";
  data: any;
  timestamp: number;
}

// Helper to convert IDBRequest to Promise
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!isBrowser) {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }
  
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("offline-changes")) {
        db.createObjectStore("offline-changes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cached-data")) {
        db.createObjectStore("cached-data", { keyPath: "key" });
      }
    };
  });
  
  return dbPromise;
}

// Queue offline changes for later sync
export async function queueChange(change: Omit<OfflineChange, "id" | "timestamp">): Promise<void> {
  if (!isBrowser) return;
  
  try {
    const db = await openDB();
    const tx = db.transaction("offline-changes", "readwrite");
    const store = tx.objectStore("offline-changes");
    
    await promisifyRequest(
      store.add({
        ...change,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      })
    );
    
    // Trigger background sync if available
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) {
        await (reg as any).sync.register("sync-offline-changes");
      }
    }
  } catch (error) {
    console.error("Failed to queue offline change:", error);
  }
}

// Get all pending offline changes
export async function getOfflineChanges(): Promise<OfflineChange[]> {
  if (!isBrowser) return [];
  
  try {
    const db = await openDB();
    const tx = db.transaction("offline-changes", "readonly");
    const store = tx.objectStore("offline-changes");
    const all = await promisifyRequest(store.getAll());
    return all;
  } catch (error) {
    console.error("Failed to get offline changes:", error);
    return [];
  }
}

// Clear synced changes
export async function clearOfflineChanges(ids: string[]): Promise<void> {
  if (!isBrowser) return;
  
  try {
    const db = await openDB();
    const tx = db.transaction("offline-changes", "readwrite");
    const store = tx.objectStore("offline-changes");
    for (const id of ids) {
      await promisifyRequest(store.delete(id));
    }
  } catch (error) {
    console.error("Failed to clear offline changes:", error);
  }
}

// Cache data locally
export async function cacheData(key: string, data: any): Promise<void> {
  if (!isBrowser) return;
  
  try {
    const db = await openDB();
    const tx = db.transaction("cached-data", "readwrite");
    const store = tx.objectStore("cached-data");
    await promisifyRequest(store.put({ key, data, timestamp: Date.now() }));
  } catch (error) {
    console.error("Failed to cache data:", error);
  }
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!isBrowser) return null;
  
  try {
    const db = await openDB();
    const tx = db.transaction("cached-data", "readonly");
    const store = tx.objectStore("cached-data");
    const result = await promisifyRequest(store.get(key));
    return result?.data || null;
  } catch (error) {
    console.error("Failed to get cached data:", error);
    return null;
  }
}