import { query } from '../config/database.js';

/**
 * Build a PostGIS Point geometry SQL fragment with parameterized inputs.
 * Note: PostGIS ST_MakePoint takes (longitude, latitude) — X, Y order.
 *
 * @param {number} lat - Latitude (Y coordinate)
 * @param {number} lng - Longitude (X coordinate)
 * @returns {{ sql: string, params: [number, number] }} SQL fragment and parameters
 */
export function buildPoint(lat, lng) {
  return {
    sql: 'ST_SetSRID(ST_MakePoint($1, $2), 4326)',
    params: [lng, lat],
  };
}

/**
 * Find the zone that contains a given GPS point using PostGIS ST_Contains.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} Zone ID or null if point is not in any zone
 */
export async function findZoneForPoint(lat, lng) {
  const result = await query(
    `SELECT id FROM zones
     WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
     LIMIT 1`,
    [lng, lat]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Find records within a given radius of a GPS point using PostGIS ST_DWithin.
 * Uses geography cast for accurate metre-based distance calculations.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMeters - Search radius in metres
 * @param {number} [limit=50] - Maximum number of results
 * @returns {Promise<Array>} Array of nearby records with distance in metres
 */
export async function findNearbyRecords(lat, lng, radiusMeters, limit = 50) {
  const result = await query(
    `SELECT
       r.id, r.module, r.latitude, r.longitude, r.owner_name, r.status,
       r.ghana_post_address, r.created_at,
       ST_Distance(
         r.location::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       ) AS distance_m
     FROM records r
     WHERE ST_DWithin(
       r.location::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )
     ORDER BY distance_m ASC
     LIMIT $4`,
    [lng, lat, radiusMeters, limit]
  );
  return result.rows;
}

/**
 * Check whether a GPS point falls inside a specific zone.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} zoneId - UUID of the zone to check
 * @returns {Promise<boolean>} True if the point is inside the zone
 */
export async function isPointInZone(lat, lng, zoneId) {
  const result = await query(
    `SELECT EXISTS(
       SELECT 1 FROM zones
       WHERE id = $1
         AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
     ) AS is_inside`,
    [zoneId, lng, lat]
  );
  return result.rows[0].is_inside;
}
