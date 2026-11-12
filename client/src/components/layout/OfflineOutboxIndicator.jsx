import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Inbox,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';
import {
  getOfflineRecords,
  getOfflineCount,
  syncAllOfflineRecords,
  removeOfflineRecord,
  markAsDistinctForRetry,
} from '../../utils/offlineStorage';
import api from '../../utils/api';

export default function OfflineOutboxIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [records, setRecords] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  const refreshCount = async () => {
    try {
      const count = await getOfflineCount();
      setPendingCount(count);
      if (showModal) {
        const list = await getOfflineRecords();
        setRecords(list);
      }
    } catch (e) {
      console.warn('Could not read offline queue:', e);
    }
  };

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 10 seconds
    const interval = setInterval(refreshCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [showModal]);

  const handleSync = async () => {
    if (!navigator.onLine || syncing) return;

    setSyncing(true);
    setSyncProgress({ current: 0, total: 1 });
    try {
      const result = await syncAllOfflineRecords(api, (p) => setSyncProgress(p));
      await refreshCount();

      const messages = [];
      if (result.synced > 0) {
        messages.push(`✅ ${result.synced} record(s) synced to Ga South database!`);
      }
      if (result.skipped > 0) {
        messages.push(`⚠️ ${result.skipped} record(s) skipped — duplicate already captured on server.`);
      }
      if (result.failed > 0) {
        messages.push(`❌ ${result.failed} record(s) could not sync yet. Will retry when connection improves.`);
      }

      if (messages.length > 0) {
        alert(messages.join('\n\n'));
      }
    } catch (err) {
      console.error('Batch sync error:', err);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleDeleteItem = async (localId) => {
    if (confirm('Discard this unsynced offline record?')) {
      await removeOfflineRecord(localId);
      await refreshCount();
    }
  };

  const handleForceDistinct = async (localId) => {
    if (confirm('Confirm this is a separate business/sub-unit at the same location and retry syncing?')) {
      await markAsDistinctForRetry(localId);
      await refreshCount();
      handleSync();
    }
  };

  // Only render if offline OR if there are pending offline records
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Header Pill Indicator */}
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {!isOnline ? (
          <div className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1.5 shadow-xs">
            <WifiOff className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span className="hidden sm:inline">Offline Mode</span>
          </div>
        ) : null}

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              refreshCount();
            }}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center gap-1.5 shadow-sm transition-all animate-bounce"
            title="View offline outbox records waiting to sync"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Outbox ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Outbox Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-lg max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Offline Outbox</h3>
                  <p className="text-[11px] text-gray-500">
                    {pendingCount} record{pendingCount === 1 ? '' : 's'} stored locally in browser
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-gray-100">
              {records.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Your offline outbox is empty. All captured records are synced!
                </div>
              ) : (
                records.map((r) => {
                  const isSkipped = r.sync_status === 'skipped_duplicate';
                  return (
                    <div key={r.local_id} className="pt-2.5 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-800 flex items-center gap-2 truncate">
                            <span className="truncate">{r.owner_name || 'Unnamed Record'}</span>
                            {isSkipped && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                Duplicate Skipped
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 capitalize">
                            {r.module?.replace('_', ' ')} • {r.photos?.length || 0} photo(s) •{' '}
                            {new Date(r.saved_offline_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isSkipped && (
                            <button
                              type="button"
                              onClick={() => handleForceDistinct(r.local_id)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition-colors"
                              title="Mark as distinct sub-unit and retry"
                            >
                              Retry as Distinct Unit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(r.local_id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Discard local record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isSkipped && r.skip_reason && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{r.skip_reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer with Sync Action */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">
                Network Status:{' '}
                <strong className={isOnline ? 'text-emerald-600' : 'text-rose-600'}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </strong>
              </span>

              <button
                type="button"
                onClick={handleSync}
                disabled={!isOnline || syncing || records.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing ({syncProgress?.current}/{syncProgress?.total})...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Sync All to Server</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
