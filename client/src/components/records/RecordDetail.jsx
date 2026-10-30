import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Flag,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Calculator,
  Award,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import AccuracyIndicator from '../gps/AccuracyIndicator';
import MapView from '../map/MapView';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';
import { useAuth } from '../../contexts/AuthContext';

export default function RecordDetail({ record, onStatusChange, onDeleteRecord, isUpdating }) {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!record) return null;

  const isOwner = user?.id === record.created_by;
  const isDraftOrRejected = record.status === 'draft' || record.status === 'rejected';

  // CRUD Permissions
  const canEdit = (isDraftOrRejected && isOwner) || hasRole('admin');
  const canDelete = (isDraftOrRejected && isOwner) || hasRole('admin');

  // Multi-tier Workflow Permissions
  const isSupervisor = hasRole('supervisor') || hasRole('admin');
  const isBudgetDirector = hasRole('budget_director') || hasRole('admin');

  const canSupervisorReview = isSupervisor && record.status === 'submitted';
  const canBudgetApprove = isBudgetDirector && record.status === 'reviewed';

  const rateableVal = parseFloat(record.attributes?.rateable_value) || 0;
  const rateImpost = parseFloat(record.attributes?.rate_impost) || 0;
  const annualBill = rateableVal > 0 && rateImpost > 0 ? (rateableVal * rateImpost).toFixed(2) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{record.owner_name || 'Unnamed Ratepayer'}</h2>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-xs text-gray-500 capitalize">
              {record.module.replace('_', ' ')} Record • Zone: {record.zone_name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Action Buttons (CRUD & Workflow) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* UPDATE (Edit) */}
          {canEdit && (
            <Link
              to={`/capture?edit=${record.id}`}
              className="px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-primary-600" />
              Edit
            </Link>
          )}

          {/* DELETE */}
          {canDelete && onDeleteRecord && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete this record for "${record.owner_name}"?`)) {
                  onDeleteRecord(record.id);
                }
              }}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}

          {/* COLLECTOR: Submit draft/rejected for review */}
          {isDraftOrRejected && isOwner && (
            <button
              onClick={() => onStatusChange('submitted')}
              disabled={isUpdating}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Submit to Supervisor
            </button>
          )}

          {/* DATA SUPERVISOR: Endorse and forward to Budget Director */}
          {canSupervisorReview && (
            <button
              onClick={() => onStatusChange('reviewed')}
              disabled={isUpdating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Endorse & Forward to Budget Director
            </button>
          )}

          {/* BUDGET DIRECTOR: Final approval */}
          {canBudgetApprove && (
            <button
              onClick={() => onStatusChange('approved')}
              disabled={isUpdating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Award className="w-3.5 h-3.5" />
              Final Approval (Certify Record)
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Data on Left, Map & Photos on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* GPS Address Block */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                GPS Digital Address
              </h3>
              <AccuracyIndicator accuracy={record.accuracy_m} />
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xl font-mono font-bold text-gray-900">
                  {formatCoordinates(record.latitude, record.longitude)}
                </p>
                {record.ghana_post_address && (
                  <p className="text-xs font-mono text-gray-500 mt-1">
                    Ghana Post: <span className="font-semibold text-gray-800">{record.ghana_post_address}</span>
                  </p>
                )}
              </div>
              <a
                href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500 pt-1">
              <div>
                <span>Capture Method: </span>
                <span className="font-medium text-gray-800 capitalize">{record.capture_method}</span>
              </div>
              {record.altitude && (
                <div>
                  <span>Elevation: </span>
                  <span className="font-medium text-gray-800">{Math.round(record.altitude)} m</span>
                </div>
              )}
              <div>
                <span>Captured: </span>
                <span className="font-medium text-gray-800">
                  {new Date(record.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Ratepayer Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Ratepayer & Geographic Context
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Ratepayer's Name</span>
                <span className="font-semibold text-gray-900 text-sm">{record.owner_name || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Phone Number</span>
                <span className="font-semibold text-gray-900 text-sm">{record.owner_phone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Ratepayer Group</span>
                <span className="font-medium text-gray-800 capitalize">
                  {record.attributes?.groups?.replace(/_/g, ' ') || 'General Ratepayer'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Prominent Landmark</span>
                <span className="font-medium text-gray-800">{record.attributes?.landmark || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Street Name</span>
                <span className="font-medium text-gray-800">{record.attributes?.street_name || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Collection Area</span>
                <span className="font-medium text-gray-800">{record.attributes?.collection_area || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Sub Collection Area</span>
                <span className="font-medium text-gray-800">{record.attributes?.sub_collection_area || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Zone</span>
                <span className="font-medium text-gray-800">{record.zone_name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Module-Specific Attributes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 capitalize">
                {record.module.replace('_', ' ')} Assessment Details
              </h3>
              {annualBill && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Calculator className="w-3.5 h-3.5" />
                  Annual Bill: GH¢ {annualBill}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              {Object.entries(record.attributes || {})
                .filter(([k]) => !['groups', 'landmark', 'street_name', 'collection_area', 'sub_collection_area'].includes(k))
                .map(([key, val]) => (
                  <div key={key}>
                    <span className="text-gray-400 block mb-0.5 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium text-gray-900 capitalize font-mono text-[13px]">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '—')}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Review History / Remarks */}
          {record.review_comment && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1 text-xs">
              <span className="font-semibold text-gray-700">Audit / Review Remarks:</span>
              <p className="text-gray-600">{record.review_comment}</p>
              {record.reviewed_by_name && (
                <span className="text-gray-400 text-[11px] block mt-1">
                  Endorsed by {record.reviewed_by_name} on {new Date(record.review_time).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Location Map & Photos */}
        <div className="space-y-6">
          {/* Map Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h4 className="font-semibold text-gray-900 text-xs">Spatial Location</h4>
            <MapView
              records={[record]}
              center={[record.longitude, record.latitude]}
              zoom={16}
              height="220px"
              interactive={true}
            />
          </div>

          {/* Photo Gallery */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h4 className="font-semibold text-gray-900 text-xs">
              Evidence Photos ({record.photos?.length || 0})
            </h4>

            {record.photos && record.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {record.photos.map((p, idx) => {
                  const fullUrl = p.file_path;
                  const thumbUrl = p.thumbnail_path || fullUrl;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(fullUrl)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer shadow-xs"
                      title="Click to view full photo"
                    >
                      <img
                        src={thumbUrl}
                        alt={p.original_name || `Evidence ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          if (fullUrl && e.target.src !== fullUrl) {
                            e.target.src = fullUrl;
                          } else {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=300&q=80';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-1.5">
                        <span className="text-[10px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                          {p.original_name || `Photo ${idx + 1}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No photos attached to this record.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal for viewing photo full size */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Enlarged"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80';
            }}
          />
        </div>
      )}
    </div>
  );
}
