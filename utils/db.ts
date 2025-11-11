import { StoredVideoSegment, GenerationQueueTask } from '../types';

const DB_NAME = 'VeoVisualNovelDB';
const SEGMENT_STORE_NAME = 'videoSegments';
const GENERATION_TASK_STORE_NAME = 'generationTasks';
const DB_VERSION = 2;

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database.');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(SEGMENT_STORE_NAME)) {
        dbInstance.createObjectStore(SEGMENT_STORE_NAME, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(GENERATION_TASK_STORE_NAME)) {
        dbInstance.createObjectStore(GENERATION_TASK_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSegment = (segment: StoredVideoSegment): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(SEGMENT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SEGMENT_STORE_NAME);
    const request = store.put(segment);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error("Failed to save segment:", request.error);
        reject(request.error);
    };
  });
};

export const loadSegments = (): Promise<StoredVideoSegment[]> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(SEGMENT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SEGMENT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        // Sort by id to ensure chronological order
        const sorted = request.result.sort((a, b) => a.id - b.id);
        resolve(sorted);
    };
    request.onerror = () => {
        console.error("Failed to load segments:", request.error);
        reject(request.error);
    };
  });
};

export const clearHistory = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(SEGMENT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SEGMENT_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error("Failed to clear history:", request.error);
        reject(request.error);
    };
  });
};

export const saveGenerationTask = (task: GenerationQueueTask): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(GENERATION_TASK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(GENERATION_TASK_STORE_NAME);
    const request = store.put(task);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to save generation task:', request.error);
      reject(request.error);
    };
  });
};

export const deleteGenerationTask = (taskId: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(GENERATION_TASK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(GENERATION_TASK_STORE_NAME);
    const request = store.delete(taskId);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to delete generation task:', request.error);
      reject(request.error);
    };
  });
};

export const loadGenerationTasks = (): Promise<GenerationQueueTask[]> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(GENERATION_TASK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(GENERATION_TASK_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
    };
    request.onerror = () => {
      console.error('Failed to load generation tasks:', request.error);
      reject(request.error);
    };
  });
};

export const clearGenerationTasks = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(GENERATION_TASK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(GENERATION_TASK_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear generation tasks:', request.error);
      reject(request.error);
    };
  });
};
