import React, { useState, useEffect } from 'react';
import { Footprints, MapPin } from 'lucide-react';
import MapView from '../components/map/MapView';
import MapFilters from '../components/map/MapFilters';
import RecordPopup from '../components/map/RecordPopup';
import RouteTrackerPanel from '../components/map/RouteTrackerPanel';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function MapExplorer() {
  const { hasRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState('satellite');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Collector Route Inspection State
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [activeRouteData, setActiveRouteData] = useState(null);

  const [filters, setFilters] = useState({
    module: '',
    status: '',
    zone_id: '',
    search: '',
  });

  // GPS stats for the info banner
  const [gpsStats, setGpsStats] = useState({ visible: 0, total: 0 });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.module) params.append('module', filters.module);
      if (filters.status) params.append('status', filters.status);
      if (filters.zone_id) params.append('zone_id', filters.zone_id);
      if (filters.search) params.append('search', filters.search);
      // Always request only GPS-tagged records for the map — records without
      // coordinates cannot be pinned and would just eat into the page limit.
      params.append('has_gps', 'true');
      params.append('limit', '2000'); // covers all GPS-tagged records comfortably

      const res = await api.get(`/api/records?${params.toString()}`);
      const fetchedRecords = res.data?.records || [];
      setRecords(fetchedRecords);

      // Also fetch total count (with same filters but without has_gps) for the banner
      const countParams = new URLSearchParams();
      if (filters.module) countParams.append('module', filters.module);
      if (filters.status) countParams.append('status', filters.status);
      if (filters.zone_id) countParams.append('zone_id', filters.zone_id);
      if (filters.search) countParams.append('search', filters.search);
      countParams.append('limit', '1');
      const countRes = await api.get(`/api/records?${countParams.toString()}`);
      const totalInFilter = countRes.data?.total || 0;

      setGpsStats({
        visible: fetchedRecords.length,
        total: totalInFilter,
      });
    } catch (err) {
      console.error('Error fetching map records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/api/zones');
        setZones(res.data?.zones || []);
      } catch (e) {
        console.error('Error fetching zones:', e);
      }
    };
    fetchZones();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleToggleLayer = () => {
    setMapLayer((prev) => (prev === 'street' ? 'satellite' : 'street'));
  };

  return (
    <div className="space-y-3 flex flex-col h-[calc(100vh-120px)]">
      {/* Top Filter Bar with Route Tracker Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex-1">
          <MapFilters
            filters={filters}
            onChange={handleFilterChange}
            zones={zones}
            mapLayer={mapLayer}
            onToggleLayer={handleToggleLayer}
            onRefresh={fetchRecords}
          />
        </div>

        {/* Route Inspector Button for Supervisors / Admins */}
        {(hasRole('supervisor') || hasRole('admin')) && (
          <button
            type="button"
            onClick={() => {
              setShowRoutePanel(!showRoutePanel);
              if (showRoutePanel) setActiveRouteData(null);
            }}
            className={`px-3.5 py-2 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 ${
              showRoutePanel || activeRouteData
                ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                : 'bg-white hover:bg-gray-50 text-purple-700 border border-purple-200'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>{activeRouteData ? 'Route Active' : 'Trace Officer Route'}</span>
          </button>
        )}
      </div>

      {/* Map Explorer Area */}
      <div className="relative flex-1 w-full bg-gray-100 rounded-2xl overflow-hidden shadow-sm border border-gray-200">

        {/* GPS Record Count Banner */}
        {!loading && (
          <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow">
            <MapPin className="w-3.5 h-3.5 text-green-400" />
            <span>
              <strong>{gpsStats.visible}</strong> GPS-pinned record{gpsStats.visible !== 1 ? 's' : ''} visible
              {gpsStats.total > gpsStats.visible && (
                <span className="text-gray-300 ml-1">
                  · {gpsStats.total - gpsStats.visible} pending GPS capture
                </span>
              )}
            </span>
          </div>
        )}
        <MapView
          records={records}
          zones={zones}
          routePoints={activeRouteData?.points || []}
          mapLayer={mapLayer}
          onSelectRecord={(r) => setSelectedRecord(r)}
          selectedRecordId={selectedRecord?.id}
          height="100%"
        />

        {/* Floating Route Tracker Panel */}
        {showRoutePanel && (
          <div className="absolute top-4 right-4 z-20 w-84 max-w-[calc(100vw-2rem)]">
            <RouteTrackerPanel
              onSelectRoute={(data) => setActiveRouteData(data)}
              onClearRoute={() => {
                setActiveRouteData(null);
                setShowRoutePanel(false);
              }}
              activeRouteData={activeRouteData}
            />
          </div>
        )}

        {/* Active Route Floating Banner at Top Center */}
        {activeRouteData && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-purple-900/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-purple-400/30 text-xs font-medium flex items-center gap-3">
            <Footprints className="w-4 h-4 text-purple-300 animate-pulse" />
            <span>
              Tracing <strong>{activeRouteData.total_points} stops</strong> ({activeRouteData.total_distance_km} km)
            </span>
            <button
              type="button"
              onClick={() => setActiveRouteData(null)}
              className="text-purple-300 hover:text-white font-bold ml-1 text-xs"
            >
              ✕ Exit
            </button>
          </div>
        )}

        {/* Selected Record Floating Bottom Card on Mobile/Desktop */}
        {selectedRecord && !activeRouteData && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-gray-200 z-20">
            <div className="flex justify-end pb-1">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <RecordPopup record={selectedRecord} />
          </div>
        )}
      </div>
    </div>
  );
}
