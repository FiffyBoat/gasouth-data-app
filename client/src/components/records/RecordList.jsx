import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Store,
  ShoppingBag,
  MapPin,
  Calendar,
  ChevronRight,
  Camera,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const MODULE_ICONS = {
  property: Building2,
  business: Store,
  market_stall: ShoppingBag,
};

export default function RecordList({ records = [], loading, onDeleteRecord }) {
  const { user, hasRole } = useAuth();

  const handleExportApprovedCSV = async () => {
    try {
      // First attempt downloading comprehensive CSV export from backend
      const res = await api.get('/api/records/export/csv?status=approved', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approved_revenue_records_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (apiErr) {
      console.warn('Backend CSV export failed, falling back to client-side generator:', apiErr);
      const approvedRecords = records.filter((r) => r.status === 'approved');

      if (approvedRecords.length === 0) {
        alert('There are no approved records available to export yet.');
        return;
      }

      const headers = [
        'Record ID',
        'Category',
        'Ratepayer Name',
        'Phone Number',
        'Ratepayer Group',
        'GPS Latitude',
        'GPS Longitude',
        'GPS Accuracy (m)',
        'Ghana Post Address',
        'Landmark',
        'Street Name',
        'Collection Area',
        'Sub Collection Area',
        'UPN',
        'Property Address',
        'Valuation Number',
        'Use Code',
        'Rateable Value (GHS)',
        'Rate Impost',
        'Business Type',
        'Business Category',
        'Services Provided',
        'Status',
        'Zone',
        'Captured Date',
      ];

      const rows = approvedRecords.map((r) => {
        const a = r.attributes || {};
        return [
          `"${r.id || ''}"`,
          `"${r.module || ''}"`,
          `"${(r.owner_name || '').replace(/"/g, '""')}"`,
          `"${r.owner_phone || ''}"`,
          `"${(a.groups || '').replace(/"/g, '""')}"`,
          r.latitude || '',
          r.longitude || '',
          r.accuracy_m || '',
          `"${r.ghana_post_address || ''}"`,
          `"${(a.landmark || '').replace(/"/g, '""')}"`,
          `"${(a.street_name || '').replace(/"/g, '""')}"`,
          `"${(a.collection_area || '').replace(/"/g, '""')}"`,
          `"${(a.sub_collection_area || '').replace(/"/g, '""')}"`,
          `"${(a.upn || '').replace(/"/g, '""')}"`,
          `"${(a.property_address || '').replace(/"/g, '""')}"`,
          `"${(a.valuation_number || '').replace(/"/g, '""')}"`,
          `"${(a.use_code || '').replace(/"/g, '""')}"`,
          a.rateable_value || '',
          a.rate_impost || '',
          `"${(a.business_type || '').replace(/"/g, '""')}"`,
          `"${(a.business_category || '').replace(/"/g, '""')}"`,
          `"${(a.services_provided || '').replace(/"/g, '""')}"`,
          `"${r.status || ''}"`,
          `"${r.zone_name || ''}"`,
          `"${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\r\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `approved_revenue_records_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading records...</span>
      </div>
    );
  }

  const approvedCount = records.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Displaying {records.length} records</span>
          {approvedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {approvedCount} Certified & Approved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportApprovedCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Approved CSV ({approvedCount})</span>
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-900">No records found</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {hasRole('collector')
              ? 'Start capturing revenue items in the field with their exact GPS addresses and photos.'
              : 'No revenue records have been registered under this filter criteria yet.'}
          </p>
          {hasRole('collector') && (
            <Link
              to="/capture"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 transition-colors"
            >
              Capture First Record
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Ratepayer / Owner</th>
                  <th className="px-4 py-3">GPS Digital Address</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Captured</th>
                  <th className="px-4 py-3 text-right">Actions (CRUD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((r) => {
                  const Icon = MODULE_ICONS[r.module] || Building2;
                  const canEdit =
                    (r.status === 'draft' || r.status === 'rejected') &&
                    (user?.id === r.created_by || hasRole('admin'));
                  const canDelete =
                    (r.status === 'draft' || r.status === 'rejected') &&
                    (user?.id === r.created_by || hasRole('admin'));

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium capitalize text-gray-800">
                            {r.module.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.owner_name || '—'}</div>
                        {r.owner_phone && <div className="text-gray-400 text-[11px]">{r.owner_phone}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        <div>{formatCoordinates(r.latitude, r.longitude)}</div>
                        <div className="text-[11px] text-gray-400">
                          {r.ghana_post_address || formatAccuracy(r.accuracy_m)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.zone_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        {/* READ */}
                        <Link
                          to={`/records/${r.id}`}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors"
                          title="Read full record"
                        >
                          View
                        </Link>

                        {/* UPDATE */}
                        {canEdit && (
                          <Link
                            to={`/capture?edit=${r.id}`}
                            className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors"
                            title="Edit record"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Link>
                        )}

                        {/* DELETE */}
                        {canDelete && onDeleteRecord && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete this record for "${r.owner_name}"?`)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {records.map((r) => {
              const Icon = MODULE_ICONS[r.module] || Building2;
              const canEdit =
                (r.status === 'draft' || r.status === 'rejected') &&
                (user?.id === r.created_by || hasRole('admin'));
              const canDelete =
                (r.status === 'draft' || r.status === 'rejected') &&
                (user?.id === r.created_by || hasRole('admin'));

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {r.owner_name || 'Untitled Record'}
                        </h4>
                        <span className="text-[11px] text-gray-400 capitalize">
                          {r.module.replace('_', ' ')} • {r.zone_name || 'No zone'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatCoordinates(r.latitude, r.longitude)}</span>
                    </div>
                    {r.photo_count > 0 && (
                      <span className="flex items-center gap-1 text-gray-400 font-sans">
                        <Camera className="w-3 h-3" />
                        {r.photo_count}
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2 text-xs">
                    <Link
                      to={`/records/${r.id}`}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg"
                    >
                      View Details
                    </Link>

                    {canEdit && (
                      <Link
                        to={`/capture?edit=${r.id}`}
                        className="px-3 py-1.5 bg-primary-50 text-primary-700 font-semibold rounded-lg flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Link>
                    )}

                    {canDelete && onDeleteRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete record "${r.owner_name}"?`)) {
                            onDeleteRecord(r.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 font-semibold rounded-lg flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
