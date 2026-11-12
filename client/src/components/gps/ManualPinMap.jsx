import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapPin, Check, X, Layers, Navigation, AlertCircle } from 'lucide-react';
import { formatCoordinates } from '../../utils/geo';

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
      attribution: '&copy; Google Satellite Imagery',
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

export default function ManualPinMap({ initialLat, initialLng, onConfirm, onCancel }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [isSatellite, setIsSatellite] = useState(true); // default to satellite so roofs/compounds are visible

  const defaultLat = initialLat || 5.5350;
  const defaultLng = initialLng || -0.4285;

  const [position, setPosition] = useState({ lat: defaultLat, lng: defaultLng });
  const [inputLat, setInputLat] = useState(defaultLat.toFixed(6));
  const [inputLng, setInputLng] = useState(defaultLng.toFixed(6));
  const [coordError, setCoordError] = useState(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: isSatellite ? SATELLITE_HYBRID_STYLE : STREET_STYLE,
      center: [defaultLng, defaultLat],
      zoom: 16,
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
      setInputLat(lngLat.lat.toFixed(6));
      setInputLng(lngLat.lng.toFixed(6));
      setCoordError(null);
    });

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      setPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setInputLat(e.lngLat.lat.toFixed(6));
      setInputLng(e.lngLat.lng.toFixed(6));
      setCoordError(null);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
    };
  }, []);

  const handleToggleLayer = () => {
    const next = !isSatellite;
    setIsSatellite(next);
    if (mapRef.current) {
      mapRef.current.setStyle(next ? SATELLITE_HYBRID_STYLE : STREET_STYLE);
    }
  };

  const handleJumpToCoords = (e) => {
    if (e) e.preventDefault();
    setCoordError(null);

    // Support combined paste e.g. "5.5350, -0.4285" in either input
    let latVal = String(inputLat).trim();
    let lngVal = String(inputLng).trim();

    if (latVal.includes(',') || latVal.includes(' ')) {
      const parts = latVal.split(/[,\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        latVal = parts[0];
        lngVal = parts[1];
        setInputLat(latVal);
        setInputLng(lngVal);
      }
    }

    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);

    if (isNaN(lat) || isNaN(lng)) {
      setCoordError('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCoordError('Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    // Friendly sanity check for Ghana region (Lat: 4.5 to 11.5, Lng: -3.5 to 1.5)
    if (lat < 4.5 || lat > 11.5 || lng < -3.5 || lng > 1.5) {
      setCoordError('Note: These coordinates appear outside Ghana. Pin moved, but please verify.');
    }

    setPosition({ lat, lng });

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
        essential: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl h-[88vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <MapPin className="w-5 h-5 text-primary-600" />
              Pin Property Location on Map
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click anywhere on the map, drag the red pin, or type exact coordinates below.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Coordinate Input Bar */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs">
          <form onSubmit={handleJumpToCoords} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-gray-700 font-semibold shrink-0">
              <Navigation className="w-3.5 h-3.5 text-primary-600" />
              <span>Type / Paste Coordinates:</span>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Latitude (e.g. 5.5350)"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Longitude (e.g. -0.4285)"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold shrink-0 transition-colors shadow-2xs"
              >
                Jump Pin
              </button>
            </div>
          </form>

          {coordError && (
            <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{coordError}</span>
            </div>
          )}
        </div>

        {/* Map View */}
        <div className="relative flex-1 bg-gray-100">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Layer switcher */}
          <button
            type="button"
            onClick={handleToggleLayer}
            className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-white/95 backdrop-blur-sm hover:bg-white text-gray-800 rounded-xl shadow-md border border-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-primary-600" />
            <span>{isSatellite ? 'Street Map' : 'Satellite (Roofs & Roads)'}</span>
          </button>
        </div>

        {/* Footer with Coords & Action Buttons */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-gray-500">Selected GPS Location: </span>
            <span className="font-mono font-bold text-gray-900 text-sm">
              {formatCoordinates(position.lat, position.lng)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(position.lat, position.lng)}
              className="flex-1 sm:flex-none px-5 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
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
