import React from 'react';
import { Users, Crosshair, Award } from 'lucide-react';

export default function CollectorStats({ collectors = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            Field Officer Productivity
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time daily capture rate & GPS fix quality
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs divide-y divide-gray-100">
          <thead>
            <tr className="text-gray-400 font-semibold uppercase text-[10px]">
              <th className="py-2">Collector</th>
              <th className="py-2">Assigned Zone</th>
              <th className="py-2 text-center">Today</th>
              <th className="py-2 text-center">Total</th>
              <th className="py-2 text-center">Avg Accuracy</th>
              <th className="py-2 text-right">Rejection Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {collectors.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-gray-400">
                  No active field collectors found.
                </td>
              </tr>
            ) : (
              collectors.map((c) => (
                <tr key={c.user_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2.5 font-medium text-gray-900">{c.full_name}</td>
                  <td className="py-2.5 text-gray-500">{c.assigned_zone_name || 'Unassigned'}</td>
                  <td className="py-2.5 text-center font-bold text-emerald-600">
                    {c.records_today > 0 ? `+${c.records_today}` : '0'}
                  </td>
                  <td className="py-2.5 text-center font-semibold text-gray-800">{c.total_records}</td>
                  <td className="py-2.5 text-center font-mono text-gray-600">
                    {c.avg_accuracy_m ? `±${c.avg_accuracy_m}m` : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`font-semibold ${
                        c.rejection_rate_pct > 15
                          ? 'text-rose-600'
                          : c.rejection_rate_pct > 5
                          ? 'text-amber-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {c.rejection_rate_pct}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
