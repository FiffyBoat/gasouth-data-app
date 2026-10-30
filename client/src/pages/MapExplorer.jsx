import React, { useState, useEffect } from 'react';
import MapView from '../components/map/MapView';
import MapFilters from '../components/map/MapFilters';
import RecordPopup from '../components/map/RecordPopup';
import api from '../utils/api';

export default function MapExplorer() {
  const [records, setRecords] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState('street');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [filters, setFilters] = useState({
    module: '',
    status: '',
    zone_id: '',
    search: '',
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.module) params.append('module', filters.module);
      if (filters.status) params.append('status', filters.status);
      if (filters.zone_id) params.append('zone_id', filters.zone_id);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', '500'); // large limit for map visualization

      const res = await api.get(`/api/records?${params.toString()}`);
      setRecords(res.data?.records || []);
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
      {/* Filters Header */}
      <MapFilters
        filters={filters}
        onChange={handleFilterChange}
        zones={zones}
        mapLayer={mapLayer}
        onToggleLayer={handleToggleLayer}
        onRefresh={fetchRecords}
      />

      {/* Map Explorer Area */}
      <div className="relative flex-1 w-full bg-gray-100 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        <MapView
          records={records}
          zones={zones}
          mapLayer={mapLayer}
          onSelectRecord={(r) => setSelectedRecord(r)}
          selectedRecordId={selectedRecord?.id}
          height="100%"
        />

        {/* Selected Record Floating Bottom Card on Mobile/Desktop */}
        {selectedRecord && (
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
