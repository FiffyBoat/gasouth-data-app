import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Check,
  X,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  KeyRound,
  Building,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Form state for Create
  const [createForm, setCreateForm] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'collector',
    assigned_zone_id: '',
    password: '',
  });

  // Form state for Edit
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'collector',
    assigned_zone_id: '',
    password: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, zRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/zones'),
      ]);
      setUsers(uRes.data?.users || []);
      setZones(zRes.data?.zones || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.phone && u.phone.includes(searchTerm));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesZone =
        zoneFilter === 'all' ||
        (zoneFilter === 'unassigned' && !u.assigned_zone_id) ||
        u.assigned_zone_id === zoneFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);

      return matchesSearch && matchesRole && matchesZone && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, zoneFilter, statusFilter]);

  // Create User Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      await api.post('/api/users', createForm);
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'collector',
        assigned_zone_id: '',
        password: '',
      });
      await fetchData();
    } catch (err) {
      console.error('Create user error:', err);
      setActionError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (targetUser) => {
    setActionError('');
    setEditingUser(targetUser);
    setEditForm({
      full_name: targetUser.full_name || '',
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      role: targetUser.role || 'collector',
      assigned_zone_id: targetUser.assigned_zone_id || '',
      password: '',
    });
  };

  // Update User Handler
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setActionError('');
    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        assigned_zone_id: editForm.assigned_zone_id || null,
      };
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      await api.put(`/api/users/${editingUser.id}`, payload);
      setEditingUser(null);
      await fetchData();
    } catch (err) {
      console.error('Update user error:', err);
      setActionError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.delete(`/api/users/${deletingUser.id}`);
      setDeletingUser(null);
      await fetchData();
    } catch (err) {
      console.error('Delete user error:', err);
      setActionError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.patch(`/api/users/${id}/active`, { is_active: !currentStatus });
      fetchData();
    } catch (err) {
      console.error('Toggle status error:', err);
      alert(err.response?.data?.error || 'Failed to change user status');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" /> Admin
          </span>
        );
      case 'budget_director':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Budget Director
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Supervisor
          </span>
        );
      case 'collector':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            Field Officer
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#991B1B]" />
              User & Field Officer Administration
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Complete management of collector zones, supervisory approvals, and municipal roles
            </p>
          </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2.5 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setActionError('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Total Accounts</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{users.length}</div>
          </div>
          <Users className="w-7 h-7 text-primary-500 opacity-60" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Active Officers</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {users.filter((u) => u.is_active).length}
            </div>
          </div>
          <UserCheck className="w-7 h-7 text-emerald-500 opacity-60" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Field Collectors</div>
            <div className="text-2xl font-black text-teal-600 mt-0.5">
              {users.filter((u) => u.role === 'collector').length}
            </div>
          </div>
          <Building className="w-7 h-7 text-teal-500 opacity-60" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase">Deactivated</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5">
              {users.filter((u) => !u.is_active).length}
            </div>
          </div>
          <UserX className="w-7 h-7 text-rose-500 opacity-60" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, username, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="budget_director">Budget Director</option>
            <option value="supervisor">Supervisor</option>
            <option value="collector">Collector</option>
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Zones</option>
            <option value="unassigned">Unassigned</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated</option>
          </select>

          {(searchTerm || roleFilter !== 'all' || zoneFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setZoneFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">User Identity</th>
                <th className="px-4 py-3.5">System Role</th>
                <th className="px-4 py-3.5">Assigned Zone</th>
                <th className="px-4 py-3.5">Contact Information</th>
                <th className="px-4 py-3.5 text-center">Records Captured</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* User Identity */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900 text-[13px]">{u.full_name}</div>
                      <div className="text-gray-400 font-mono text-[11px]">@{u.username}</div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>

                    {/* Assigned Zone */}
                    <td className="px-4 py-3.5">
                      {u.zone_name ? (
                        <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {u.zone_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 text-gray-600">
                      {u.phone ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-gray-400" /> {u.phone}
                        </div>
                      ) : null}
                      {u.email ? (
                        <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                          <Mail className="w-3 h-3 text-gray-400" /> {u.email}
                        </div>
                      ) : !u.phone ? (
                        <span className="text-gray-300">-</span>
                      ) : null}
                    </td>

                    {/* Records count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-black text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
                        {u.records_captured || 0}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        title={`Click to ${u.is_active ? 'deactivate' : 'activate'}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <Check className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" /> Deactivated
                          </>
                        )}
                      </button>
                    </td>

                    {/* CRUD Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit User"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setActionError('');
                            setDeletingUser(u);
                          }}
                          disabled={currentUser?.id === u.id}
                          title={
                            currentUser?.id === u.id
                              ? 'Cannot delete your own account'
                              : 'Delete User'
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            currentUser?.id === u.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Create New Account</h3>
                  <p className="text-[11px] text-gray-500">Add an administrator, officer, or supervisor</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kowusu"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kofi Owusu"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="0244123456"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="officer@accra.gov"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="collector">Field Officer / Collector</option>
                    <option value="supervisor">Data Supervisor</option>
                    <option value="budget_director">Budget Director</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Assigned Zone</label>
                  <select
                    value={createForm.assigned_zone_id}
                    onChange={(e) => setCreateForm({ ...createForm, assigned_zone_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">No Zone Assigned</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
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
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Edit User Details</h3>
                  <p className="text-[11px] text-gray-500">Updating @{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="0244123456"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="officer@accra.gov"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="collector">Field Officer / Collector</option>
                    <option value="supervisor">Data Supervisor</option>
                    <option value="budget_director">Budget Director</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Assigned Zone</label>
                  <select
                    value={editForm.assigned_zone_id}
                    onChange={(e) => setEditForm({ ...editForm, assigned_zone_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">No Zone Assigned</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Reset Password <span className="text-gray-400 font-normal">(Leave blank to keep existing)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="New password (min 6 characters)"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete User Account</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            {actionError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Unable to delete user</div>
                  <div>{actionError}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Tip: You can deactivate this account instead to preserve audit logs and property records.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  Are you sure you want to delete <strong className="text-gray-900">{deletingUser.full_name}</strong> (@{deletingUser.username})?
                </div>
                {deletingUser.records_captured > 0 && (
                  <div className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Warning: User has {deletingUser.records_captured} captured record(s).
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 text-xs transition-colors"
              >
                Cancel
              </button>
              {!actionError && (
                <button
                  type="button"
                  onClick={handleDeleteUser}
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
