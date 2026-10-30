import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Target,
  LayoutGrid,
  List,
  Layers,
  TrendingUp,
  ShieldCheck,
  X,
  Save,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function ManageZones() {
  const { user, hasRole } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'grid' or 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [quotaFilter, setQuotaFilter] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [deletingZone, setDeletingZone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Form state for Create
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    target_count: 500,
  });

  // Form state for Edit
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    target_count: 500,
  });

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/zones');
      setZones(res.data?.zones || []);
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Filtered zones calculation
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (z.name && z.name.toLowerCase().includes(term)) ||
        (z.code && z.code.toLowerCase().includes(term));

      const count = z.record_count || 0;
      const target = z.target_count || 0;
      const pct = target > 0 ? (count / target) * 100 : 0;

      let matchesQuota = true;
      if (quotaFilter === 'completed') matchesQuota = pct >= 100;
      else if (quotaFilter === 'high') matchesQuota = pct >= 50 && pct < 100;
      else if (quotaFilter === 'low') matchesQuota = pct < 50;

      return matchesSearch && matchesQuota;
    });
  }, [zones, searchTerm, quotaFilter]);

  // Aggregate statistics
  const totalTarget = useMemo(() => {
    return zones.reduce((acc, z) => acc + (z.target_count || 0), 0);
  }, [zones]);

  const totalCaptured = useMemo(() => {
    return zones.reduce((acc, z) => acc + (z.record_count || 0), 0);
  }, [zones]);

  const totalApproved = useMemo(() => {
    return zones.reduce((acc, z) => acc + (z.approved_count || 0), 0);
  }, [zones]);

  const overallRealization = totalTarget > 0 ? Math.min(100, Math.round((totalCaptured / totalTarget) * 100)) : 0;

  // Handle Create Zone
  const handleCreateZone = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      await api.post('/api/zones', {
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase() || null,
        target_count: parseInt(createForm.target_count, 10) || 0,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', code: '', target_count: 500 });
      await fetchZones();
    } catch (err) {
      console.error('Create zone error:', err);
      setActionError(err.response?.data?.error || 'Failed to create municipal zone');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (zone) => {
    setActionError('');
    setEditingZone(zone);
    setEditForm({
      name: zone.name || '',
      code: zone.code || '',
      target_count: zone.target_count || 500,
    });
  };

  // Handle Update Zone
  const handleUpdateZone = async (e) => {
    e.preventDefault();
    if (!editingZone) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.put(`/api/zones/${editingZone.id}`, {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase() || null,
        target_count: parseInt(editForm.target_count, 10) || 0,
      });
      setEditingZone(null);
      await fetchZones();
    } catch (err) {
      console.error('Update zone error:', err);
      setActionError(err.response?.data?.error || 'Failed to update zone');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Zone
  const handleDeleteZone = async () => {
    if (!deletingZone) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.delete(`/api/zones/${deletingZone.id}`);
      setDeletingZone(null);
      await fetchZones();
    } catch (err) {
      console.error('Delete zone error:', err);
      setActionError(err.response?.data?.error || 'Cannot delete zone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#991B1B]" />
              Municipal Zones & Electoral Areas
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Define collection sectors, target quotas, and manage spatial geofence boundaries
            </p>
          </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchZones}
            title="Refresh list"
            className="p-2.5 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setActionError('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Zone</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Operational Zones</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{zones.length}</div>
          </div>
          <Layers className="w-7 h-7 text-primary-500 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Total Target Quota</div>
            <div className="text-2xl font-black text-blue-600 mt-0.5">{totalTarget.toLocaleString()}</div>
          </div>
          <Target className="w-7 h-7 text-blue-500 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Captured Properties</div>
            <div className="text-2xl font-black text-teal-600 mt-0.5">{totalCaptured.toLocaleString()}</div>
          </div>
          <Building2 className="w-7 h-7 text-teal-500 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Quota Realization</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{overallRealization}%</div>
          </div>
          <TrendingUp className="w-7 h-7 text-emerald-500 opacity-60" />
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by zone name or municipal code (e.g. Amanfro, GS-AM)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={quotaFilter}
            onChange={(e) => setQuotaFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Quota Statuses</option>
            <option value="completed">Target Achieved (100%+)</option>
            <option value="high">Above 50% Quota</option>
            <option value="low">Below 50% Quota</option>
          </select>

          {(searchTerm || quotaFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setQuotaFilter('all');
              }}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ZONES DISPLAY: CARD GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center text-gray-400 text-xs rounded-2xl border border-gray-100">
              No municipal zones matching your search criteria.
            </div>
          ) : (
            filteredZones.map((z) => {
              const count = z.record_count || 0;
              const target = z.target_count || 0;
              const approved = z.approved_count || 0;
              const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

              return (
                <div
                  key={z.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  {/* Top Bar: Code & Actions */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-primary-700 uppercase bg-primary-50 px-2.5 py-0.5 rounded-lg border border-primary-100">
                        {z.code || 'ZONE'}
                      </span>

                      <div className="flex items-center gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(z)}
                          title="Edit Zone Details"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            setActionError('');
                            setDeletingZone(z);
                          }}
                          title="Delete Zone"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 mt-2.5">{z.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Target Quota:{' '}
                      <span className="font-bold text-gray-700">{target.toLocaleString()}</span> properties
                    </p>
                  </div>

                  {/* Progress & Realization */}
                  <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-gray-600">
                        <strong className="text-gray-900">{count}</strong> captured
                      </span>
                      <span
                        className={`font-bold ${
                          pct >= 100
                            ? 'text-emerald-600'
                            : pct >= 50
                            ? 'text-primary-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {pct}% achieved
                      </span>
                    </div>

                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100
                            ? 'bg-emerald-500'
                            : pct >= 50
                            ? 'bg-primary-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-gray-400 pt-1 flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {approved} approved
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck
                          className={`w-3 h-3 ${
                            z.boundary_geojson ? 'text-blue-500' : 'text-gray-300'
                          }`}
                        />
                        {z.boundary_geojson ? 'Geofence Active' : 'No boundary'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ZONES DISPLAY: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Zone Code</th>
                  <th className="px-4 py-3.5">Zone / Electoral Area Name</th>
                  <th className="px-4 py-3.5 text-center">Target Quota</th>
                  <th className="px-4 py-3.5 text-center">Captured Items</th>
                  <th className="px-4 py-3.5 text-center">Approved Billing</th>
                  <th className="px-4 py-3.5 text-center">Realization</th>
                  <th className="px-4 py-3.5 text-center">Geofence Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                      No zones matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredZones.map((z) => {
                    const count = z.record_count || 0;
                    const target = z.target_count || 0;
                    const approved = z.approved_count || 0;
                    const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

                    return (
                      <tr key={z.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
                            {z.code || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-gray-900">{z.name}</td>
                        <td className="px-4 py-3.5 text-center font-mono">{target.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-semibold text-primary-700">
                          {count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-emerald-600 font-semibold">
                          {approved.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              pct >= 100
                                ? 'bg-emerald-50 text-emerald-700'
                                : pct >= 50
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              z.boundary_geojson ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {z.boundary_geojson ? 'Active' : 'Unbounded'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(z)}
                              title="Edit Zone"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setActionError('');
                                setDeletingZone(z);
                              }}
                              title="Delete Zone"
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ZONE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Add New Municipal Zone</h3>
                  <p className="text-[11px] text-gray-500">Define a revenue collection sector and target</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Zone / Sector Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galilea East - Iron City Corridor"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Municipal Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GS-GL-004"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Revenue Items</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="e.g. 500"
                    value={createForm.target_count}
                    onChange={(e) => setCreateForm({ ...createForm, target_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-700 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Spatial Geofencing Notice
                </div>
                <div>
                  New zones are initialized with default municipal bounds. Field officers capturing coordinates
                  within this area will automatically have records routed to this zone.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Creating...' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ZONE MODAL (CRUDE EDITABLE FEATURE) */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Edit Zone Specifications</h3>
                  <p className="text-[11px] text-gray-500">Updating {editingZone.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingZone(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateZone} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Zone / Sector Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Municipal Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Revenue Items</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editForm.target_count}
                    onChange={(e) => setEditForm({ ...editForm, target_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-bold"
                  />
                </div>
              </div>

              {/* Status & Progress Summary */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-gray-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Current Revenue Records:</span>
                  <span className="font-bold text-gray-900">{editingZone.record_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved Rateable Assets:</span>
                  <span className="font-bold text-emerald-600">{editingZone.approved_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Geofence Boundary:</span>
                  <span className="font-semibold text-blue-600">
                    {editingZone.boundary_geojson ? 'Active Spatial Polygon' : 'Default Boundaries'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Zone</h3>
                <p className="text-xs text-gray-500">Remove sector from municipal registry</p>
              </div>
            </div>

            {actionError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Unable to delete zone</div>
                  <div>{actionError}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div>
                  Are you sure you want to delete <strong className="text-gray-900">{deletingZone.name}</strong> (
                  <span className="font-mono font-bold">{deletingZone.code}</span>)?
                </div>
                {(deletingZone.record_count > 0 || deletingZone.approved_count > 0) && (
                  <div className="text-amber-700 font-semibold flex items-center gap-1 pt-1 border-t border-gray-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Zone currently has {deletingZone.record_count} revenue record(s).</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingZone(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 text-xs transition-colors"
              >
                Cancel
              </button>
              {!actionError && (
                <button
                  type="button"
                  onClick={handleDeleteZone}
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {submitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
