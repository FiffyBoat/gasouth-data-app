import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, Layers, Mountain, Compass, Maximize2 } from 'lucide-react';
import { formatCoordinates } from '../../utils/geo';

const STATUS_COLORS = {
  draft: '#9ca3af',
  submitted: '#3b82f6',
  reviewed: '#8b5cf6',
  approved: '#10b981',
  rejected: '#ef4444',
  flagged: '#f59e0b',
};

// 1. Standard OpenStreetMap street tiles
const STREET_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// 2. Ultra High-Resolution Hybrid Satellite with Street & Landmark Overlays (Google Imagery - Crystal Clear for Ga South)
const SATELLITE_HYBRID_STYLE = {
  version: 8,
  sources: {
    'satellite-hybrid': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga',
        'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga',
        'https://mt2.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga',
        'https://mt3.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga',
      ],
      tileSize: 256,
      attribution: '&copy; Google Satellite Imagery & Hybrid Overlays',
    },
  },
  layers: [
    {
      id: 'satellite-hybrid-layer',
      type: 'raster',
      source: 'satellite-hybrid',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// 3. Esri World Imagery Satellite (Alternative)
const SATELLITE_ESRI_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; World Imagery',
    },
    labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 19,
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'labels',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Global 3D Digital Elevation Model (DEM) for Real Topography / Hills
const TERRAIN_SOURCE = {
  type: 'raster-dem',
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
};

export default function MapView({
  records = [],
  zones = [],
  onSelectRecord,
  selectedRecordId,
  mapLayer = 'satellite', // default to high-res satellite
  center = [-0.4285, 5.5350], // [lng, lat] Kasoa - Ngleshie Amanfro default
  zoom = 13,
  interactive = true,
  height = '100%',
  allow3DToggle = true,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [is3D, setIs3D] = useState(false);
  const [activeLayer, setActiveLayer] = useState(mapLayer);

  // Sync external mapLayer prop
  useEffect(() => {
    setActiveLayer(mapLayer);
  }, [mapLayer]);

  const getStyleForLayer = (layerName) => {
    if (layerName === 'street') return STREET_STYLE;
    if (layerName === 'esri') return SATELLITE_ESRI_STYLE;
    return SATELLITE_HYBRID_STYLE;
  };

  // Configure 3D Terrain & Sky on Map Style Load
  const applyTerrainAndSky = (map, enable3D) => {
    try {
      if (enable3D) {
        if (!map.getSource('terrain-dem')) {
          map.addSource('terrain-dem', TERRAIN_SOURCE);
        }
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.6 });

        // Add atmospheric sky if supported
        if (typeof map.setSky === 'function') {
          map.setSky({
            'sky-color': '#1E3A8A',
            'sky-horizon-blend': 0.6,
            'horizon-color': '#FDE047',
            'horizon-fog-blend': 0.8,
            'fog-ground-blend': 0.4,
          });
        }
      } else {
        if (typeof map.setTerrain === 'function') {
          map.setTerrain(null);
        }
      }
    } catch (err) {
      console.warn('3D Terrain setup notice:', err.message);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initialStyle = getStyleForLayer(activeLayer);

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center,
      zoom,
      pitch: is3D ? 55 : 0,
      bearing: is3D ? -15 : 0,
      maxPitch: 85,
      interactive,
    });

    if (interactive) {
      // Navigation control with 3D pitch ring
      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: true,
        }),
        'top-right'
      );
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
    }

    map.on('load', () => {
      applyTerrainAndSky(map, is3D);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update style when layer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newStyle = getStyleForLayer(activeLayer);
    map.setStyle(newStyle);

    map.once('style.load', () => {
      applyTerrainAndSky(map, is3D);
    });
  }, [activeLayer]);

  // Toggle 3D Perspective Mode
  const handleToggle3D = () => {
    const map = mapRef.current;
    if (!map) return;

    const next3D = !is3D;
    setIs3D(next3D);

    if (next3D) {
      // Animate camera into 3D oblique perspective
      map.easeTo({
        pitch: 58,
        bearing: -15,
        duration: 900,
      });
      applyTerrainAndSky(map, true);
    } else {
      // Animate back to flat 2D top-down view
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
      applyTerrainAndSky(map, false);
    }
  };

  // Render Zone Boundaries and Record Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old HTML markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for records
    records.forEach((record) => {
      if (record.latitude == null || record.longitude == null) return;

      const isSelected = record.id === selectedRecordId;
      const color = STATUS_COLORS[record.status] || '#6b7280';

      const el = document.createElement('div');
      el.className = `cursor-pointer transition-transform duration-200 hover:scale-125 ${
        isSelected ? 'scale-125 z-30' : 'z-10'
      }`;
      el.innerHTML = `
        <div style="
          width: ${isSelected ? '26px' : '20px'};
          height: ${isSelected ? '26px' : '20px'};
          background: radial-gradient(circle at 35% 35%, white 10%, ${color} 80%);
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 8px ${color}88;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onSelectRecord) {
          onSelectRecord(record);
        }
      });

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 6px 8px; line-height: 1.4;">
          <div style="font-weight: 700; color: #111827; font-size: 13px;">${record.owner_name || record.module}</div>
          <div style="color: #4b5563; font-family: monospace; font-size: 11px;">${formatCoordinates(record.latitude, record.longitude)}</div>
          ${record.ghana_post_address ? `<div style="color: #2563eb; font-weight: 600; font-size: 11px;">🇬🇭 ${record.ghana_post_address}</div>` : ''}
          <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; border-radius: 9999px; background-color: ${color}20; color: ${color}; font-weight: 700; font-size: 10px; text-transform: uppercase;">
            ${record.status}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([record.longitude, record.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [records, selectedRecordId]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Floating 3D / 2D Perspective Toggle Pill */}
      {interactive && allow3DToggle && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-gray-200 text-xs">
          <button
            type="button"
            onClick={handleToggle3D}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              is3D
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm ring-2 ring-purple-400/50'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle 3D Angled Perspective and Terrain Elevation"
          >
            <Box className={`w-3.5 h-3.5 ${is3D ? 'animate-pulse text-white' : 'text-gray-500'}`} />
            <span>{is3D ? '3D Active' : '3D View'}</span>
          </button>

          {/* Satellite Layer Switcher Pill */}
          <button
            type="button"
            onClick={() => setActiveLayer(activeLayer === 'street' ? 'satellite' : 'street')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              activeLayer !== 'street'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Toggle between High-Res Satellite and Street Map"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeLayer !== 'street' ? 'Satellite Hybrid' : 'Street'}</span>
          </button>
        </div>
      )}

      {/* 3D Indicator Badge in Bottom-Right */}
      {is3D && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-mono font-medium flex items-center gap-1 border border-white/20">
          <Mountain className="w-3 h-3 text-amber-400" />
          <span>3D Pitch 58° • DEM Terrain 1.6x</span>
        </div>
      )}
    </div>
  );
}
