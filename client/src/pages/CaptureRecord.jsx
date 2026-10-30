import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RecordForm from '../components/records/RecordForm';
import api from '../utils/api';

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
        newPhotos.forEach((p) => uploadData.append('photos', p.file));

        await api.post(`/api/records/${recordId}/photos`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (onSuccess) onSuccess();
      alert(`Record ${recordData.status === 'submitted' ? 'submitted for supervisor review' : 'saved as draft'} successfully!`);
      navigate(`/records/${recordId}`);
    } catch (err) {
      console.error('Error saving record:', err);
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
            {editId ? 'Edit Field Record' : 'Capture New Revenue Item'}
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
