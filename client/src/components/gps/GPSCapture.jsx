import React, { useState } from 'react';
import {
  MapPin,
  RefreshCw,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Navigation,
  BadgeCheck,
} from 'lucide-react';
import AccuracyIndicator from './AccuracyIndicator';
import ManualPinMap from './ManualPinMap';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';

/**
 * Validates a Ghana Post GPS Digital Address.
 * Format: GS-XXXX-XXXX  (GS prefix, 4 digits, hyphen, 4 digits)
 * Returns null if empty (optional field), 'invalid' if bad format, 'valid' if correct.
 */
function validateGhanaPost(value) {
  if (!value || !value.trim()) return null; // optional
  const clean = value.trim().toUpperCase();
  // Accept formats: GS-0000-0000  or  GS00000000
  if (/^GS-\d{4}-\d{4}$/.test(clean)) return 'valid';
  if (/^GS\d{8}$/.test(clean)) return 'valid'; // no-hyphen variant
  return 'invalid';
}

export default function GPSCapture({
  latitude,
  longitude,
  accuracy,
  altitude,
  captureMethod,
  capturing,
  readingCount,
  error,
  onCapture,
  onAverage,
  onManualSelect,
  ghanaPostAddress,
  onGhanaPostChange,
}) {
  const [showManualModal, setShowManualModal] = useState(false);

  const hasLocation = latitude != null && longitude != null;
  const ghanaPostStatus = validateGhanaPost(ghanaPostAddress);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">GPS Digital Address</h3>
            <p className="text-xs text-gray-500">Every revenue item is indexed by real-time GPS coordinates</p>
          </div>
        </div>

        {hasLocation && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {captureMethod === 'averaged' ? `Averaged (${readingCount} pts)` : captureMethod === 'manual-pin' ? 'Manual Pin' : 'Device GPS'}
          </span>
        )}
      </div>

      {/* Captured Location Display or Capture CTA */}
      {hasLocation ? (
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Coordinates</span>
              <p className="text-lg font-mono font-bold text-gray-900">
                {formatCoordinates(latitude, longitude)}
              </p>
            </div>
            {accuracy != null && (
              <AccuracyIndicator accuracy={accuracy} />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Accuracy: </span>
              <span className="font-medium text-gray-700">{formatAccuracy(accuracy)}</span>
            </div>
            {altitude != null && (
              <div>
                <span className="text-gray-400">Altitude: </span>
                <span className="font-medium text-gray-700">{Math.round(altitude)} m</span>
              </div>
            )}
            <div>
              <span className="text-gray-400">Method: </span>
              <span className="font-medium text-gray-700 capitalize">{captureMethod || 'GPS'}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onCapture}
          disabled={capturing}
          className={`
            w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all
            ${capturing
              ? 'bg-emerald-500 text-white cursor-wait animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'}
          `}
        >
          {capturing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Acquiring satellite fix...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span>{hasLocation ? 'Re-capture GPS Fix' : '📍 Capture My Location'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onAverage}
          disabled={capturing}
          className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          title="Takes 5 consecutive GPS readings and calculates the mean to improve accuracy"
        >
          <Compass className="w-4 h-4 text-primary-600" />
          <span>Average Readings (5 Fixes)</span>
        </button>
      </div>

      {/* Manual Pin and Ghana Post Alternate */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowManualModal(true)}
          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1.5"
        >
          <Layers className="w-4 h-4" />
          <span>Place or adjust pin on interactive map</span>
        </button>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="ghana_post" className="text-gray-500 shrink-0">
              Ghana Post Digital Address:
            </label>
            <div className="relative">
              <input
                id="ghana_post"
                type="text"
                placeholder="e.g. GS-0124-5678"
                value={ghanaPostAddress || ''}
                onChange={(e) => onGhanaPostChange(e.target.value.toUpperCase())}
                maxLength={12}
                className={`px-2.5 py-1 text-xs border rounded-lg focus:ring-1 focus:outline-none uppercase font-mono w-36 pr-7 ${
                  ghanaPostStatus === 'valid'
                    ? 'border-emerald-400 focus:ring-emerald-400 bg-emerald-50 text-emerald-800'
                    : ghanaPostStatus === 'invalid'
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50 text-rose-800'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {ghanaPostStatus === 'valid' && (
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 absolute right-2 top-1/2 -translate-y-1/2" />
              )}
              {ghanaPostStatus === 'invalid' && (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 absolute right-2 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
          {ghanaPostStatus === 'invalid' && (
            <p className="text-[10px] text-rose-600 font-medium pl-1">
              ⚠ Must be GS-XXXX-XXXX format (e.g. GS-0124-5678)
            </p>
          )}
          {ghanaPostStatus === 'valid' && (
            <p className="text-[10px] text-emerald-600 font-medium pl-1">
              ✓ Valid Ghana Post Digital Address
            </p>
          )}
        </div>
      </div>

      {/* Manual Pin Modal */}
      {showManualModal && (
        <ManualPinMap
          initialLat={latitude}
          initialLng={longitude}
          onConfirm={(lat, lng) => {
            onManualSelect(lat, lng);
            setShowManualModal(false);
          }}
          onCancel={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}
