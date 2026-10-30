import React from 'react';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

export default function CoverageMap({ coverage = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-600" />
            Zone Coverage & Targets
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Registration progress across municipal electoral areas
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {coverage.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No zones defined yet.</p>
        ) : (
          coverage.map((z) => {
            const pct = Math.min(100, Math.round(z.coverage_pct || 0));
            const isHigh = pct >= 80;
            const isMid = pct >= 40 && pct < 80;

            const barColor = isHigh
              ? 'bg-emerald-500'
              : isMid
              ? 'bg-amber-500'
              : 'bg-primary-500';

            return (
              <div key={z.zone_id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-800">{z.zone_name}</span>
                  <span className="text-gray-600">
                    <span className="font-bold text-gray-900">{z.record_count}</span>
                    {z.target_count > 0 && ` / ${z.target_count} target`} ({pct}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
