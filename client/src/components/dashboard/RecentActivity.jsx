import React from 'react';
import { History, Activity } from 'lucide-react';

export default function RecentActivity({ activity = [] }) {
  const getActionBadge = (action) => {
    switch (action) {
      case 'create':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'status_change':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'update':
        return 'text-primary-700 bg-primary-50 border-primary-200';
      case 'delete':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-primary-600" />
          Recent System Activity
        </h3>
        <span className="text-xs text-gray-400">Live Audit Trail</span>
      </div>

      <div className="space-y-3">
        {activity.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No recent activity recorded.</p>
        ) : (
          activity.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 text-xs border-b border-gray-50 pb-2 last:border-none last:pb-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getActionBadge(
                    item.action
                  )}`}
                >
                  {item.action.replace('_', ' ')}
                </span>
                <span className="text-gray-800 font-medium">{item.user_name || 'System User'}</span>
                <span className="text-gray-400 capitalize">• {item.entity_type}</span>
              </div>
              <span className="text-gray-400 text-[11px] whitespace-nowrap">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
