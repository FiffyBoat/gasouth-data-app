import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, CheckCircle, Building2, User } from 'lucide-react';
import RecordList from '../components/records/RecordList';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function Records() {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [zones, setZones] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    module: '',
    status: '',
    zone_id: '',
    scope: '',
    search: '',
  });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/api/zones');
        setZones(res.data?.zones || []);
      } catch (err) {
        console.error('Error fetching zones:', err);
      }
    };
    fetchZones();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.module) params.append('module', filters.module);
      if (filters.status) params.append('status', filters.status);
      if (filters.zone_id) params.append('zone_id', filters.zone_id);
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.search) params.append('search', filters.search);

      const res = await api.get(`/api/records?${params.toString()}`);
      setRecords(res.data?.records || []);
      setPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const handleDeleteRecord = async (id) => {
    try {
      await api.delete(`/api/records/${id}`);
      alert('Record deleted successfully.');
      fetchRecords();
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert(err.response?.data?.error || 'Could not delete record.');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Revenue Records</h2>
          <p className="text-xs text-gray-500">
            Registered and location-referenced properties, businesses, and stalls ({pagination.total})
          </p>
        </div>

        {hasRole('collector') && (
          <Link
            to="/capture"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#991B1B] hover:bg-[#7f1d1d] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Capture New Item</span>
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative min-w-[220px] flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ratepayer name, phone, or Ghana Post..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector for Collectors */}
          {user?.role === 'collector' && (
            <select
              value={filters.scope}
              onChange={(e) => setFilters((prev) => ({ ...prev, scope: e.target.value }))}
              className="px-3 py-1.5 border border-primary-300 rounded-xl bg-primary-50 text-primary-900 font-semibold focus:outline-none"
            >
              <option value="">All Assembly Items</option>
              <option value="mine">My Submissions Only</option>
            </select>
          )}

          {/* Module Filter */}
          <select
            value={filters.module}
            onChange={(e) => setFilters((prev) => ({ ...prev, module: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="property">Property Rate</option>
            <option value="business">Business (BOP)</option>
            <option value="market_stall">Market Stall</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft (Collector)</option>
            <option value="submitted">Submitted (Needs Supervisor Review)</option>
            <option value="reviewed">Reviewed (Needs Budget Director Approval)</option>
            <option value="approved">Approved & Certified</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged</option>
          </select>

          {/* Zone Filter */}
          {zones.length > 0 && (
            <select
              value={filters.zone_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, zone_id: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none"
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Records List / Table with CRUD & CSV Actions */}
      <RecordList
        records={records}
        loading={loading}
        onDeleteRecord={handleDeleteRecord}
      />
    </div>
  );
}
