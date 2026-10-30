import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Flag,
  MapPin,
  Camera,
  AlertTriangle,
  Award,
  CheckCircle2,
  ShieldCheck,
  Send,
  Calculator,
  Building2,
  Edit3,
  Save,
} from 'lucide-react';
import MapView from '../map/MapView';
import StatusBadge from '../records/StatusBadge';
import AccuracyIndicator from '../gps/AccuracyIndicator';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function ReviewDetail({
  record,
  onApprove,
  onEndorse,
  onReject,
  onFlag,
  isProcessing,
  onRecordUpdated,
}) {
  const { user, hasRole } = useAuth();
  const [comment, setComment] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showReviewBox, setShowReviewBox] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  // Budget Director: editable property specs
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [specForm, setSpecForm] = useState({
    valuation_number: '',
    use_code: '',
    rateable_value: '',
    rate_impost: '',
  });

  // Reset spec form when record changes
  useEffect(() => {
    if (record?.attributes) {
      setSpecForm({
        valuation_number: record.attributes.valuation_number || '',
        use_code: record.attributes.use_code || '',
        rateable_value: record.attributes.rateable_value || '',
        rate_impost: record.attributes.rate_impost || '',
      });
      setEditingSpecs(false);
    }
  }, [record?.id]);

  if (!record) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
        <p className="text-xs">Select a record from the review queue to inspect location, evidence, and details.</p>
      </div>
    );
  }

  const isSupervisor = hasRole('supervisor');
  const isBudgetDirector = hasRole('budget_director');
  const isAdmin = hasRole('admin');

  // Calculate estimated bill from spec form
  const rateableVal = parseFloat(specForm.rateable_value) || 0;
  const rateImpost = parseFloat(specForm.rate_impost) || 0;
  const estimatedBill = rateableVal > 0 && rateImpost > 0 ? (rateableVal * rateImpost).toFixed(2) : null;

  const handleRejectSubmit = () => {
    if (!comment.trim()) {
      alert('Please provide a reason or comment explaining the rejection.');
      return;
    }
    onReject(record.id, comment);
    setComment('');
    setShowRejectBox(false);
  };

  const handleEndorseSubmit = () => {
    onEndorse(record.id, reviewNote.trim() || 'Reviewed and endorsed by Data Supervisor');
    setReviewNote('');
    setShowReviewBox(false);
  };

  const handleSaveSpecs = async () => {
    setSavingSpecs(true);
    try {
      const newAttrs = {};
      if (specForm.valuation_number) newAttrs.valuation_number = specForm.valuation_number;
      if (specForm.use_code) newAttrs.use_code = specForm.use_code;
      if (specForm.rateable_value) newAttrs.rateable_value = specForm.rateable_value;
      if (specForm.rate_impost) newAttrs.rate_impost = specForm.rate_impost;

      await api.patch(`/api/records/${record.id}/attributes`, {
        attributes: newAttrs,
      });

      // Update the local record state so changes show immediately
      if (onRecordUpdated) {
        onRecordUpdated(record.id, {
          ...record,
          attributes: { ...record.attributes, ...newAttrs },
        });
      }

      setEditingSpecs(false);
      alert('✅ Property specifications saved successfully!');
    } catch (err) {
      console.error('Error saving specifications:', err);
      alert(err.response?.data?.error || 'Failed to save property specifications.');
    } finally {
      setSavingSpecs(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-6 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base">{record.owner_name || 'Unnamed Record'}</h3>
            <StatusBadge status={record.status} />
          </div>
          <p className="text-xs text-gray-500 capitalize mt-0.5">
            {record.module.replace('_', ' ')} • Submitted by {record.created_by_name || 'Field Officer'}
          </p>
        </div>

        <AccuracyIndicator accuracy={record.accuracy_m} />
      </div>

      {/* Map Preview */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-gray-700">GPS Digital Address</span>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs flex justify-between items-center">
          <span className="font-bold text-gray-800">{formatCoordinates(record.latitude, record.longitude)}</span>
          <span className="text-gray-500">
            {record.ghana_post_address ? `Ghana Post: ${record.ghana_post_address}` : formatAccuracy(record.accuracy_m)}
          </span>
        </div>
        <MapView
          records={[record]}
          center={[record.longitude, record.latitude]}
          zoom={16}
          height="180px"
          interactive={true}
        />
      </div>

      {/* Ratepayer Details & Common Attributes */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
        <div>
          <span className="text-gray-400 block">Ratepayer / Contact</span>
          <span className="font-medium text-gray-900">{record.owner_name || '—'}</span>
          {record.owner_phone && <span className="text-gray-500 block text-[11px]">{record.owner_phone}</span>}
        </div>
        <div>
          <span className="text-gray-400 block">Ratepayer Group</span>
          <span className="font-medium text-gray-800 capitalize">
            {record.attributes?.groups?.replace(/_/g, ' ') || 'General Ratepayer'}
          </span>
        </div>
        <div>
          <span className="text-gray-400 block">Prominent Landmark</span>
          <span className="font-medium text-gray-800">{record.attributes?.landmark || '—'}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Street Name</span>
          <span className="font-medium text-gray-800">{record.attributes?.street_name || '—'}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Collection Area</span>
          <span className="font-medium text-gray-800">{record.attributes?.collection_area || '—'}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Sub Collection Area</span>
          <span className="font-medium text-gray-800">{record.attributes?.sub_collection_area || '—'}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Assigned Zone</span>
          <span className="font-medium text-gray-800">{record.zone_name || 'Unassigned'}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Capture Time</span>
          <span className="text-gray-700">{new Date(record.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Module Specifications (read-only for non-property-spec fields) */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-700 capitalize">
          {record.module.replace('_', ' ')} Capture Data
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-white p-3 rounded-xl border border-gray-200">
          {Object.entries(record.attributes || {})
            .filter(([k]) => !['groups', 'landmark', 'street_name', 'collection_area', 'sub_collection_area',
                               'valuation_number', 'use_code', 'rateable_value', 'rate_impost'].includes(k))
            .map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 block text-[11px] capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-800 font-mono text-xs">{String(v || '—')}</span>
              </div>
            ))}
        </div>
      </div>

      {/* ═══════ PROPERTY SPECIFICATIONS — Budget Director Editable Section ═══════ */}
      {record.module === 'property' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary-600" />
              Property Valuation & Rate Assessment
            </span>
            {(isBudgetDirector || isAdmin) && (
              <button
                type="button"
                onClick={() => setEditingSpecs(!editingSpecs)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                {editingSpecs ? 'Cancel' : 'Edit Specifications'}
              </button>
            )}
          </div>

          {editingSpecs && (isBudgetDirector || isAdmin) ? (
            /* ——— Editable Form (Budget Director / Admin Only) ——— */
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-purple-700 font-semibold mb-1">
                <Calculator className="w-3.5 h-3.5" />
                Enter Property Rate Specifications
                {estimatedBill && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Est. Annual Bill: GH¢ {estimatedBill}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Valuation Number (LVD Roll)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VAL-2024-GA-889"
                    value={specForm.valuation_number}
                    onChange={(e) => setSpecForm({ ...specForm, valuation_number: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Use Code (Building Classification)
                  </label>
                  <select
                    value={specForm.use_code || 'RES-1'}
                    onChange={(e) => setSpecForm({ ...specForm, use_code: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    <option value="RES-1">RES-1: Single Family Residential</option>
                    <option value="RES-2">RES-2: Multi-Family / Compound House</option>
                    <option value="COM-1">COM-1: Commercial (Single Storey)</option>
                    <option value="COM-2">COM-2: Commercial Multi-Storey / Office</option>
                    <option value="MIX-1">MIX-1: Mixed Residential & Commercial</option>
                    <option value="IND-1">IND-1: Light Industrial / Warehouse</option>
                    <option value="INST-1">INST-1: Institutional / School / Clinic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Rateable Value (GH¢)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 250000"
                    value={specForm.rateable_value}
                    onChange={(e) => setSpecForm({ ...specForm, rateable_value: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Rate Impost (e.g. 0.005)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="e.g. 0.005"
                    value={specForm.rate_impost}
                    onChange={(e) => setSpecForm({ ...specForm, rate_impost: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setEditingSpecs(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSpecs}
                  onClick={handleSaveSpecs}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-semibold text-xs hover:bg-purple-700 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  {savingSpecs ? 'Saving...' : 'Save Specifications'}
                </button>
              </div>
            </div>
          ) : (
            /* ——— Read-only View ——— */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-white p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 block text-[11px]">Valuation Number</span>
                <span className="font-medium text-gray-800 font-mono">
                  {record.attributes?.valuation_number || (
                    <span className="text-amber-500 italic font-sans">Pending</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Use Code</span>
                <span className="font-medium text-gray-800 font-mono">
                  {record.attributes?.use_code || (
                    <span className="text-amber-500 italic font-sans">Pending</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Rateable Value (GH¢)</span>
                <span className="font-medium text-gray-800 font-mono">
                  {record.attributes?.rateable_value || (
                    <span className="text-amber-500 italic font-sans">Pending</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Rate Impost</span>
                <span className="font-medium text-gray-800 font-mono">
                  {record.attributes?.rate_impost || (
                    <span className="text-amber-500 italic font-sans">Pending</span>
                  )}
                </span>
              </div>
              {record.attributes?.rateable_value && record.attributes?.rate_impost && (
                <div className="sm:col-span-4 pt-1 mt-1 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Calculator className="w-3.5 h-3.5" />
                    Estimated Annual Bill: GH¢{' '}
                    {(parseFloat(record.attributes.rateable_value) * parseFloat(record.attributes.rate_impost)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Hint for non-budget-director roles */}
          {!isBudgetDirector && !isAdmin && (
            <div className="text-[11px] text-gray-400 italic">
              Property valuation specifications will be entered by the Budget Director during final authorization.
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-primary-600" />
          Field Verification Photos ({record.photos?.length || 0})
        </span>
        {record.photos && record.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {record.photos.map((p, i) => {
              const fullUrl = p.file_path;
              const thumbUrl = p.thumbnail_path || fullUrl;

              return (
                <a
                  key={i}
                  href={fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-xs block"
                  title="Click to view full photo"
                >
                  <img
                    src={thumbUrl}
                    alt={p.original_name || 'Field verification photo'}
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
                      {p.original_name || `Photo ${i + 1}`}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <Camera className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-400 italic">No verification photos attached to this record.</p>
          </div>
        )}
      </div>

      {/* Reject Comment Field */}
      {showRejectBox && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
          <label className="font-semibold text-rose-800 block">
            Reason for Rejection *
          </label>
          <textarea
            rows="2"
            placeholder="e.g. Coordinates taken in wrong compound; photos are unclear; rateable value mismatched..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2 border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowRejectBox(false); setComment(''); }}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRejectSubmit}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold text-xs hover:bg-rose-700"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* Supervisor Review Box — shown when they click "Review & Send to Budget Director" */}
      {showReviewBox && (isSupervisor || isAdmin) && record.status === 'submitted' && (
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs">
          <label className="font-semibold text-purple-800 block flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Supervisor Review Note (Optional)
          </label>
          <textarea
            rows="2"
            placeholder="e.g. GPS coordinates verified on ground. Shopfront photo matches records. Ready for Budget Director approval."
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            className="w-full p-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowReviewBox(false); setReviewNote(''); }}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleEndorseSubmit}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-semibold text-xs hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {isProcessing ? 'Sending...' : 'Confirm & Send to Budget Director'}
            </button>
          </div>
        </div>
      )}

      {/* Role-Specific Review Actions */}
      <div className="pt-3 mt-auto border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => onFlag(record.id, 'Flagged for anomaly check')}
          className="px-3 py-2 border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Flag Anomaly</span>
        </button>

        <div className="flex items-center gap-2">
          {!showRejectBox && !showReviewBox && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setShowRejectBox(true)}
              className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}

          {/* SUPERVISOR ACTION: Review button → opens review note box → sends to Budget Director */}
          {(isSupervisor || isAdmin) && record.status === 'submitted' && !showReviewBox && !showRejectBox && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setShowReviewBox(true)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Review & Send to Budget Director</span>
            </button>
          )}

          {/* BUDGET DIRECTOR ACTION: Final Approval */}
          {(isBudgetDirector || isAdmin) && (record.status === 'reviewed' || record.status === 'submitted') && !showRejectBox && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onApprove(record.id)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Final Authorization & Approve</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
