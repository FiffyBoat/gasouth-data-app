import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Building2,
  Store,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import api from '../../utils/api';

const MODULE_ICONS = {
  property: Building2,
  business: Store,
  market_stall: ShoppingBag,
};

const STATUS_PILLS = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  reviewed: 'bg-purple-100 text-purple-800 border-purple-300',
  submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  flagged: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-300',
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function ProximityAlert({
  latitude,
  longitude,
  excludeId = null,
  isConfirmedDistinct = false,
  onConfirmDistinctChange,
}) {
  const [nearbyRecords, setNearbyRecords] = useState([]);
  const [checking, setChecking] = useState(false);
  const [checkedAtCoords, setCheckedAtCoords] = useState(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setNearbyRecords([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setChecking(true);
        const params = new URLSearchParams({
          lat: latitude.toString(),
          lng: longitude.toString(),
          radius: '15', // 15 meters radius threshold
          limit: '3',
        });
        if (excludeId) params.append('exclude_id', excludeId);

        const res = await api.get(`/api/records/nearby?${params.toString()}`);
        setNearbyRecords(res.data?.records || []);
        setCheckedAtCoords(`${latitude},${longitude}`);
      } catch (err) {
        console.warn('Proximity anti-duplicate check notice:', err);
      } finally {
        setChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [latitude, longitude, excludeId]);

  if (latitude == null || longitude == null) {
    return null;
  }

  // Active check in progress
  if (checking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200 animate-pulse">
        <div className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span>Scanning 15-meter proximity for existing properties or businesses...</span>
      </div>
    );
  }

  // Clean: No nearby duplicates found
  if (nearbyRecords.length === 0) {
    if (!checkedAtCoords) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-medium">
          Proximity Check Clear: No existing records detected within 15 meters.
        </span>
      </div>
    );
  }

  // Warning: Nearby records found
  const nearest = nearbyRecords[0];

  return (
    <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Alert Header */}
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-2">
            <span>Potential Duplicate Detected</span>
            <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-mono">
              ⚡ {nearest.distance_m}m away
            </span>
          </h4>
          <p className="text-xs text-amber-800 mt-0.5">
            A property or business is already registered within 15 meters of these coordinates. Please verify to avoid duplicate entries.
          </p>
        </div>
      </div>

      {/* Nearby Records List */}
      <div className="space-y-2">
        {nearbyRecords.map((rec) => {
          const Icon = MODULE_ICONS[rec.module] || Building2;
          const statusClass = STATUS_PILLS[rec.status] || STATUS_PILLS.draft;

          return (
            <div
              key={rec.id}
              className="bg-white rounded-xl border border-amber-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">
                    {rec.owner_name || 'Unnamed Property'}
                  </div>
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="capitalize">{rec.module.replace('_', ' ')}</span>
                    {rec.ghana_post_address && (
                      <span className="font-mono text-blue-600 font-medium">🇬🇭 {rec.ghana_post_address}</span>
                    )}
                    {rec.upn && <span className="font-mono text-gray-600">UPN: {rec.upn}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusClass}`}>
                  {rec.status}
                </span>

                <a
                  href={`/records/${rec.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                  title="View this existing record in a new tab"
                >
                  <span>Inspect</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Checkbox for Distinct Sub-Unit */}
      <div className="pt-2 border-t border-amber-200/80">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmedDistinct}
            onChange={(e) => onConfirmDistinctChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-amber-600 border-amber-400 focus:ring-amber-500"
          />
          <span className="text-xs text-amber-900 font-medium">
            <strong>Confirmed Distinct Unit:</strong> This is a separate structure, tenant, or container shop on the same parcel (not an accidental duplicate).
          </span>
        </label>
      </div>
    </div>
  );
}
