import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecordDetail from '../components/records/RecordDetail';
import api from '../utils/api';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/records/${id}`);
      setRecord(res.data?.record);
    } catch (err) {
      console.error('Error fetching record detail:', err);
      const msg = err.response?.data?.error || 'Record could not be loaded.';
      alert(msg);
      navigate('/records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const handleStatusChange = async (newStatus, comment = null) => {
    try {
      setUpdating(true);
      await api.patch(`/api/records/${id}/status`, { status: newStatus, comment });
      alert(`Record updated to ${newStatus} successfully!`);
      await fetchRecord();
    } catch (err) {
      console.error('Status change error:', err);
      alert(err.response?.data?.error || 'Failed to update record status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await api.delete(`/api/records/${recordId}`);
      alert('Record deleted successfully.');
      navigate('/records');
    } catch (err) {
      console.error('Delete record error:', err);
      alert(err.response?.data?.error || 'Failed to delete record.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 text-xs">
        Loading record details...
      </div>
    );
  }

  return (
    <RecordDetail
      record={record}
      onStatusChange={handleStatusChange}
      onDeleteRecord={handleDeleteRecord}
      isUpdating={updating}
    />
  );
}
