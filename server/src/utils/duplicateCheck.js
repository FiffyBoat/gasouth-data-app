import { query } from '../config/database.js';

/**
 * Check for potential duplicate records near a GPS point with fuzzy name matching.
 * Uses PostGIS ST_DWithin for spatial proximity (20m default) and pg_trgm
 * similarity() for fuzzy owner name matching (threshold 0.3).
 *
 * @param {number} lat - Latitude of the new record
 * @param {number} lng - Longitude of the new record
 * @param {string} ownerName - Owner name to match against
 * @param {string|null} [excludeId=null] - Record ID to exclude (for updates)
 * @param {number} [radiusMeters=20] - Spatial proximity radius in metres
 * @param {number} [similarityThreshold=0.3] - Trigram similarity threshold (0–1)
 * @returns {Promise<Array>} Array of potential duplicates with distance and similarity score
 */
export async function checkDuplicates(
  lat,
  lng,
  ownerName,
  excludeId = null,
  radiusMeters = 20,
  similarityThreshold = 0.3
) {
  if (!ownerName || ownerName.trim().length === 0) {
    return [];
  }

  const params = [lng, lat, radiusMeters, ownerName, similarityThreshold];
  let excludeClause = '';

  if (excludeId) {
    excludeClause = 'AND r.id != $6';
    params.push(excludeId);
  }

  const result = await query(
    `SELECT
       r.id,
       r.module,
       r.latitude,
       r.longitude,
       r.owner_name,
       r.owner_phone,
       r.ghana_post_address,
       r.status,
       r.created_at,
       ST_Distance(
         r.location::geography,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       ) AS distance_m,
       similarity(r.owner_name, $4) AS name_similarity
     FROM records r
     WHERE ST_DWithin(
       r.location::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )
     AND r.owner_name IS NOT NULL
     AND similarity(r.owner_name, $4) > $5
     ${excludeClause}
     ORDER BY name_similarity DESC, distance_m ASC
     LIMIT 10`,
    params
  );

  return result.rows;
}
