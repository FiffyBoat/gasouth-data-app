import React from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  Building2,
  Store,
  ShoppingBag,
  ArrowRight,
  Download,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Clock,
  Check,
} from 'lucide-react';
import api from '../../utils/api';

export default function BudgetRevenueSummary({ stats = {}, coverage = [] }) {
  const handleExportApprovedCSV = async () => {
    try {
      const res = await api.get('/api/records/export/csv?status=approved', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certified_billing_register_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Could not download approved CSV export.');
    }
  };

  const stream = stats.revenue_by_stream || {};
  const propStream = stream.property || {};
  const bizStream = stream.business || {};
  const stallStream = stream.market_stall || {};

  const reviewedCount = stats.reviewed_count || 0;
  const reviewedRev = stats.reviewed_revenue_ghs || 0;
  const approvedRev = stats.approved_revenue_ghs || 0;
  const totalRateable = stats.total_rateable_value_ghs || 0;

  return (
    <div className="space-y-6">
      {/* 1. Action Alert Banner for Budget Director */}
      {reviewedCount > 0 ? (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-primary-900 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-500/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                Action Required
              </span>
              <span className="text-xs text-purple-200">Budget Director Final Authorization</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {reviewedCount} record{reviewedCount > 1 ? 's' : ''} awaiting your final certification
            </h3>
            <p className="text-xs text-purple-200 max-w-xl">
              Data Supervisors have reviewed and endorsed these records representing an estimated{' '}
              <strong className="text-white font-bold font-mono">
                GH¢ {reviewedRev.toLocaleString()}
              </strong>{' '}
              in annual municipal revenue. Certify them to finalize municipal data collection records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/review"
              className="px-4 py-2.5 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Review & Authorize ({reviewedCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Budget Queue Clear:</strong> All reviewed records have been authorized. Total certified revenue collected:{' '}
              <span className="font-mono font-bold">GH¢ {approvedRev.toLocaleString()}</span>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleExportApprovedCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      )}

      {/* 2. Three Revenue Streams Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stream 1: Property Rates */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Property Rates</h4>
                  <span className="text-[11px] text-gray-400">Rateable Assessed Base</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                0.5% Impost
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-500">
                <span>Total Assessed Valuation:</span>
                <span className="font-mono font-semibold text-gray-900">
                  GH¢ {totalRateable.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Certified Annual Revenue:</span>
                <span className="font-mono font-bold text-emerald-700">
                  GH¢ {(propStream.approved_ghs || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Pending Authorization:</span>
                <span className="font-mono font-semibold text-purple-700">
                  GH¢ {(propStream.pipeline_ghs || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
            <span>{propStream.count || 0} registered properties</span>
            <span>{propStream.approved_count || 0} certified</span>
          </div>
        </div>

        {/* Stream 2: Business Operating Permits (BOP) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Business Operating Permits</h4>
                  <span className="text-[11px] text-gray-400">Commercial & Retail Entities</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                BOP Roll
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-500">
                <span>Registered Businesses:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {bizStream.count || 0} establishments
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Certified Permit Fees:</span>
                <span className="font-mono font-bold text-emerald-700">
                  GH¢ {(bizStream.approved_ghs || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Pipeline Under Verification:</span>
                <span className="font-mono font-semibold text-purple-700">
                  GH¢ {(bizStream.pipeline_ghs || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
            <span>Hospitality, Trade, Services</span>
            <span>{bizStream.approved_count || 0} approved</span>
          </div>
        </div>

        {/* Stream 3: Market Stalls & Other Levies */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Market Stalls & Levies</h4>
                  <span className="text-[11px] text-gray-400">Daily/Monthly Tolls & Sheds</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                Tolls Roll
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-500">
                <span>Mapped Stalls / Units:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {stallStream.count || 0} sheds
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Certified Annual Tolls:</span>
                <span className="font-mono font-bold text-emerald-700">
                  GH¢ {(stallStream.approved_ghs || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Pipeline Tolls:</span>
                <span className="font-mono font-semibold text-purple-700">
                  GH¢ {(stallStream.pipeline_ghs || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
            <span>Kasoa New Market, Amanfro Sheds</span>
            <span>{stallStream.approved_count || 0} approved</span>
          </div>
        </div>
      </div>

      {/* 3. Zone Revenue Realization & Target Comparison */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary-600" />
              Zonal Revenue Realization & Target Coverage
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Breakdown of certified billing revenue and pipeline potential across municipal zones
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportApprovedCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Certified Revenue Register (CSV)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Zone & Code</th>
                <th className="px-4 py-3">Records Mapped</th>
                <th className="px-4 py-3">Certified Revenue (GHS)</th>
                <th className="px-4 py-3">Pending Authorization (GHS)</th>
                <th className="px-4 py-3">Total Potential (GHS)</th>
                <th className="px-4 py-3 text-right">Target Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {coverage.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-400">
                    No zonal revenue data available.
                  </td>
                </tr>
              ) : (
                coverage.map((z) => {
                  const appRev = z.approved_revenue_ghs || 0;
                  const penRev = z.pending_revenue_ghs || 0;
                  const totalRev = appRev + penRev;
                  const pct = Math.min(100, Math.round(z.coverage_pct || 0));

                  return (
                    <tr key={z.zone_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{z.zone_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{z.zone_code}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{z.record_count}</span>
                        <span className="text-gray-400 text-[11px]"> / {z.target_count || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-emerald-700">
                        GH¢ {appRev.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-purple-700">
                        GH¢ {penRev.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-gray-900">
                        GH¢ {totalRev.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-700 text-[11px]">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
