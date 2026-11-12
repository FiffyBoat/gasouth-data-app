/**
 * Ga South Municipal Assembly - Field Data Collection System
 * Native IndexedDB Offline Storage & Synchronization Engine
 * Supports large watermarked photos, offline forms, idempotent auto-sync, and anti-duplicate guards.
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

    // Generate a unique client sync UUID for idempotency
    const clientSyncId =
      recordData.client_sync_id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    // Prepare photos for storage (IndexedDB natively stores File/Blob objects)
    const recordToSave = {
      ...recordData,
      client_sync_id: clientSyncId,
      saved_offline_at: new Date().toISOString(),
      sync_status: 'pending',
      skip_reason: null,
    };

    const req = store.add(recordToSave);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Update an existing offline record in the outbox
 */
export async function updateOfflineRecord(localId, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) return resolve(false);

      const merged = { ...existing, ...updates };
      const putReq = store.put(merged);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Mark a skipped duplicate record to retry with confirmed distinct sub-unit flag
 */
export async function markAsDistinctForRetry(localId) {
  return updateOfflineRecord(localId, {
    is_confirmed_distinct: true,
    sync_status: 'pending',
    skip_reason: null,
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
 * Get count of pending offline records (excluding already-skipped duplicates)
 */
export async function getOfflineCount() {
  const records = await getOfflineRecords();
  return records.filter((r) => r.sync_status !== 'skipped_duplicate').length;
}

/**
 * Get total count including duplicates
 */
export async function getTotalOfflineCount() {
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
 * Remove a record from offline outbox after successful sync or discard
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
 * Synchronize all pending offline records with the Render backend
 * Incorporates anti-duplicate checks, auto-merging, and conflict skipping.
 */
export async function syncAllOfflineRecords(api, onProgress) {
  const allRecords = await getOfflineRecords();
  const pendingRecords = allRecords.filter((r) => r.sync_status !== 'skipped_duplicate');

  if (pendingRecords.length === 0) {
    return { synced: 0, failed: 0, skipped: 0, skippedList: [] };
  }

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const skippedList = [];

  for (let i = 0; i < pendingRecords.length; i++) {
    const item = pendingRecords[i];
    const {
      local_id,
      photos = [],
      saved_offline_at,
      sync_status,
      skip_reason,
      duplicate_info,
      ...recordPayload
    } = item;

    if (onProgress) {
      onProgress({ current: i + 1, total: pendingRecords.length, record: item });
    }

    try {
      let serverRecordId = recordPayload.editId;
      delete recordPayload.editId;

      // Pass the client_sync_id for idempotency
      if (item.client_sync_id) {
        recordPayload.client_sync_id = item.client_sync_id;
        recordPayload.attributes = {
          ...(recordPayload.attributes || {}),
          client_sync_id: item.client_sync_id,
        };
      }

      if (serverRecordId) {
        // Edit mode: update existing record
        await api.put(`/api/records/${serverRecordId}`, recordPayload);
      } else {
        // Create mode: server performs idempotency, bill number, and proximity checks
        const res = await api.post('/api/records', recordPayload);
        serverRecordId = res.data?.record?.id;
      }

      // Upload photos if present
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

      // Successfully synced: Remove from offline outbox
      await removeOfflineRecord(local_id);
      synced++;
    } catch (err) {
      if (err.response?.status === 409) {
        // 409 Conflict: Duplicate record detected on server!
        const dupData = err.response.data;
        const reason = dupData.message || 'Duplicate record detected on server; already submitted by another officer.';

        await updateOfflineRecord(local_id, {
          sync_status: 'skipped_duplicate',
          skip_reason: reason,
          skipped_at: new Date().toISOString(),
          duplicate_info: dupData.duplicate || dupData.existing_record || null,
        });

        skipped++;
        skippedList.push({
          local_id,
          name: item.owner_name || item.module || 'Unnamed Record',
          reason,
        });
      } else {
        console.error(`Failed to sync offline record ${local_id}:`, err);
        failed++;
      }
    }
  }

  return { synced, failed, skipped, skippedList };
}
