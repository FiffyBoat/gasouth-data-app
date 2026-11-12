import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import RecordForm from '../components/records/RecordForm';
import api from '../utils/api';
import { saveOfflineRecord } from '../utils/offlineStorage';
import { useAuth } from '../contexts/AuthContext';

export default function CaptureRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { hasRole } = useAuth();

  const [initialRecord, setInitialRecord] = useState(null);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);

  // ── Role Guard ──────────────────────────────────────────────────────────────
  // Only Field Officers (collectors) and Admins may access data capture/edit.
  // Supervisors and Budget Directors use the Review & Approvals workflow instead.
  // NOTE: hooks must all be called before this early return (Rules of Hooks).
  const isFieldUser = hasRole('collector') || hasRole('admin');
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (editId) {
      const fetchRecord = async () => {
        try {
          const { data } = await api.get(`/api/records/${editId}`);
          setInitialRecord(data.record);
        } catch (err) {
          console.error('Error fetching record to edit:', err);
          alert('Failed to load record for editing.');
          navigate('/records');
        } finally {
          setLoading(false);
        }
      };
      fetchRecord();
    }
  }, [editId]);

  const handleSubmit = async (formData, onSuccess) => {
    setSubmitting(true);
    try {
      // 1. If currently offline, save directly to local IndexedDB outbox (supports new captures & edits)
      if (!navigator.onLine) {
        await saveOfflineRecord({ ...formData, editId: editId || null });
        if (onSuccess) onSuccess();
        alert('Offline Notice: Record and watermarked photos have been saved securely to your local Outbox. They will automatically sync when network is restored!');
        navigate('/records');
        return;
      }

      const { photos, ...recordData } = formData;

      let recordId = editId;

      if (editId) {
        await api.put(`/api/records/${editId}`, recordData);
      } else {
        const { data } = await api.post('/api/records', recordData);
        recordId = data.record.id;
      }

      // If new local photos exist, upload them
      const newPhotos = photos.filter((p) => p.file);
      if (newPhotos.length > 0) {
        const uploadData = new FormData();
        newPhotos.forEach((p) => {
          const fileName = p.name || p.file?.name || `capture_${Date.now()}.jpg`;
          uploadData.append('photos', p.file, fileName);
        });

        await api.post(`/api/records/${recordId}/photos`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (onSuccess) onSuccess();
      alert(`Record ${recordData.status === 'submitted' ? 'submitted for supervisor review' : 'saved as draft'} successfully!`);
      navigate(`/records/${recordId}`);
    } catch (err) {
      console.error('Error saving record:', err);

      // 409 Conflict: Anti-duplicate engine triggered
      if (err.response?.status === 409) {
        const errorData = err.response.data;
        if (errorData.requires_confirmation) {
          const proceed = confirm(
            `⚠️ Potential Duplicate Detected:\n\n${errorData.message}\n\nIf this is a separate tenant, container shop, or distinct sub-unit at the same location, click OK to confirm and submit. Click Cancel to abort.`
          );
          if (proceed) {
            return handleSubmit({ ...formData, is_confirmed_distinct: true }, onSuccess);
          }
          return;
        } else {
          alert(`🚫 Submission Blocked (Duplicate):\n\n${errorData.message}`);
          return;
        }
      }

      // Fallback: If network connection failed or server is unreachable, save to offline outbox!
      if (!navigator.onLine || !err.response) {
        try {
          await saveOfflineRecord({ ...formData, editId: editId || null });
          if (onSuccess) onSuccess();
          alert('Network Interruption: Record has been saved safely to your Offline Outbox. It will sync automatically as soon as mobile connectivity returns!');
          navigate('/records');
          return;
        } catch (offlineErr) {
          console.error('Failed to save to offline storage:', offlineErr);
        }
      }
      alert(err.response?.data?.error || 'Failed to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Role-restricted access screen ───────────────────────────────────────────
  if (!isFieldUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800">Access Restricted</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Field data capture is restricted to Field Officers. Use the{' '}
          <strong>Review &amp; Approvals</strong> section to review submitted records.
        </p>
        <Link
          to="/records"
          className="mt-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Return to Records
        </Link>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 text-xs">
        Loading record information...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {editId ? 'Edit Field Record' : 'Capture New Field Record'}
          </h2>
          <p className="text-xs text-gray-500">
            Verify real-time coordinates, attach property photos, and register ratepayer
          </p>
        </div>
      </div>

      <RecordForm
        initialRecord={initialRecord}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
      />
    </div>
  );
}
