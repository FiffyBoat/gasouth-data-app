import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, Layers, Mountain, Eye, RefreshCw } from 'lucide-react';
import { formatCoordinates } from '../../utils/geo';

// Vibrant, high-contrast municipal status colors with strong glow
const STATUS_CONFIG = {
  approved: {
    color: '#059669', // Emerald
    glow: 'rgba(5, 150, 105, 0.6)',
    label: 'Approved',
    bg: '#ecfdf5',
    text: '#065f46',
  },
  reviewed: {
    color: '#7c3aed', // Purple
    glow: 'rgba(124, 58, 237, 0.6)',
    label: 'Reviewed',
    bg: '#f5f3ff',
    text: '#5b21b6',
  },
  submitted: {
    color: '#2563eb', // Blue
    glow: 'rgba(37, 99, 235, 0.6)',
    label: 'Submitted',
    bg: '#eff6ff',
    text: '#1e40af',
  },
  flagged: {
    color: '#d97706', // Amber
    glow: 'rgba(217, 119, 6, 0.6)',
    label: 'Flagged',
    bg: '#fffbeb',
    text: '#92400e',
  },
  rejected: {
    color: '#dc2626', // Red
    glow: 'rgba(220, 38, 38, 0.6)',
    label: 'Rejected',
    bg: '#fef2f2',
    text: '#991b1b',
  },
  draft: {
    color: '#6b7280', // Gray
    glow: 'rgba(107, 114, 128, 0.4)',
    label: 'Draft',
    bg: '#f9fafb',
    text: '#374151',
  },
};

// 1. Ultra High-Resolution Google Hybrid Satellite (Super fast via 4 parallel CDN subdomains)
const SATELLITE_HYBRID_STYLE = {
  version: 8,
  sources: {
    'satellite-hybrid': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '&copy; Google Satellite Imagery & Roads',
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

// 2. OpenStreetMap Street View
const STREET_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
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

export default function MapView({
  records = [],
  zones = [],
  routePoints = [],
  onSelectRecord,
  selectedRecordId,
  mapLayer = 'satellite',
  center = [-0.4285, 5.5350], // [lng, lat] Ga South (Amanfro / Kasoa corridor)
  zoom = 13.5,
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

  const currentStyle = useMemo(() => {
    return activeLayer === 'street' ? STREET_STYLE : SATELLITE_HYBRID_STYLE;
  }, [activeLayer]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: currentStyle,
      center,
      zoom,
      pitch: is3D ? 52 : 0,
      bearing: is3D ? -12 : 0,
      maxPitch: 65, // Limit pitch to 65 to avoid loading heavy horizon tiles
      dragRotate: true,
      touchPitch: true,
      interactive,
      // Optimize rendering
      fadeDuration: 100,
    });

    if (interactive) {
      // 3D navigation control with visual tilt indicator
      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: true,
        }),
        'top-right'
      );
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
    }

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update style when layer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(currentStyle);
  }, [currentStyle]);

  // Fast, Smooth 3D Perspective Toggle
  const handleToggle3D = () => {
    const map = mapRef.current;
    if (!map) return;

    const next3D = !is3D;
    setIs3D(next3D);

    if (next3D) {
      // Smooth 3D camera flight into oblique perspective
      map.easeTo({
        pitch: 52,
        bearing: -12,
        duration: 800,
      });
    } else {
      // Smooth flight back to 2D flat top-down view
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 700,
      });
    }
  };

  // Render Record Markers OR Collector Sequential Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old HTML markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear old route layers if present
    if (map.getLayer('collector-route-arrows')) map.removeLayer('collector-route-arrows');
    if (map.getLayer('collector-route-line-casing')) map.removeLayer('collector-route-line-casing');
    if (map.getLayer('collector-route-line')) map.removeLayer('collector-route-line');
    if (map.getSource('collector-route-source')) map.removeSource('collector-route-source');

    // SCENARIO 1: Rendering Collector Daily Route
    if (routePoints && routePoints.length > 0) {
      const validPoints = routePoints.filter((p) => p.latitude != null && p.longitude != null);
      const coordinates = validPoints.map((p) => [p.longitude, p.latitude]);

      if (coordinates.length > 1) {
        // ── Animated dashed route line ──────────────────────────────────────
        map.addSource('collector-route-source', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates } },
        });

        // Soft white glow halo underneath
        map.addLayer({
          id: 'collector-route-line-casing',
          type: 'line',
          source: 'collector-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#c4b5fd',
            'line-width': 10,
            'line-opacity': 0.35,
            'line-blur': 4,
          },
        });

        // Solid core line
        map.addLayer({
          id: 'collector-route-line',
          type: 'line',
          source: 'collector-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#7c3aed',
            'line-width': 4,
            'line-opacity': 0.95,
          },
        });

        // Direction arrows (dashes) on top to show travel direction
        map.addLayer({
          id: 'collector-route-arrows',
          type: 'line',
          source: 'collector-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.8,
            'line-dasharray': [0, 5],
          },
        });
      }

      // ── Numbered Stop Pins ──────────────────────────────────────────────
      const bounds = new maplibregl.LngLatBounds();

      routePoints.forEach((pt, idx) => {
        if (pt.latitude == null || pt.longitude == null) return;
        bounds.extend([pt.longitude, pt.latitude]);

        const isStart = idx === 0;
        const isEnd = idx === routePoints.length - 1;

        // Colors: green=start, red=end, purple=middle
        const pinBg   = isStart ? '#059669' : isEnd ? '#dc2626' : '#7c3aed';
        const pinGlow = isStart ? 'rgba(5,150,105,0.5)' : isEnd ? 'rgba(220,38,38,0.5)' : 'rgba(124,58,237,0.5)';
        const pinLabel = isStart ? 'START' : isEnd ? 'END' : String(idx + 1);

        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.style.transformOrigin = 'bottom center';
        el.style.transition = 'transform 0.15s ease';
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.45));">
            <div style="
              padding: ${isStart || isEnd ? '3px 8px' : '2px 6px'};
              border-radius: 9999px;
              background: ${pinBg};
              color: #fff;
              font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
              font-size: ${isStart || isEnd ? '10px' : '11px'};
              font-weight: 900;
              letter-spacing: 0.3px;
              border: 2px solid #fff;
              box-shadow: 0 0 12px ${pinGlow};
              white-space: nowrap;
            ">${pinLabel}</div>
            <div style="width:2px;height:12px;background:linear-gradient(to bottom,#fff,${pinBg});"></div>
            <div style="width:6px;height:6px;border-radius:50%;background:${pinBg};border:1.5px solid #fff;box-shadow:0 0 6px ${pinGlow};"></div>
          </div>
        `;

        const timeStr = pt.capture_time || pt.created_at
          ? new Date(pt.capture_time || pt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        const statusColor = {
          reviewed: '#7c3aed', submitted: '#2563eb', approved: '#059669',
          flagged: '#d97706', rejected: '#dc2626', draft: '#6b7280',
        }[pt.status] || '#6b7280';

        const statusBg = {
          reviewed: '#f5f3ff', submitted: '#eff6ff', approved: '#ecfdf5',
          flagged: '#fffbeb', rejected: '#fef2f2', draft: '#f9fafb',
        }[pt.status] || '#f9fafb';

        const photoHtml = pt.primary_photo
          ? `<img src="${pt.primary_photo}" alt="photo" style="width:100%;height:72px;object-fit:cover;border-radius:8px;margin-bottom:6px;border:1px solid #e5e7eb;" />`
          : '';

        const popup = new maplibregl.Popup({ offset: [0, -32], closeButton: true, maxWidth: '220px' }).setHTML(`
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;padding:4px 2px;line-height:1.45;">
            ${photoHtml}
            <div style="font-size:10px;font-weight:800;color:${pinBg};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">
              ${isStart ? '🚀 Start' : isEnd ? '🏁 End' : `Stop #${idx + 1}`}${timeStr ? ` · ${timeStr}` : ''}
            </div>
            <div style="font-weight:700;color:#111827;font-size:13px;margin-bottom:3px;">${pt.owner_name || pt.module || 'Unknown'}</div>
            ${(pt.location_name || pt.ghana_post_address)
              ? `<div style="color:#2563eb;font-weight:600;font-size:11px;margin-bottom:4px;">📍 ${pt.location_name || pt.ghana_post_address}</div>`
              : ''}
            <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;background:${statusBg};color:${statusColor};font-weight:800;font-size:10px;border:1px solid ${statusColor}30;text-transform:uppercase;">
              <span style="width:5px;height:5px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
              ${pt.status || 'draft'}
            </div>
            <div style="color:#9ca3af;font-family:monospace;font-size:10px;margin-top:4px;">${formatCoordinates(pt.latitude, pt.longitude)}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
          .setLngLat([pt.longitude, pt.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 90, maxZoom: 16, duration: 900 });
      }
      return;
    }

    // SCENARIO 2: Rendering Standard Active Records
    records.forEach((record) => {
      if (record.latitude == null || record.longitude == null) return;

      const isSelected = record.id === selectedRecordId;
      const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.draft;

      // Outer container
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.transformOrigin = 'bottom center';
      el.style.willChange = 'transform';

      el.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));
        ">
          <!-- Floating Status Badge -->
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 9999px;
            background: ${cfg.color};
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${cfg.glow}, 0 2px 6px rgba(0,0,0,0.5);
            white-space: nowrap;
          ">
            <span style="
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #ffffff;
              display: inline-block;
              box-shadow: 0 0 4px rgba(255,255,255,0.8);
            "></span>
            <span>${cfg.label}</span>
          </div>

          <!-- Vertical Stalk Needle (Lifts into 3D Space) -->
          <div style="
            width: 2.5px;
            height: 16px;
            background: linear-gradient(to bottom, #ffffff 10%, ${cfg.color} 90%);
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          "></div>

          <!-- Ground Anchor Pinpoint -->
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${cfg.color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 6px ${cfg.color}, 0 2px 4px rgba(0,0,0,0.6);
            margin-top: -2px;
          "></div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectRecord) {
          onSelectRecord(record);
        }
      });

      // Interactive Popup
      const popup = new maplibregl.Popup({
        offset: [0, -32],
        closeButton: false,
        className: 'custom-map-popup',
      }).setHTML(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 6px 8px; min-width: 160px; line-height: 1.4;">
          <div style="font-weight: 700; color: #111827; font-size: 13px; margin-bottom: 2px;">
            ${record.owner_name || record.module}
          </div>
          <div style="color: #4b5563; font-family: monospace; font-size: 11px;">
            ${formatCoordinates(record.latitude, record.longitude)}
          </div>
          ${
            (record.location_name || record.ghana_post_address)
              ? `<div style="color: #2563eb; font-weight: 600; font-size: 11px; margin-top: 2px;">📍 ${record.location_name || record.ghana_post_address}</div>`
              : ''
          }
          <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background: ${cfg.bg}; color: ${cfg.text}; font-weight: 700; font-size: 10px; border: 1px solid ${cfg.color}40;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${cfg.color};"></span>
            ${cfg.label}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([record.longitude, record.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [records, selectedRecordId, routePoints]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Floating 3D / 2D Perspective Toggle & Satellite Switcher */}
      {interactive && allow3DToggle && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-gray-200 text-xs">
          {/* 3D Perspective Toggle Button */}
          <button
            type="button"
            onClick={handleToggle3D}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              is3D
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md ring-2 ring-purple-400/50'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle between 3D Angled Perspective and 2D Flat View"
          >
            <Box className={`w-3.5 h-3.5 ${is3D ? 'text-white' : 'text-gray-500'}`} />
            <span>{is3D ? '3D Active (52°)' : '3D View'}</span>
          </button>

          {/* Satellite Layer Switcher */}
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

      {/* 3D Status Legend Pill in Bottom-Left */}
      {interactive && (
        <div className="hidden sm:flex absolute bottom-3 left-3 z-10 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-[10px] items-center gap-3 font-semibold pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> Reviewed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Submitted
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Flagged
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Rejected
          </span>
        </div>
      )}
    </div>
  );
}
