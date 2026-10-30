import React from 'react';
import { Filter, Search, Layers, RefreshCw } from 'lucide-react';

export default function MapFilters({
  filters,
  onChange,
  zones = [],
  mapLayer,
  onToggleLayer,
  onRefresh,
}) {
  return (
    <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-gray-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Search Bar */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search owner or digital address..."
          value={filters.search || ''}
          onChange={(e) => onChange('search', e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Module Filter */}
        <select
          value={filters.module || ''}
          onChange={(e) => onChange('module', e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium"
        >
          <option value="">All Categories</option>
          <option value="property">Properties</option>
          <option value="business">Businesses</option>
          <option value="market_stall">Market Stalls</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => onChange('status', e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed (Endorsed)</option>
          <option value="approved">Approved & Certified</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>

        {/* Zone Filter */}
        {zones.length > 0 && (
          <select
            value={filters.zone_id || ''}
            onChange={(e) => onChange('zone_id', e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        )}

        {/* Street / Satellite Toggle */}
        <button
          type="button"
          onClick={onToggleLayer}
          className="px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium flex items-center gap-1.5 transition-colors"
          title="Toggle Street and Satellite maps"
        >
          <Layers className="w-3.5 h-3.5 text-primary-600" />
          <span className="capitalize">{mapLayer === 'street' ? 'Satellite' : 'Street'} View</span>
        </button>

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Refresh records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
