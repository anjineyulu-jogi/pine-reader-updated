
const DB_NAME = 'PineReaderDB';
const STORE_FILES = 'files';
const DB_VERSION = 1;
const KEY_LAST_OPENED = 'last_opened_file';

// Interface for what we store in IndexedDB
interface StoredFileEntry {
    id: string; // strict key
    file: File | Blob;
    name: string;
    type: string;
    lastOpened: number;
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
                id: KEY_LAST_OPENED,
                file: file,
                name: file.name,
                type: file.type,
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

// Retrieve file from IndexedDB
export const getRecentFileFromStorage = async (): Promise<File | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const request = store.get(KEY_LAST_OPENED);
            
            request.onsuccess = () => {
                const result = request.result as StoredFileEntry;
                if (result && result.file) {
                    // Reconstruct a File object (needed because IDB might yield a Blob)
                    const file = new File([result.file], result.name, { 
                        type: result.type,
                        lastModified: result.lastOpened 
                    });
                    resolve(file);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null); // Fail gracefully
        });
    } catch (e) {
        return null;
    }
};

// Save page progress to LocalStorage
export const saveReadingProgress = (fileName: string, pageIndex: number) => {
    localStorage.setItem(`pine_progress_${fileName}`, pageIndex.toString());
};

// Get page progress from LocalStorage
export const getReadingProgress = (fileName: string): number => {
    const stored = localStorage.getItem(`pine_progress_${fileName}`);
    return stored ? parseInt(stored, 10) : 0;
};
