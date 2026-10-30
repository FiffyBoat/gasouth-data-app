import React from 'react';

const STATUS_CONFIGS = {
  draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  submitted: {
    label: 'Submitted',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  reviewed: {
    label: 'Reviewed (Pending Approval)',
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  flagged: {
    label: 'Flagged',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
