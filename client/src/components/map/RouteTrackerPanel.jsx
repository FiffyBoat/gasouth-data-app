import React, { useState, useEffect } from 'react';
import {
  Footprints,
  Calendar,
  Clock,
  MapPin,
  X,
  Navigation,
  User,
  TrendingUp,
  Timer,
  Camera,
  ChevronDown,
  ChevronUp,
  Route,
  Zap,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import api from '../../utils/api';

/* ─── helpers ─────────────────────────────────────── */
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start, end) {
  if (!start || !end) return '—';
  const ms = new Date(end) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function calcPace(totalKm, start, end) {
  if (!start || !end || !totalKm || parseFloat(totalKm) === 0) return null;
  const hours = (new Date(end) - new Date(start)) / 3600000;
  if (hours === 0) return null;
  return `${(parseFloat(totalKm) / hours).toFixed(1)} km/h avg pace`;
}

/* ─── RoleBadge ───────────────────────────────────── */
function RoleBadge({ role }) {
  const cfg =
    role === 'collector'
      ? { label: 'Field Officer', cls: 'bg-blue-100 text-blue-700' }
      : role === 'supervisor'
      ? { label: 'Supervisor', cls: 'bg-purple-100 text-purple-700' }
      : { label: role, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ─── StatCard ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent }) {
  const cls = {
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
  }[accent] || 'bg-gray-50 border-gray-100 text-gray-700';

  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${cls}`}>
      <Icon className="w-3 h-3 mb-0.5 opacity-60" />
      <span className="text-[9px] font-bold uppercase tracking-wide opacity-50 leading-tight">{label}</span>
      <span className="text-xs font-black leading-tight mt-0.5">{value}</span>
    </div>
  );
}

/* ─── StopRow ─────────────────────────────────────── */
function StopRow({ pt, idx, total }) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const bubbleCls = isFirst
    ? 'bg-emerald-500 text-white'
    : isLast
    ? 'bg-rose-500 text-white'
    : 'bg-purple-600 text-white';
  const bubbleLabel = isFirst ? 'S' : isLast ? 'E' : String(idx + 1);

  const statusCls = {
    reviewed: 'bg-purple-100 text-purple-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    flagged: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
    draft: 'bg-gray-100 text-gray-500',
  }[pt.status] || 'bg-gray-100 text-gray-500';

  return (
    <div className="flex items-start gap-2.5 py-2 group">
      {/* Connector column */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-5 h-5 rounded-full ${bubbleCls} flex items-center justify-center font-black text-[9px] shadow-sm flex-shrink-0`}
        >
          {bubbleLabel}
        </div>
        {idx < total - 1 && (
          <div className="w-px h-5 bg-gradient-to-b from-purple-300 to-transparent mt-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-[11px] truncate leading-snug">
          {pt.owner_name || pt.module || 'Unknown'}
        </p>
        {(pt.location_name || pt.ghana_post_address) && (
          <p className="text-[10px] text-blue-600 truncate font-medium mt-0.5">
            📍 {pt.location_name || pt.ghana_post_address}
          </p>
        )}
        {pt.status && (
          <span
            className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${statusCls}`}
          >
            {pt.status}
          </span>
        )}
      </div>

      {/* Time + photo icon */}
      <div className="shrink-0 text-right flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] text-gray-400 group-hover:text-purple-600 transition-colors">
          {fmtTime(pt.capture_time || pt.created_at)}
        </span>
        {pt.primary_photo && <Camera className="w-3 h-3 text-gray-300" />}
      </div>
    </div>
  );
}

/* ═══ Main RouteTrackerPanel ══════════════════════════════════════════════════ */
export default function RouteTrackerPanel({ onSelectRoute, onClearRoute, activeRouteData }) {
  const [collectors, setCollectors] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTimeline, setShowTimeline] = useState(true);

  /* Load officer list */
  useEffect(() => {
    api
      .get('/api/users')
      .then((res) => {
        const field = (res.data?.users || []).filter(
          (u) => u.role === 'collector' || u.role === 'supervisor'
        );
        setCollectors(field);
        if (field.length > 0) {
          setSelectedId(String(field[0].id));
          setSelectedOfficer(field[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleOfficerChange = (val) => {
    setSelectedId(val);
    setSelectedOfficer(collectors.find((c) => String(c.id) === val) || null);
    setError(null);
  };

  const handleTrace = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/api/records/collector-route?collector_id=${selectedId}&date=${selectedDate}`
      );
      if (!res.data?.points?.length) {
        setError(
          `No GPS records found for this officer on ${new Date(
            selectedDate + 'T00:00:00'
          ).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}. The officer may not have worked that day, or records have no coordinates yet.`
        );
        onClearRoute();
      } else {
        onSelectRoute({ ...res.data, officer: selectedOfficer });
        setShowTimeline(true);
      }
    } catch {
      setError('Could not load route. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasRoute = !!(activeRouteData?.points?.length);
  const paceStr = hasRoute
    ? calcPace(activeRouteData.total_distance_km, activeRouteData.start_time, activeRouteData.end_time)
    : null;
  const withPhotos = hasRoute ? activeRouteData.points.filter((p) => p.primary_photo).length : 0;

  return (
    <div className="bg-white/97 backdrop-blur-xl rounded-2xl border border-gray-200/80 shadow-2xl text-xs flex flex-col overflow-hidden w-80 max-h-[82vh]">

      {/* ── Gradient Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Route className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm leading-none">Field Route Tracer</h4>
            <p className="text-purple-200 text-[10px] mt-0.5">Track officer daily field path</p>
          </div>
        </div>
        {hasRoute && (
          <button
            type="button"
            onClick={onClearRoute}
            title="Exit Route View"
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="overflow-y-auto flex-1 px-4 py-3.5 space-y-3.5">

        {/* Officer selector */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Field Officer
          </label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={selectedId}
              onChange={(e) => handleOfficerChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none appearance-none text-xs"
            >
              {collectors.length === 0 && <option>Loading officers…</option>}
              {collectors.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.full_name} — {c.zone_name || 'No Zone'}
                </option>
              ))}
            </select>
          </div>
          {selectedOfficer && (
            <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
              <RoleBadge role={selectedOfficer.role} />
              {selectedOfficer.zone_name && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {selectedOfficer.zone_name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Date picker */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Date to Inspect
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setSelectedDate(e.target.value); setError(null); }}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Trace CTA */}
        <button
          type="button"
          onClick={handleTrace}
          disabled={loading || !selectedId}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-purple-200/60 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Tracing Route…</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              <span>Trace Field Route</span>
              <ArrowRight className="w-3 h-3 opacity-70" />
            </>
          )}
        </button>

        {/* Error banner */}
        {error && !hasRoute && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 leading-snug">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Active Route Section ── */}
        {hasRoute && (
          <div className="space-y-3 pt-0.5">

            {/* Officer identity chip */}
            <div className="flex items-center gap-2.5 p-2.5 bg-purple-50 border border-purple-100 rounded-xl">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow shrink-0">
                {(activeRouteData.officer?.full_name || 'FO').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-xs truncate">
                  {activeRouteData.officer?.full_name || 'Field Officer'}
                </p>
                <p className="text-[10px] text-purple-600 font-semibold truncate">
                  {new Date(activeRouteData.date + 'T00:00:00').toLocaleDateString([], {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <span className="shrink-0 text-[9px] font-black text-white bg-purple-500 px-2 py-0.5 rounded-full">
                LIVE
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-1.5">
              <StatCard icon={Footprints} label="Stops" value={activeRouteData.total_points} accent="purple" />
              <StatCard icon={TrendingUp} label="Dist." value={`${activeRouteData.total_distance_km} km`} accent="blue" />
              <StatCard icon={Timer} label="Span" value={fmtDuration(activeRouteData.start_time, activeRouteData.end_time)} accent="emerald" />
              <StatCard icon={Camera} label="📷" value={withPhotos} accent="amber" />
            </div>

            {/* Pace bar */}
            {paceStr && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
                <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-semibold">{paceStr}</span>
                <span className="text-[10px] text-indigo-400 ml-auto font-mono shrink-0">
                  {fmtTime(activeRouteData.start_time)} → {fmtTime(activeRouteData.end_time)}
                </span>
              </div>
            )}

            {/* Timeline toggle */}
            <button
              type="button"
              onClick={() => setShowTimeline((v) => !v)}
              className="w-full flex items-center justify-between px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide hover:text-purple-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Stop-by-Stop Timeline ({activeRouteData.total_points})
              </span>
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Timeline */}
            {showTimeline && (
              <div className="max-h-56 overflow-y-auto -mx-1 px-1 scroll-smooth divide-y divide-gray-50 border border-gray-100 rounded-xl bg-white/60 p-1">
                {activeRouteData.points.map((pt, idx) => (
                  <StopRow
                    key={pt.id}
                    pt={pt}
                    idx={idx}
                    total={activeRouteData.points.length}
                  />
                ))}
              </div>
            )}

            {/* Footer note */}
            <p className="text-center text-[10px] text-gray-400 pb-1">
              Click any pin on the map to view record details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
