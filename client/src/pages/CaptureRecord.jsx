import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RecordForm from '../components/records/RecordForm';
import api from '../utils/api';
import { saveOfflineRecord } from '../utils/offlineStorage';

export default function CaptureRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [initialRecord, setInitialRecord] = useState(null);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);

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
      // 1. If currently offline, save directly to local IndexedDB outbox
      if (!navigator.onLine && !editId) {
        await saveOfflineRecord(formData);
        if (onSuccess) onSuccess();
        alert('Offline Notice: Record and watermarked photos have been saved securely to your local Outbox. They will automatically upload when network is restored!');
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
      // Fallback: If network connection failed or server is unreachable, save to offline outbox!
      if ((!navigator.onLine || !err.response) && !editId) {
        try {
          await saveOfflineRecord(formData);
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
