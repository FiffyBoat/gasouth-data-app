import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Store, ShoppingBag, ExternalLink, MapPin } from 'lucide-react';
import StatusBadge from '../records/StatusBadge';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';

const MODULE_ICONS = {
  property: Building2,
  business: Store,
  market_stall: ShoppingBag,
};

export default function RecordPopup({ record }) {
  if (!record) return null;

  const Icon = MODULE_ICONS[record.module] || Building2;

  return (
    <div className="p-1 max-w-xs text-left">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm capitalize">
          <Icon className="w-4 h-4 text-primary-600" />
          <span>{record.owner_name || `${record.module} Record`}</span>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="py-2 space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1 font-mono text-gray-700">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{formatCoordinates(record.latitude, record.longitude)}</span>
        </div>

        {record.ghana_post_address && (
          <p className="text-gray-500">
            Digital Addr: <span className="font-mono text-gray-800">{record.ghana_post_address}</span>
          </p>
        )}

        <div className="flex justify-between text-gray-500 pt-1">
          <span>Accuracy: {formatAccuracy(record.accuracy_m)}</span>
          {record.zone_name && <span className="text-primary-700 font-medium">{record.zone_name}</span>}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 flex justify-end">
        <Link
          to={`/records/${record.id}`}
          className="text-xs text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1"
        >
          View Full Details
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
