import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Store,
  ShoppingBag,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Camera,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  Globe,
  AlertTriangle,
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

export default function RecordList({
  records = [],
  loading,
  onDeleteRecord,
  showPendingGpsBadge = false,
  pagination = { total: 0, pages: 1, limit: 50 },
  page = 1,
  limit = 50,
  onPageChange,
  onLimitChange,
}) {
  const { user, hasRole } = useAuth();

  const handleExportApprovedCSV = async () => {
    try {
      // First attempt downloading CSV export from backend
      const res = await api.get('/api/records/export/csv?status=approved', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `records_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (apiErr) {
      console.warn('Backend CSV export failed, falling back to client-side generator:', apiErr);
      const approvedRecords = records.filter((r) => r.status === 'approved');

      if (approvedRecords.length === 0) {
        alert('There are no approved field records available to export yet.');
        return;
      }

      // Exact 43 template headers in order
      const headers = [
        'Firstname',
        'Lastname',
        'Email',
        'Contact phonenumber',
        'Position',
        'Company',
        'Vat',
        'Phonenumber',
        'Country',
        'City',
        'Zip',
        'State',
        'Address',
        'Website',
        'Billing street',
        'Billing city',
        'Billing state',
        'Billing zip',
        'Billing country',
        'Shipping street',
        'Shipping city',
        'Shipping state',
        'Shipping zip',
        'Shipping country',
        'Longitude',
        'Latitude',
        'Stripe id',
        'Location',
        'Landmark',
        'Business Type',
        'Business Category',
        'Service(s) Provided',
        'Valuation Number',
        'Use Code',
        'Zone',
        'UPN',
        'Property Address',
        'Ghana Post Code',
        'Street Name',
        'Collection Area',
        'Sub Collection Area',
        'Rateable Value',
        'Rate Impost',
      ];

      const escapeCell = (val) => {
        if (val === null || val === undefined || val === '') return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      const rows = approvedRecords.map((r) => {
        const a = r.attributes || {};
        const rawName = (r.owner_name || '').trim();
        const nameParts = rawName ? rawName.split(/\s+/) : [];
        const firstname = nameParts.length > 0 ? nameParts[0] : '';
        const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const phone = r.owner_phone || '';
        const ghanaPost = r.ghana_post_address || '';
        const propAddress = a.property_address || '';
        const street = a.street_name || '';
        const company = a.business_type || a.company || '';
        const zoneName = r.zone_name || '';

        // Generate synthetic valid & unique email for export (Format A: {phone}@gasouth.gov.gh)
        let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        let syntheticEmail = '';
        if (cleanPhone && cleanPhone.length >= 7) {
          syntheticEmail = `${cleanPhone}@gasouth.gov.gh`;
        } else if (a.upn) {
          const cleanUpn = String(a.upn).replace(/[^a-zA-Z0-9]/g, '');
          syntheticEmail = `upn.${cleanUpn}@gasouth.gov.gh`;
        } else {
          const shortId = String(r.id || 'record').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
          syntheticEmail = `prop.${shortId}@gasouth.gov.gh`;
        }

        return [
          escapeCell(firstname),
          escapeCell(lastname),
          escapeCell(syntheticEmail),
          escapeCell(phone),
          '""',
          escapeCell(company),
          '""',
          escapeCell(phone),
          escapeCell('Ghana'),
          '""',
          '""',
          '""',
          escapeCell(propAddress),
          '""',
          escapeCell(street),
          '""',
          '""',
          '""',
          escapeCell('Ghana'),
          '""',
          '""',
          '""',
          '""',
          '""',
          r.longitude != null ? r.longitude : '',
          r.latitude != null ? r.latitude : '',
          '""',
          escapeCell(ghanaPost),
          escapeCell(a.landmark || ''),
          escapeCell(a.business_type || ''),
          escapeCell(a.business_category || ''),
          escapeCell(a.services_provided || ''),
          escapeCell(a.valuation_number || ''),
          escapeCell(a.use_code || ''),
          escapeCell(zoneName),
          escapeCell(a.upn || ''),
          escapeCell(propAddress),
          escapeCell(ghanaPost),
          escapeCell(street),
          escapeCell(a.collection_area || ''),
          escapeCell(a.sub_collection_area || ''),
          a.rateable_value != null && a.rateable_value !== '' ? a.rateable_value : '""',
          a.rate_impost != null && a.rate_impost !== '' ? a.rate_impost : '""',
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\r\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `records_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportGeoJSON = async () => {
    try {
      const res = await api.get('/api/records/export/geojson', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/geo+json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gasouth_records_spatial_${Date.now()}.geojson`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Backend GeoJSON export failed, generating from current view:', err);
      const validRecords = records.filter((r) => r.latitude && r.longitude);
      if (validRecords.length === 0) {
        alert('No records with valid GPS coordinates available to export.');
        return;
      }
      const geojson = {
        type: 'FeatureCollection',
        name: 'Ga_South_Municipal_Assembly_Field_Records',
        features: validRecords.map((r) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
          },
          properties: {
            id: r.id,
            module: r.module,
            owner_name: r.owner_name,
            owner_phone: r.owner_phone,
            ghana_post_address: r.ghana_post_address,
            status: r.status,
            accuracy_m: r.accuracy_m,
            zone_name: r.zone_name,
            created_at: r.created_at,
            ...(r.attributes || {}),
          },
        })),
      };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gasouth_records_spatial_${Date.now()}.geojson`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-700">
            {pagination?.total > 0
              ? `Displaying ${(page - 1) * limit + 1}–${Math.min(page * limit, pagination.total)} of ${pagination.total.toLocaleString()} records`
              : `Displaying ${records.length} records`}
          </span>
          {pagination?.pages > 1 && (
            <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
              Page {page} of {pagination.pages}
            </span>
          )}
          {approvedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {approvedCount} Certified & Approved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportGeoJSON}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            title="Download GeoJSON format for QGIS / ArcGIS / Town Planning Directorate"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Export GeoJSON (QGIS)</span>
          </button>

          <button
            type="button"
            onClick={handleExportApprovedCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            title="Download CSV export with complete location attributes"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({approvedCount})</span>
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-900">No records found</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {hasRole('collector')
              ? 'Start capturing field records in the field with their exact GPS addresses and photos.'
              : 'No field records have been registered under this filter criteria yet.'}
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
                  // Only collectors and admins may edit/delete field records;
                  // supervisors and budget directors are strictly read-only here.
                  const isFieldUser = hasRole('collector') || hasRole('admin');
                  const canEdit =
                    isFieldUser &&
                    (r.status === 'draft' || r.status === 'rejected') &&
                    (user?.id === r.created_by || r.capture_method === 'imported' || hasRole('admin'));
                  const canDelete =
                    isFieldUser &&
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
                        {!r.latitude && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            GPS Pending
                          </span>
                        )}
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

                        {/* Complete GPS Capture — shown when no GPS */}
                        {!r.latitude && canEdit && (
                          <Link
                            to={`/capture?edit=${r.id}`}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors"
                            title="Go to this property and capture GPS coordinates"
                          >
                            <MapPin className="w-3 h-3" />
                            Capture GPS
                          </Link>
                        )}

                        {/* UPDATE */}
                        {canEdit && r.latitude && (
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
              // Only collectors and admins may edit/delete field records;
              // supervisors and budget directors are strictly read-only here.
              const isFieldUser = hasRole('collector') || hasRole('admin');
              const canEdit =
                isFieldUser &&
                (r.status === 'draft' || r.status === 'rejected') &&
                (user?.id === r.created_by || r.capture_method === 'imported' || hasRole('admin'));
              const canDelete =
                isFieldUser &&
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
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={r.status} />
                      {!r.latitude && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          GPS Pending
                        </span>
                      )}
                    </div>
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

                    {/* Capture GPS button for imported records without location */}
                    {!r.latitude && canEdit && (
                      <Link
                        to={`/capture?edit=${r.id}`}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 font-semibold rounded-lg flex items-center gap-1"
                        title="Go to this property to capture GPS coordinates"
                      >
                        <MapPin className="w-3 h-3" />
                        Capture GPS
                      </Link>
                    )}

                    {canEdit && r.latitude && (
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

          {/* ── Pagination Controls ────────────────────────────────────── */}
          {pagination && pagination.pages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2 text-gray-500">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange && onLimitChange(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1 border border-gray-200 rounded-lg bg-gray-50 font-medium text-gray-700 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                </select>
                <span className="text-gray-400">
                  (Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total.toLocaleString()})
                </span>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange && onPageChange(1)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange && onPageChange(page - 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Page Indicator */}
                <span className="px-3 py-1 font-semibold text-gray-800 bg-gray-100 rounded-lg">
                  {page} / {pagination.pages}
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.pages}
                  onClick={() => onPageChange && onPageChange(page + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1 transition-colors"
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.pages}
                  onClick={() => onPageChange && onPageChange(pagination.pages)}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
