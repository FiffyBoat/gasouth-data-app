import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { getAccuracyLevel, formatAccuracy } from '../../utils/geo';

export default function AccuracyIndicator({ accuracy }) {
  if (accuracy == null) return null;

  const level = getAccuracyLevel(accuracy);

  const configs = {
    excellent: {
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
      label: 'Excellent fix (±' + Math.round(accuracy) + 'm)',
    },
    good: {
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
      label: 'Good fix (±' + Math.round(accuracy) + 'm)',
    },
    fair: {
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: AlertTriangle,
      label: 'Fair fix (±' + Math.round(accuracy) + 'm) — consider re-capturing',
    },
    poor: {
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      icon: AlertCircle,
      label: 'Poor accuracy (±' + Math.round(accuracy) + 'm) — move outdoors & re-capture',
    },
  };

  const config = configs[level];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${config.color}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{config.label}</span>
    </div>
  );
}
