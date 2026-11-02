import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  AlertCircle,
  Building2,
  Store,
  ShoppingBag,
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import ReviewDetail from './ReviewDetail';
import StatusBadge from '../records/StatusBadge';
import { formatCoordinates, formatAccuracy } from '../../utils/geo';

const MODULE_ICONS = {
  property: Building2,
  business: Store,
  market_stall: ShoppingBag,
};

export default function ReviewPanel({
  records = [],
  stageFilter = 'submitted',
  selectedRecord,
  onSelectRecord,
  onApprove,
  onEndorse,
  onReject,
  onFlag,
  onBatchAction,
  isProcessing,
  onRecordUpdated,
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (r.owner_name && r.owner_name.toLowerCase().includes(term)) ||
      (r.ghana_post_address && r.ghana_post_address.toLowerCase().includes(term)) ||
      (r.zone_name && r.zone_name.toLowerCase().includes(term))
    );
  });

  const allFilteredIds = filteredRecords.map((r) => r.id);
  const isAllSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleToggleOne = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBatch = (targetStatus) => {
    if (selectedIds.length === 0) return;
    const confirmMsg =
      targetStatus === 'reviewed'
        ? `Are you sure you want to bulk-endorse ${selectedIds.length} records and forward them to the Budget Director?`
        : `Are you sure you want to bulk-certify and approve ${selectedIds.length} records for revenue mobilization?`;

    if (window.confirm(confirmMsg)) {
      onBatchAction?.(selectedIds, targetStatus);
      setSelectedIds([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Left Column: Review Queue (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Queue Header & Search */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary-600" />
              Review Queue ({filteredRecords.length})
            </h3>
            {filteredRecords.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer hover:text-primary-600 transition-colors">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                />
                <span>Select All</span>
              </label>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by owner, zone or Ghana Post..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Batch Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="p-2.5 bg-primary-50 border border-primary-200 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
              <span className="font-semibold text-primary-900">
                {selectedIds.length} selected
              </span>
              <div className="flex items-center gap-1.5">
                {stageFilter === 'submitted' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleExecuteBatch('reviewed')}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Endorse ({selectedIds.length})</span>
                  </button>
                )}

                {stageFilter === 'reviewed' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleExecuteBatch('approved')}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Certify ({selectedIds.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No records currently waiting for review.
            </div>
          ) : (
            filteredRecords.map((r) => {
              const Icon = MODULE_ICONS[r.module] || Building2;
              const isSelected = selectedRecord?.id === r.id;
              const isChecked = selectedIds.includes(r.id);

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50/70 border-l-4 border-primary-600' : 'hover:bg-gray-50'
                  } ${isChecked ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleOne(r.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 shrink-0"
                      />
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-xs truncate max-w-[170px]">
                          {r.owner_name || 'Unnamed Record'}
                        </h4>
                        <span className="text-[11px] text-gray-400 capitalize">
                          {r.module.replace('_', ' ')} • {r.zone_name || 'No zone'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="mt-2 pl-6 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                    <span>{formatCoordinates(r.latitude, r.longitude)}</span>
                    <span className="font-sans text-gray-400">{formatAccuracy(r.accuracy_m)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Review Details & Decisioning (7 cols) */}
      <div className="lg:col-span-7 h-full">
        <ReviewDetail
          record={selectedRecord}
          onApprove={onApprove}
          onEndorse={onEndorse}
          onReject={onReject}
          onFlag={onFlag}
          isProcessing={isProcessing}
          onRecordUpdated={onRecordUpdated}
        />
      </div>
    </div>
  );
}
