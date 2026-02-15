/**
 * Offline Service for caching and synchronization
 * Handles offline data storage and sync when connection is restored
 */

import { store } from '../store';
import { setOfflineMode } from '../store/slices/connectionSlice';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiry?: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'node_update' | 'position_update' | 'telemetry_update' | 'message_send';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineService {
  isOnline(): boolean;
  cacheData<T>(key: string, data: T, ttl?: number): Promise<void>;
  getCachedData<T>(key: string): Promise<T | null>;
  clearCache(): Promise<void>;
  queueForSync(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void>;
  processSyncQueue(): Promise<void>;
  getStorageUsage(): Promise<{ used: number; quota: number }>;
}

class OfflineServiceImpl implements OfflineService {
  private dbName = 'meshtastic-node-mapper';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncQueue: SyncQueueItem[] = [];
  private isInitialized = false;
  private canDispatchToRedux = false;
  private onlineStatusListener: (() => void) | null = null;

  constructor() {
    // Don't initialize immediately - wait for explicit init call
  }

  // Public method to initialize the service after React is ready
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.initializeDB();
    this.setupOnlineStatusListener();
    await this.loadSyncQueue();
    this.canDispatchToRedux = true;
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }

        // Create map tiles cache store
        if (!db.objectStoreNames.contains('mapTiles')) {
          const tilesStore = db.createObjectStore('mapTiles', { keyPath: 'url' });
          tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private setupOnlineStatusListener(): void {
    this.onlineStatusListener = () => {
      const isOnline = navigator.onLine;
      console.log('Online status changed:', isOnline);
      
      // Only dispatch to Redux if we're allowed to
      if (this.canDispatchToRedux) {
        store.dispatch(setOfflineMode(!isOnline));
      }

      if (isOnline) {
        // Process sync queue when coming back online
        this.processSyncQueue().catch(console.error);
      }
    };

    window.addEventListener('online', this.onlineStatusListener);
    window.addEventListener('offline', this.onlineStatusListener);

    // Set initial state only if we're allowed to dispatch
    if (this.canDispatchToRedux) {
      store.dispatch(setOfflineMode(!navigator.onLine));
    }
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        this.syncQueue = request.result || [];
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to load sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  async cacheData<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.warn('Database not initialized, skipping cache operation');
        resolve(); // Resolve instead of reject to prevent errors
        return;
      }

      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');

        const cacheEntry: CacheEntry<T> & { key: string } = {
          key,
          data,
          timestamp: Date.now(),
          expiry: ttl ? Date.now() + ttl : undefined,
        };

        const request = store.put(cacheEntry);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to cache data:', request.error);
          resolve(); // Resolve instead of reject to prevent errors
        };

        transaction.onerror = () => {
          console.error('Transaction error:', transaction.error);
          resolve(); // Resolve instead of reject to prevent errors
        };
      } catch (error) {
        console.error('Error creating transaction:', error);
        resolve(); // Resolve instead of reject to prevent errors
      }
    });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as (CacheEntry<T> & { key: string }) | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if data has expired
        if (result.expiry && Date.now() > result.expiry) {
          // Remove expired data
          this.removeCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => {
        console.error('Failed to get cached data:', request.error);
        reject(request.error);
      };
    });
  }

  private async removeCachedData(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cache', 'mapTiles'], 'readwrite');
      
      const cacheStore = transaction.objectStore('cache');
      const tilesStore = transaction.objectStore('mapTiles');
      
      const clearCache = cacheStore.clear();
      const clearTiles = tilesStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve();
        }
      };

      clearCache.onsuccess = checkComplete;
      clearTiles.onsuccess = checkComplete;

      clearCache.onerror = () => reject(clearCache.error);
      clearTiles.onerror = () => reject(clearTiles.error);
    });
  }

  async queueForSync(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);

    // Persist to IndexedDB
    if (!this.isInitialized) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(syncItem);

      request.onsuccess = () => {
        console.log('Queued item for sync:', syncItem.type);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to queue sync item:', request.error);
        reject(request.error);
      };
    });
  }

  async processSyncQueue(): Promise<void> {
    if (!this.isOnline() || this.syncQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.syncQueue.length} items in sync queue`);

    const itemsToProcess = [...this.syncQueue];
    const processedItems: string[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        processedItems.push(item.id);
        console.log('Successfully synced item:', item.type, item.id);
      } catch (error) {
        console.error('Failed to sync item:', item.type, item.id, error);
        
        // Increment retry count
        item.retryCount++;
        
        // Remove item if max retries exceeded (5 attempts)
        if (item.retryCount >= 5) {
          console.warn('Max retries exceeded for sync item:', item.id);
          processedItems.push(item.id);
        }
      }
    }

    // Remove successfully processed items
    this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item.id));

    // Update IndexedDB
    await this.updateSyncQueueInDB();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    // This would typically make API calls to sync the data
    // For now, we'll just simulate the sync process
    
    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    
    switch (item.type) {
      case 'node_update':
        // Sync node updates
        await fetch(`${apiUrl}/api/nodes/${item.data.nodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        break;
        
      case 'position_update':
        // Sync position updates
        await fetch(`${apiUrl}/api/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        break;
        
      case 'telemetry_update':
        // Sync telemetry updates
        await fetch(`${apiUrl}/api/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        break;
        
      case 'message_send':
        // Sync message sending
        await fetch(`${apiUrl}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        break;
        
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  private async updateSyncQueueInDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      // Clear existing queue
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add current queue items
        let completed = 0;
        const total = this.syncQueue.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        for (const item of this.syncQueue) {
          const addRequest = store.put(item);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          addRequest.onerror = () => {
            reject(addRequest.error);
          };
        }
      };
      
      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    
    // Fallback for browsers that don't support storage estimation
    return { used: 0, quota: 0 };
  }

  // Cleanup method
  destroy(): void {
    console.log('Destroying offline service');
    this.isInitialized = false; // Mark as not initialized to prevent new operations
    
    if (this.onlineStatusListener) {
      window.removeEventListener('online', this.onlineStatusListener);
      window.removeEventListener('offline', this.onlineStatusListener);
      this.onlineStatusListener = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create singleton instance
export const offlineService = new OfflineServiceImpl();

export default offlineService;