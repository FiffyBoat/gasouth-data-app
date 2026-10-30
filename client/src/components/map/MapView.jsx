import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatCoordinates } from '../../utils/geo';

const STATUS_COLORS = {
  draft: '#9ca3af',
  submitted: '#3b82f6',
  reviewed: '#8b5cf6',
  approved: '#10b981',
  rejected: '#ef4444',
  flagged: '#f59e0b',
};

export default function MapView({
  records = [],
  zones = [],
  onSelectRecord,
  selectedRecordId,
  mapLayer = 'street',
  center = [-0.4285, 5.5350], // [lng, lat] Kasoa - Ngleshie Amanfro default
  zoom = 13,
  interactive = true,
  height = '100%',
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const streetStyle = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
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

  const satelliteStyle = {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles © Esri',
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
    ],
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapLayer === 'satellite' ? satelliteStyle : streetStyle,
      center,
      zoom,
      interactive,
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
    }

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update Style when mapLayer changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(mapLayer === 'satellite' ? satelliteStyle : streetStyle);
  }, [mapLayer]);

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
      el.className = `cursor-pointer transition-transform duration-150 hover:scale-125 ${
        isSelected ? 'scale-125 z-30' : 'z-10'
      }`;
      el.innerHTML = `
        <div style="
          width: ${isSelected ? '24px' : '18px'};
          height: ${isSelected ? '24px' : '18px'};
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></div>
      `;

      el.addEventListener('click', () => {
        if (onSelectRecord) {
          onSelectRecord(record);
        }
      });

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong>${record.owner_name || record.module}</strong><br/>
          <span style="color: #6b7280;">${formatCoordinates(record.latitude, record.longitude)}</span><br/>
          <span style="text-transform: capitalize; color: ${color}; font-weight: 600;">${record.status}</span>
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
    </div>
  );
}
