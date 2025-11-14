import { StoredVideoSegment, GenerationQueueTask } from '../types';

const DB_NAME = 'VeoVisualNovelDB';
const SEGMENT_STORE_NAME = 'videoSegments';
const GENERATION_TASK_STORE_NAME = 'generationTasks';
const DB_VERSION = 3; // Incremented for multi-generation support

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
      const transaction = (event.target as IDBOpenDBRequest).transaction;
      const oldVersion = event.oldVersion;
      
      if (!dbInstance.objectStoreNames.contains(SEGMENT_STORE_NAME)) {
        dbInstance.createObjectStore(SEGMENT_STORE_NAME, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(GENERATION_TASK_STORE_NAME)) {
        dbInstance.createObjectStore(GENERATION_TASK_STORE_NAME, { keyPath: 'id' });
      }
      
      // Migration from version 2 to 3: Add multi-generation support
      if (oldVersion < 3 && transaction) {
        const segmentStore = transaction.objectStore(SEGMENT_STORE_NAME);
        const getAllRequest = segmentStore.getAll();
        
        getAllRequest.onsuccess = () => {
          const segments = getAllRequest.result as StoredVideoSegment[];
          
          // Migrate each segment to include generations array
          segments.forEach((segment) => {
            if (!segment.generations && segment.videoBlob) {
              // Create initial generation from existing video
              const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              segment.generations = [{
                generationId,
                videoBlob: segment.videoBlob,
                lastFrameDataUrl: segment.lastFrameDataUrl,
                createdAt: Date.now(),
                model: undefined,
              }];
              segment.activeGenerationId = generationId;
              
              // Save migrated segment
              segmentStore.put(segment);
            }
          });
        };
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

/**
 * Add a new video generation to a segment
 */
export const addGenerationToSegment = async (
  segmentId: number,
  videoBlob: Blob,
  lastFrameDataUrl: string | null,
  model?: string
): Promise<string> => {
  const db = await initDB();
  const transaction = db.transaction(SEGMENT_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SEGMENT_STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(segmentId);
    
    getRequest.onsuccess = () => {
      const segment = getRequest.result as StoredVideoSegment | undefined;
      if (!segment) {
        reject(new Error(`Segment ${segmentId} not found`));
        return;
      }
      
      // Generate new generation ID
      const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize generations array if needed
      if (!segment.generations) {
        segment.generations = [];
      }
      
      // Add new generation
      segment.generations.push({
        generationId,
        videoBlob,
        lastFrameDataUrl,
        createdAt: Date.now(),
        model,
      });
      
      // Set as active generation
      segment.activeGenerationId = generationId;
      segment.videoBlob = videoBlob;
      segment.lastFrameDataUrl = lastFrameDataUrl;
      
      // Save updated segment
      const putRequest = store.put(segment);
      putRequest.onsuccess = () => resolve(generationId);
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Switch the active generation for a segment
 */
export const setActiveGeneration = async (
  segmentId: number,
  generationId: string
): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(SEGMENT_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SEGMENT_STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(segmentId);
    
    getRequest.onsuccess = () => {
      const segment = getRequest.result as StoredVideoSegment | undefined;
      if (!segment) {
        reject(new Error(`Segment ${segmentId} not found`));
        return;
      }
      
      // Find the generation
      const generation = segment.generations?.find(g => g.generationId === generationId);
      if (!generation) {
        reject(new Error(`Generation ${generationId} not found in segment ${segmentId}`));
        return;
      }
      
      // Update active generation
      segment.activeGenerationId = generationId;
      segment.videoBlob = generation.videoBlob;
      segment.lastFrameDataUrl = generation.lastFrameDataUrl;
      
      // Save updated segment
      const putRequest = store.put(segment);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Delete a specific generation from a segment
 * Cannot delete the active generation
 */
export const deleteGeneration = async (
  segmentId: number,
  generationId: string
): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(SEGMENT_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SEGMENT_STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(segmentId);
    
    getRequest.onsuccess = () => {
      const segment = getRequest.result as StoredVideoSegment | undefined;
      if (!segment) {
        reject(new Error(`Segment ${segmentId} not found`));
        return;
      }
      
      // Cannot delete active generation
      if (segment.activeGenerationId === generationId) {
        reject(new Error('Cannot delete the active generation. Switch to another generation first.'));
        return;
      }
      
      // Remove the generation
      if (segment.generations) {
        segment.generations = segment.generations.filter(g => g.generationId !== generationId);
      }
      
      // Save updated segment
      const putRequest = store.put(segment);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};
