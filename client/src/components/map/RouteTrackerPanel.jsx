import React, { useState, useEffect } from 'react';
import {
  Footprints,
  Calendar,
  Clock,
  Compass,
  MapPin,
  X,
  Play,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import api from '../../utils/api';

export default function RouteTrackerPanel({
  onSelectRoute,
  onClearRoute,
  activeRouteData,
}) {
  const [collectors, setCollectors] = useState([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of collectors
  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        const res = await api.get('/api/users');
        const allUsers = res.data?.users || [];
        const fieldOfficers = allUsers.filter(
          (u) => u.role === 'collector' || u.role === 'supervisor'
        );
        setCollectors(fieldOfficers);
        if (fieldOfficers.length > 0 && !selectedCollectorId) {
          setSelectedCollectorId(fieldOfficers[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch collectors for route tracking:', err);
      }
    };
    fetchCollectors();
  }, []);

  const handleFetchRoute = async () => {
    if (!selectedCollectorId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/api/records/collector-route?collector_id=${selectedCollectorId}&date=${selectedDate}`
      );
      if (res.data?.points?.length === 0) {
        setError(`No records captured on ${selectedDate} by this officer.`);
        onClearRoute();
      } else {
        onSelectRoute(res.data);
      }
    } catch (err) {
      console.error('Error tracing route:', err);
      setError('Failed to trace route.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 p-4 shadow-xl space-y-3.5 text-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Collector Route Inspector</h4>
            <p className="text-[11px] text-gray-500">Trace daily field path & capture sequence</p>
          </div>
        </div>

        {activeRouteData && (
          <button
            type="button"
            onClick={onClearRoute}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            title="Exit Route View"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selector Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Field Officer:
          </label>
          <select
            value={selectedCollectorId}
            onChange={(e) => setSelectedCollectorId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl bg-white text-gray-800 font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
          >
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.zone_name || 'No Zone'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Inspection Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl bg-white text-gray-800 font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleFetchRoute}
        disabled={loading || !selectedCollectorId}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
        <span>Trace Field Route</span>
      </button>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px]">
          {error}
        </div>
      )}

      {/* Active Route Summary Stats */}
      {activeRouteData && activeRouteData.points?.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-purple-50/70 rounded-xl border border-purple-100">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Records</span>
              <span className="text-sm font-bold text-purple-700">{activeRouteData.total_points}</span>
            </div>
            <div className="p-2 bg-purple-50/70 rounded-xl border border-purple-100">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Distance</span>
              <span className="text-sm font-bold text-purple-700">{activeRouteData.total_distance_km} km</span>
            </div>
            <div className="p-2 bg-purple-50/70 rounded-xl border border-purple-100">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Active Span</span>
              <span className="text-xs font-bold text-purple-700">
                {formatTime(activeRouteData.start_time)} - {formatTime(activeRouteData.end_time)}
              </span>
            </div>
          </div>

          {/* Sequential Timeline List */}
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
            {activeRouteData.points.map((pt, idx) => (
              <div
                key={pt.id}
                className="pt-1.5 flex items-center justify-between text-[11px] text-gray-700"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold truncate">{pt.owner_name || pt.module}</span>
                </div>
                <span className="font-mono text-gray-400 shrink-0 text-[10px]">
                  {formatTime(pt.capture_time || pt.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
