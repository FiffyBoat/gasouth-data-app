import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapPin, Check, X } from 'lucide-react';
import { formatCoordinates } from '../../utils/geo';

export default function ManualPinMap({ initialLat, initialLng, onConfirm, onCancel }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const defaultLat = initialLat || 5.5350;
  const defaultLng = initialLng || -0.4285;

  const [position, setPosition] = useState({ lat: defaultLat, lng: defaultLng });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Use CARTO Positron high-performance, policy-compliant raster tiles
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'carto-layer',
            type: 'raster',
            source: 'carto',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [defaultLng, defaultLat],
      zoom: 15,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const marker = new maplibregl.Marker({
      draggable: true,
      color: '#991B1B',
    })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setPosition({ lat: lngLat.lat, lng: lngLat.lng });
    });

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      setPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Pin Manual Location
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click anywhere on the map or drag the pin to set the exact property position
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map View */}
        <div className="relative flex-1 bg-gray-100">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Footer with Coords & Action Buttons */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-gray-500">Selected GPS Address: </span>
            <span className="font-mono font-medium text-gray-900">
              {formatCoordinates(position.lat, position.lng)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(position.lat, position.lng)}
              className="flex-1 sm:flex-none px-5 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Confirm Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
