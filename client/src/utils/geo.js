/**
 * @module utils/geo
 * @description Geospatial utility functions for coordinate formatting,
 * accuracy classification, and distance calculation.
 */

/**
 * Formats latitude and longitude into a human-readable string using
 * degree notation with N/S and E/W suffixes.
 * @param {number} lat - Latitude in decimal degrees
 * @param {number} lng - Longitude in decimal degrees
 * @returns {string} Formatted coordinate string, e.g. "5.5913°N, 0.2217°W"
 */
export function formatCoordinates(lat, lng) {
  if (lat == null || lng == null) return '—';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Formats an accuracy value in meters into a human-readable string
 * with a quality descriptor.
 * @param {number} meters - Accuracy in meters
 * @returns {string} Formatted accuracy string, e.g. "±8m (Excellent)"
 */
export function formatAccuracy(meters) {
  if (meters == null) return '—';
  const rounded = Math.round(meters);
  const level = getAccuracyLevel(meters);
  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair — consider re-capturing',
    poor: 'Poor — re-capture recommended',
  };
  return `±${rounded}m (${labels[level]})`;
}

/**
 * Classifies GPS accuracy into a quality level.
 * @param {number} meters - Accuracy in meters
 * @returns {'excellent'|'good'|'fair'|'poor'} Accuracy quality level
 */
export function getAccuracyLevel(meters) {
  if (meters == null) return 'poor';
  if (meters < 10) return 'excellent';
  if (meters < 15) return 'good';
  if (meters <= 30) return 'fair';
  return 'poor';
}

/**
 * Returns a Tailwind CSS color class for the given accuracy in meters.
 * @param {number} meters - Accuracy in meters
 * @returns {string} Tailwind color class name
 */
export function getAccuracyColor(meters) {
  const level = getAccuracyLevel(meters);
  const colors = {
    excellent: 'text-emerald-600',
    good: 'text-emerald-500',
    fair: 'text-amber-500',
    poor: 'text-red-500',
  };
  return colors[level];
}

/**
 * Returns a Tailwind CSS background color class for the given accuracy.
 * @param {number} meters - Accuracy in meters
 * @returns {string} Tailwind background color class name
 */
export function getAccuracyBgColor(meters) {
  const level = getAccuracyLevel(meters);
  const colors = {
    excellent: 'bg-emerald-100 text-emerald-800',
    good: 'bg-emerald-50 text-emerald-700',
    fair: 'bg-amber-100 text-amber-800',
    poor: 'bg-red-100 text-red-800',
  };
  return colors[level];
}

/**
 * Calculates the distance in meters between two geographic points
 * using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Status color map used across the app for consistent badge styling */
export const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  flagged: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
};

/** Module labels and icons */
export const MODULE_META = {
  property: { label: 'Property', icon: '🏠' },
  business: { label: 'Business', icon: '🏪' },
  market_stall: { label: 'Market Stall', icon: '🏬' },
};
