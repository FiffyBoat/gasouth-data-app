import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GeofenceWarning({ warning, onDismiss }) {
  if (!warning) return null;

  return (
    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-800">Geofence Boundary Alert</p>
        <p className="text-amber-700 text-xs mt-0.5">{warning}</p>
        <p className="text-amber-600 text-xs mt-1">
          You may still save and submit this record; it will be flagged for supervisor verification.
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-700 text-xs font-medium px-2 py-1 rounded"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
