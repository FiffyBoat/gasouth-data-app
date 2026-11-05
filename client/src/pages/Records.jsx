import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Search, AlertTriangle, X } from 'lucide-react';
import RecordList from '../components/records/RecordList';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function Records() {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [zones, setZones] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // ── Import modal state ──────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [filters, setFilters] = useState({
    module: '',
    status: '',
    zone_id: '',
    scope: '',
    search: '',
    pending_gps: false,
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
      if (filters.pending_gps) {
        // Pending GPS: drafts without coordinates (imported, not yet visited)
        params.append('status', 'draft');
        params.append('no_gps', '1');
      } else {
        if (filters.status) params.append('status', filters.status);
      }
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

  // ── Import ZebraRMS file ─────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post('/api/records/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecords();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.error || 'Import failed. Please check your file and try again.',
        imported: 0,
        skipped: 0,
        errors: [],
      });
    } finally {
      setImportLoading(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportResult(null);
    setImportFile(null);
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Import button — admin / supervisor only */}
          {(hasRole('admin') || hasRole('supervisor')) && (
            <button
              type="button"
              onClick={() => { setImportOpen(true); setImportResult(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import ZebraRMS</span>
            </button>
          )}

          {/* New capture — collectors only */}
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
      </div>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Import ZebraRMS Data</h3>
              <button onClick={closeImport} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Upload your ZebraRMS CSV or Excel (.xlsx) export file. Records will be created as{' '}
              <span className="font-semibold text-amber-700">drafts without GPS coordinates</span>.
              Collectors can then visit each property, capture GPS, add photos, and submit for review.
              New fresh captures still work alongside imported records.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-3">CSV or Excel (.xlsx / .xls) — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0] || null)}
                className="block w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-semibold hover:file:bg-primary-100"
              />
              {importFile && (
                <p className="mt-2 text-xs text-emerald-700 font-medium">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Import result */}
            {importResult && (
              <div
                className={`rounded-xl p-4 text-xs space-y-1 ${
                  importResult.imported > 0
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-rose-50 border border-rose-200'
                }`}
              >
                <p className={`font-semibold ${importResult.imported > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {importResult.message}
                </p>
                {importResult.skipped > 0 && (
                  <p className="text-amber-700">⚠ {importResult.skipped} row(s) skipped</p>
                )}
                {importResult.errors?.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-gray-600">
                      View row errors ({importResult.errors.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <li key={i} className="text-rose-700">
                          Row {e.row}: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeImport}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-1.5"
              >
                {importLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Import Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* Pending GPS quick-filter */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                pending_gps: !prev.pending_gps,
                status: !prev.pending_gps ? '' : prev.status,
              }))
            }
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
              filters.pending_gps
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
            }`}
            title="Show imported records that still need GPS coordinates captured in the field"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending GPS
          </button>

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

          {/* Status Filter — hidden when pending GPS active */}
          {!filters.pending_gps && (
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft (Collector)</option>
              <option value="submitted">Submitted (Needs Supervisor Review)</option>
              <option value="reviewed">Reviewed (Needs Budget Director Approval)</option>
              <option value="approved">Approved &amp; Certified</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
            </select>
          )}

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

      {/* Records List / Table */}
      <RecordList
        records={records}
        loading={loading}
        onDeleteRecord={handleDeleteRecord}
        showPendingGpsBadge={filters.pending_gps}
      />
    </div>
  );
}
