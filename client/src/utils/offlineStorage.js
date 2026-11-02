/**
 * Ga South Municipal Assembly - Field Data Collection System
 * Native IndexedDB Offline Storage & Synchronization Engine
 * Supports large watermarked photos, offline forms, and auto-sync.
 */

const DB_NAME = 'GaSouth_DCS_Offline';
const DB_VERSION = 1;
const STORE_NAME = 'outbox_records';

/**
 * Open or create IndexedDB connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'local_id',
          autoIncrement: true,
        });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a record into the offline outbox
 */
export async function saveOfflineRecord(recordData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Prepare photos for storage (IndexedDB natively stores File/Blob objects)
    const recordToSave = {
      ...recordData,
      saved_offline_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    const req = store.add(recordToSave);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all queued offline records
 */
export async function getOfflineRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get count of pending offline records
 */
export async function getOfflineCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();

    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove a record from offline outbox after successful sync
 */
export async function removeOfflineRecord(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Synchronize all pending offline records with Render server
 */
export async function syncAllOfflineRecords(api, onProgress) {
  const records = await getOfflineRecords();
  if (records.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const { local_id, photos = [], saved_offline_at, sync_status, ...recordPayload } = item;

    if (onProgress) {
      onProgress({ current: i + 1, total: records.length, record: item });
    }

    try {
      // 1. POST record to backend
      const res = await api.post('/api/records', recordPayload);
      const serverRecordId = res.data?.record?.id;

      // 2. Upload photos if present
      const uploadablePhotos = photos.filter((p) => p.file);
      if (serverRecordId && uploadablePhotos.length > 0) {
        const formData = new FormData();
        uploadablePhotos.forEach((p) => {
          formData.append('photos', p.file, p.file.name || `photo_${Date.now()}.jpg`);
        });

        await api.post(`/api/records/${serverRecordId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Remove from offline queue
      await removeOfflineRecord(local_id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync offline record ${local_id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}
