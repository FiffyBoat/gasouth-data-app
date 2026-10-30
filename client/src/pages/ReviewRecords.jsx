import React, { useState, useEffect } from 'react';
import ReviewPanel from '../components/review/ReviewPanel';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, ShieldCheck, Award, Flag } from 'lucide-react';

export default function ReviewRecords() {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Default stage based on role:
  // Data Supervisor default to 'submitted'
  // Budget Director default to 'reviewed'
  const isBudgetDirector = hasRole('budget_director');
  const isSupervisor = hasRole('supervisor');
  const isAdmin = hasRole('admin');

  const defaultStage = isBudgetDirector && !isAdmin ? 'reviewed' : 'submitted';
  const [stageFilter, setStageFilter] = useState(defaultStage);

  const fetchRecordsToReview = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/records?status=${stageFilter}&for_review=true&limit=100`);
      const list = res.data?.records || [];
      setRecords(list);

      if (list.length > 0) {
        setSelectedRecordId((prev) => {
          if (!prev) return list[0].id;
          const found = list.find((r) => r.id === prev);
          return found ? found.id : list[0].id;
        });
      } else {
        setSelectedRecordId(null);
        setSelectedRecord(null);
      }
    } catch (err) {
      console.error('Error fetching review records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordsToReview();
  }, [stageFilter]);

  // When selectedRecordId changes, fetch full record details (including photos)
  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedRecord(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await api.get(`/api/records/${selectedRecordId}`);
        if (isMounted && res.data?.record) {
          setSelectedRecord(res.data.record);
        }
      } catch (err) {
        console.error('Error fetching record detail:', err);
      } finally {
        if (isMounted) setLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedRecordId]);

  const handleStatusChange = async (id, status, comment = null) => {
    try {
      setProcessing(true);
      await api.patch(`/api/records/${id}/status`, { status, comment });

      const messages = {
        reviewed: '✅ Record reviewed and sent to Budget Director successfully!',
        approved: '🎉 Record approved and certified in Data Collection System!',
        rejected: '❌ Record rejected. The collector has been notified.',
        flagged: '🚩 Record flagged for anomaly check.',
      };
      alert(messages[status] || `Record updated to '${status}' successfully!`);
      await fetchRecordsToReview();
    } catch (err) {
      console.error('Status update failed:', err);
      alert(err.response?.data?.error || 'Failed to update record status.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Review Stage Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          {(isSupervisor || isAdmin) && (
            <button
              type="button"
              onClick={() => setStageFilter('submitted')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                stageFilter === 'submitted'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1. Supervisor Queue (Submitted)</span>
            </button>
          )}

          {(isBudgetDirector || isAdmin) && (
            <button
              type="button"
              onClick={() => setStageFilter('reviewed')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                stageFilter === 'reviewed'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>2. Budget Director Queue (Reviewed)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setStageFilter('flagged')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors ${
              stageFilter === 'flagged'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Anomalies (Flagged)</span>
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Viewing as <span className="font-semibold text-gray-900 capitalize">{user?.role?.replace('_', ' ')}</span>
        </div>
      </div>

      <ReviewPanel
        records={records}
        selectedRecord={selectedRecord}
        onSelectRecord={(r) => setSelectedRecordId(r.id)}
        onEndorse={(id, note) => handleStatusChange(id, 'reviewed', note || 'Reviewed and endorsed by Data Supervisor')}
        onApprove={(id) => handleStatusChange(id, 'approved', 'Certified & Approved by Budget Director')}
        onReject={(id, comment) => handleStatusChange(id, 'rejected', comment)}
        onFlag={(id, comment) => handleStatusChange(id, 'flagged', comment)}
        isProcessing={processing || loadingDetail}
        onRecordUpdated={(id, updatedRec) => {
          setSelectedRecord(updatedRec);
          setRecords((prev) => prev.map((r) => (r.id === id ? updatedRec : r)));
        }}
      />
    </div>
  );
}
