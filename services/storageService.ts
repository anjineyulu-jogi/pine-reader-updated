
const DB_NAME = 'PineReaderDB';
const STORE_FILES = 'files';
const STORE_BOOKMARKS = 'bookmarks';
const STORE_AUDIO = 'audio';
const DB_VERSION = 5; // Incremented for Audio store

// Interface for what we store in IndexedDB
export interface StoredFileEntry {
    id: string; // strict key (filename)
    file: File | Blob;
    name: string;
    type: string;
    size: number;
    lastOpened: number;
}

export interface StoredFileMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    lastOpened: number;
}

export interface StoredBookmark {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  type: 'HEADING' | 'LINK' | 'TABLE' | 'TEXT';
  pageNumber: number;
  timestamp: number;
}

// Open Database
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject("Error opening database");
        
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
                db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_AUDIO)) {
                db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
            }
        };

        request.onblocked = () => {
            console.warn("Database upgrade blocked. Please close other tabs of this app.");
        };
    });
};

// Save file to IndexedDB
export const saveRecentFileToStorage = async (file: File): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readwrite');
            const store = tx.objectStore(STORE_FILES);
            
            const entry: StoredFileEntry = {
                id: file.name, // Use filename as unique ID
                file: file,
                name: file.name,
                type: file.type,
                size: file.size,
                lastOpened: Date.now()
            };

            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject("Failed to save file");
        });
    } catch (e) {
        console.error("Storage Error:", e);
    }
};

// Get list of recent files (Metadata only)
export const getRecentFilesList = async (): Promise<StoredFileMetadata[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result as StoredFileEntry[];
                const metadata = results.map(r => ({
                    id: r.id,
                    name: r.name,
                    type: r.type,
                    size: r.size,
                    lastOpened: r.lastOpened
                })).sort((a, b) => b.lastOpened - a.lastOpened); // Sort by newest
                resolve(metadata);
            };
            request.onerror = () => resolve([]); 
        });
    } catch (e) {
        console.warn("Could not retrieve recent files", e);
        return [];
    }
};

// Retrieve specific file from IndexedDB
export const getStoredFile = async (id: string): Promise<File | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const request = store.get(id);
            
            request.onsuccess = () => {
                const result = request.result as StoredFileEntry;
                if (result && result.file) {
                    const file = new File([result.file], result.name, { 
                        type: result.type,
                        lastModified: result.lastOpened 
                    });
                    resolve(file);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
};

// --- BOOKMARKS OPERATIONS ---

export const saveBookmark = async (bookmark: StoredBookmark): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
            const store = tx.objectStore(STORE_BOOKMARKS);
            const request = store.put(bookmark);
            request.onsuccess = () => resolve();
            request.onerror = () => reject("Failed to save bookmark");
        });
    } catch (e) { console.error(e); }
};

export const getBookmarks = async (): Promise<StoredBookmark[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
            const store = tx.objectStore(STORE_BOOKMARKS);
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result as StoredBookmark[];
                // Sort by most recent
                resolve(results.sort((a, b) => b.timestamp - a.timestamp));
            };
            request.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
};

export const deleteBookmark = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
            const store = tx.objectStore(STORE_BOOKMARKS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject("Failed to delete bookmark");
        });
    } catch (e) { console.error(e); }
};

// --- AUDIO CACHE OPERATIONS ---

export const saveAudioData = async (fileId: string, pageNumber: number, audioData: ArrayBuffer): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_AUDIO, 'readwrite');
            const store = tx.objectStore(STORE_AUDIO);
            const id = `${fileId}_p${pageNumber}`;
            // Store as Blob for efficiency
            const blob = new Blob([audioData], { type: 'audio/pcm' });
            
            const request = store.put({ id, data: blob, timestamp: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject("Failed to save audio");
        });
    } catch (e) { console.error(e); }
};

export const getAudioData = async (fileId: string, pageNumber: number): Promise<ArrayBuffer | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_AUDIO, 'readonly');
            const store = tx.objectStore(STORE_AUDIO);
            const id = `${fileId}_p${pageNumber}`;
            const request = store.get(id);
            
            request.onsuccess = async () => {
                const result = request.result;
                if (result && result.data) {
                    const blob = result.data as Blob;
                    const buffer = await blob.arrayBuffer();
                    resolve(buffer);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
};

// Backward compatibility (gets the most recent file)
export const getRecentFileFromStorage = async (): Promise<File | null> => {
    const list = await getRecentFilesList();
    if (list.length > 0) {
        return getStoredFile(list[0].id);
    }
    return null;
};

// Save page progress to LocalStorage
export const saveReadingProgress = (fileName: string, pageIndex: number, scrollTop: number = 0) => {
    try {
        const data = { pageIndex, scrollTop };
        localStorage.setItem(`pine_progress_${fileName}`, JSON.stringify(data));
    } catch (e) {
        console.warn("LocalStorage access denied");
    }
};

// Get page progress from LocalStorage
export const getReadingProgress = (fileName: string): { pageIndex: number, scrollTop: number } => {
    try {
        const stored = localStorage.getItem(`pine_progress_${fileName}`);
        if (!stored) return { pageIndex: 0, scrollTop: 0 };
        
        if (!stored.trim().startsWith('{')) {
            const pageIndex = parseInt(stored, 10);
            return { pageIndex: isNaN(pageIndex) ? 0 : pageIndex, scrollTop: 0 };
        }
        
        const parsed = JSON.parse(stored);
        return { 
            pageIndex: typeof parsed.pageIndex === 'number' ? parsed.pageIndex : 0, 
            scrollTop: typeof parsed.scrollTop === 'number' ? parsed.scrollTop : 0 
        };
    } catch (e) {
        console.warn("Error parsing reading progress", e);
        return { pageIndex: 0, scrollTop: 0 };
    }
};
