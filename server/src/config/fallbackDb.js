import { v4 as uuidv4 } from 'uuid';

/**
 * High-fidelity in-memory spatial database fallback.
 * Allows the entire application (GPS capture, maps, review workflow, dashboards, auth)
 * to run immediately without requiring local Docker or PostgreSQL installation.
 */

// Haversine formula for distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Trigram similarity for fuzzy duplicate matching
function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.8;
  return 0;
}

export const dbState = {
  users: [
    {
      id: 'usr-admin-01',
      username: 'admin',
      email: 'admin@zebrarms.app',
      password_hash: '$2a$10$5bQ3OGlWgWMKty7EjlxGoez1GqHNWHET6Z9Vh3EhGYBRDoYZ0vkXi', // admin123
      role: 'admin',
      full_name: 'System Administrator',
      phone: '0200000000',
      assigned_zone_id: null,
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'usr-super-01',
      username: 'supervisor1',
      email: 'supervisor@zebrarms.app',
      password_hash: '$2a$10$qHgTAucY6Dm0Yoe9P4vetulm4zHTLsY4NCUZv6ik6A88H5SgZ5iWq', // super123
      role: 'supervisor',
      full_name: 'Kwame Asante',
      phone: '0241234567',
      assigned_zone_id: 'zone-amanfro-01',
      is_active: true,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'usr-collect-01',
      username: 'collector1',
      email: 'collector@zebrarms.app',
      password_hash: '$2a$10$xQb1nK/eFbGvbLoXVKmk7uYTxyHvuYHx0iC7/veg5xbBOswby7qU2', // collect123
      role: 'collector',
      full_name: 'Ama Darko',
      phone: '0271234567',
      assigned_zone_id: 'zone-amanfro-01',
      is_active: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'usr-budget-01',
      username: 'budget_director',
      email: 'budget@zebrarms.app',
      password_hash: '$2a$10$A7GrSJWrk9bdXQ.g.58n4.h6Ob0NczFLDyHg2qwVJ6Mh/zFjYue4u', // budget123
      role: 'budget_director',
      full_name: 'Dr. Emmanuel Baah',
      phone: '0245678901',
      assigned_zone_id: null,
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ],
  zones: [
    {
      id: 'zone-amanfro-01',
      name: 'Ngleshie Amanfro Central',
      code: 'GS-AM-001',
      target_count: 500,
      min_lat: 5.518,
      max_lat: 5.545,
      min_lng: -0.420,
      max_lng: -0.380,
      boundary_geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.420, 5.518],
            [-0.380, 5.518],
            [-0.380, 5.545],
            [-0.420, 5.545],
            [-0.420, 5.518],
          ],
        ],
      },
    },
    {
      id: 'zone-kasoa-02',
      name: 'Kasoa New Market & Interchange',
      code: 'AW-KS-002',
      target_count: 750,
      min_lat: 5.520,
      max_lat: 5.555,
      min_lng: -0.450,
      max_lng: -0.415,
      boundary_geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.450, 5.520],
            [-0.415, 5.520],
            [-0.415, 5.555],
            [-0.450, 5.555],
            [-0.450, 5.520],
          ],
        ],
      },
    },
    {
      id: 'zone-galilea-03',
      name: 'Galilea - Iron City Enclave',
      code: 'GS-GL-003',
      target_count: 650,
      min_lat: 5.525,
      max_lat: 5.558,
      min_lng: -0.400,
      max_lng: -0.365,
      boundary_geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.400, 5.525],
            [-0.365, 5.525],
            [-0.365, 5.558],
            [-0.400, 5.558],
            [-0.400, 5.525],
          ],
        ],
      },
    },
  ],
  records: [
    {
      id: 'rec-001',
      module: 'property',
      latitude: 5.5312,
      longitude: -0.4024,
      altitude: 42.0,
      accuracy_m: 5.4,
      capture_method: 'device-gps',
      ghana_post_address: 'GS-0124-8891',
      owner_name: 'Amanfro Royal Heritage Plaza',
      owner_phone: '0244111222',
      attributes: {
        upn: '05-012-004-001',
        property_address: 'Hse No. AM-42/3, Winneba - Kasoa Main Highway',
        valuation_number: 'VAL-2024-GS-104',
        use_code: 'COM-2',
        rateable_value: '450000',
        rate_impost: '0.005',
        groups: 'commercial_entity',
        landmark: 'Adjacent Amanfro Toll Booth / Total Station',
        street_name: 'Winneba - Kasoa Highway',
        collection_area: 'Ngleshie Amanfro',
        sub_collection_area: 'Amanfro Town Sector',
      },
      status: 'approved',
      zone_id: 'zone-amanfro-01',
      created_by: 'usr-collect-01',
      reviewed_by: 'usr-super-01',
      review_comment: 'Reviewed by Data Supervisor and Final Approval by Budget Director.',
      review_time: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'rec-002',
      module: 'business',
      latitude: 5.5345,
      longitude: -0.4289,
      altitude: 38.5,
      accuracy_m: 6.8,
      capture_method: 'device-gps',
      ghana_post_address: 'AW-054-3201',
      owner_name: 'Kasoa Interchange Super Buka & Catering',
      owner_phone: '0209876543',
      attributes: {
        business_type: 'sole_proprietorship',
        business_category: 'hospitality_food',
        services_provided: 'Local Ghanaian dishes, banku, fufu, catering & cold drinks',
        property_address: 'Shop 12, Ground Floor, Kasoa New Market Road',
        upn: '05-012-004-002',
        groups: 'traders_association',
        landmark: 'Near Kasoa Overhead Bridge',
        street_name: 'Kasoa - Bawjiase Road',
        collection_area: 'Kasoa Central',
        sub_collection_area: 'Interchange Commercial Sector',
      },
      status: 'submitted',
      zone_id: 'zone-kasoa-02',
      created_by: 'usr-collect-01',
      reviewed_by: null,
      review_comment: null,
      review_time: null,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'rec-003',
      module: 'market_stall',
      latitude: 5.5380,
      longitude: -0.4320,
      altitude: 35.0,
      accuracy_m: 8.5,
      capture_method: 'averaged',
      ghana_post_address: 'AW-082-1400',
      owner_name: 'Auntie Mary Fabric & Textile Stalls',
      owner_phone: '0551239876',
      attributes: {
        market_name: 'Kasoa New Market Enclave',
        stall_number: 'Shed C-42',
        commodity: 'Kente, Holland Wax & Local Textiles',
        rent_category: 'daily_toll',
      },
      status: 'draft',
      zone_id: 'zone-kasoa-02',
      created_by: 'usr-collect-01',
      reviewed_by: null,
      review_comment: null,
      review_time: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rec-004',
      module: 'property',
      latitude: 5.5398,
      longitude: -0.3845,
      altitude: 45.2,
      accuracy_m: 5.9,
      capture_method: 'device-gps',
      ghana_post_address: 'GS-0199-7712',
      owner_name: 'Galilea Heights Commercial Complex',
      owner_phone: '0244998877',
      attributes: {
        upn: '05-012-008-015',
        property_address: 'Plot 18, Galilea Station Link',
        valuation_number: 'VAL-2024-GS-215',
        use_code: 'COM-1',
        rateable_value: '380000',
        rate_impost: '0.005',
        groups: 'commercial_entity',
        landmark: 'Opposite Galilea Market / Police Post',
        street_name: 'Old Barrier - Galilea Road',
        collection_area: 'Galilea',
        sub_collection_area: 'Iron City Sector',
      },
      status: 'reviewed',
      zone_id: 'zone-galilea-03',
      created_by: 'usr-collect-01',
      reviewed_by: 'usr-super-01',
      review_comment: 'Field data and GPS location verified by Data Supervisor. Ready for Budget Director endorsement.',
      review_time: new Date().toISOString(),
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  photos: [
    {
      id: 'p-001',
      record_id: 'rec-001',
      file_path: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
      thumbnail_path: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=200&q=80',
      original_name: 'plaza_front.jpg',
      size_bytes: 421000,
      mime_type: 'image/jpeg',
      sort_order: 0,
      uploaded_at: new Date().toISOString(),
    },
    {
      id: 'p-002',
      record_id: 'rec-002',
      file_path: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      thumbnail_path: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      original_name: 'chopbar_signboard.jpg',
      size_bytes: 389000,
      mime_type: 'image/jpeg',
      sort_order: 0,
      uploaded_at: new Date().toISOString(),
    },
    {
      id: 'p-003',
      record_id: 'rec-004',
      file_path: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      thumbnail_path: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80',
      original_name: 'galilea_complex_front.jpg',
      size_bytes: 512000,
      mime_type: 'image/jpeg',
      sort_order: 0,
      uploaded_at: new Date().toISOString(),
    },
    {
      id: 'p-004',
      record_id: 'rec-004',
      file_path: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      thumbnail_path: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
      original_name: 'building_side_elevation.jpg',
      size_bytes: 480000,
      mime_type: 'image/jpeg',
      sort_order: 1,
      uploaded_at: new Date().toISOString(),
    },
  ],
  audit_log: [
    {
      id: 1,
      user_id: 'usr-super-01',
      action: 'status_change',
      entity_type: 'record',
      entity_id: 'rec-001',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 2,
      user_id: 'usr-collect-01',
      action: 'create',
      entity_type: 'record',
      entity_id: 'rec-002',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ],
  record_versions: [],
};

export function filterRecordsBySql(records, sql, params = []) {
  let filtered = [...records];

  // Match r.module = $k or module = $k
  const moduleMatch = sql.match(/(?:r\.)?module\s*=\s*\$(\d+)/i);
  if (moduleMatch) {
    const idx = parseInt(moduleMatch[1], 10) - 1;
    const val = params[idx];
    if (val && val !== '') {
      filtered = filtered.filter((r) => r.module === val);
    }
  }

  // Match r.status = $k or status = $k
  const statusMatch = sql.match(/(?:r\.)?status\s*=\s*\$(\d+)/i);
  if (statusMatch) {
    const idx = parseInt(statusMatch[1], 10) - 1;
    const val = params[idx];
    if (val && val !== '') {
      filtered = filtered.filter((r) => r.status === val);
    }
  }

  // Match r.zone_id = $k or zone_id = $k
  const zoneMatch = sql.match(/(?:r\.)?zone_id\s*=\s*\$(\d+)/i);
  if (zoneMatch) {
    const idx = parseInt(zoneMatch[1], 10) - 1;
    const val = params[idx];
    if (val && val !== '') {
      filtered = filtered.filter((r) => r.zone_id === val);
    }
  }

  // Match r.created_by = $k or created_by = $k
  const creatorMatch = sql.match(/(?:r\.)?created_by\s*=\s*\$(\d+)/i);
  if (creatorMatch) {
    const idx = parseInt(creatorMatch[1], 10) - 1;
    const val = params[idx];
    if (val && val !== '') {
      filtered = filtered.filter((r) => r.created_by === val);
    }
  }

  // Match start date: r.created_at >= $k
  const startMatch = sql.match(/(?:r\.)?created_at\s*>=\s*\$(\d+)/i);
  if (startMatch) {
    const idx = parseInt(startMatch[1], 10) - 1;
    const val = params[idx];
    if (val) {
      const d = new Date(val).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() >= d);
    }
  }

  // Match end date: r.created_at <= $k
  const endMatch = sql.match(/(?:r\.)?created_at\s*<=\s*\$(\d+)/i);
  if (endMatch) {
    const idx = parseInt(endMatch[1], 10) - 1;
    const val = params[idx];
    if (val) {
      const d = new Date(val).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() <= d);
    }
  }

  // Match search (ILIKE $k)
  const searchMatch = sql.match(/ILIKE\s*\$(\d+)/i);
  if (searchMatch) {
    const idx = parseInt(searchMatch[1], 10) - 1;
    const rawVal = params[idx];
    if (rawVal) {
      const term = String(rawVal).replace(/%/g, '').toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((r) => {
          const owner = (r.owner_name || '').toLowerCase();
          const phone = (r.owner_phone || '').toLowerCase();
          const gp = (r.ghana_post_address || '').toLowerCase();
          const id = (r.id || '').toLowerCase();
          const a = r.attributes || {};
          const landmark = (a.landmark || '').toLowerCase();
          const street = (a.street_name || '').toLowerCase();
          const upn = (a.upn || '').toLowerCase();
          const bType = (a.business_type || '').toLowerCase();
          const bCat = (a.business_category || '').toLowerCase();
          const group = (a.groups || '').toLowerCase();
          const propAddr = (a.property_address || '').toLowerCase();
          const valNum = (a.valuation_number || '').toLowerCase();
          const ratepayer = (a.ratepayer_name || '').toLowerCase();

          return (
            owner.includes(term) ||
            phone.includes(term) ||
            gp.includes(term) ||
            id.includes(term) ||
            landmark.includes(term) ||
            street.includes(term) ||
            upn.includes(term) ||
            bType.includes(term) ||
            bCat.includes(term) ||
            group.includes(term) ||
            propAddr.includes(term) ||
            valNum.includes(term) ||
            ratepayer.includes(term)
          );
        });
      }
    }
  }

  return filtered;
}

export async function executeFallbackQuery(sqlText, params = []) {
  const sql = sqlText.trim().replace(/\s+/g, ' ');

  // Transaction statements
  if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
    return { rows: [], rowCount: 0 };
  }

  // 1. Auth: Find user by username
  if (sql.includes('FROM users u') && sql.includes('WHERE u.username = $1')) {
    const user = dbState.users.find((u) => u.username === params[0]);
    if (!user) return { rows: [], rowCount: 0 };
    const zone = dbState.zones.find((z) => z.id === user.assigned_zone_id);
    return {
      rows: [{ ...user, zone_name: zone ? zone.name : null }],
      rowCount: 1,
    };
  }

  // 2. Auth: Find user by id
  if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
    const user = dbState.users.find((u) => u.id === params[0]);
    if (!user) return { rows: [], rowCount: 0 };
    const zone = dbState.zones.find((z) => z.id === user.assigned_zone_id);
    return {
      rows: [{ ...user, zone_name: zone ? zone.name : null }],
      rowCount: 1,
    };
  }

  // 3. User by ID direct
  if (sql.includes('FROM users') && (sql.includes('WHERE id = $1') || sql.includes('WHERE u.id = $1'))) {
    const user = dbState.users.find((u) => u.id === params[0]);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  // 4. List users
  if (sql.includes('FROM users u') && sql.includes('GROUP BY u.id')) {
    const list = dbState.users.map((u) => {
      const zone = dbState.zones.find((z) => z.id === u.assigned_zone_id);
      const count = dbState.records.filter((r) => r.created_by === u.id).length;
      return {
        ...u,
        zone_name: zone ? zone.name : null,
        records_captured: count,
      };
    });
    return { rows: list, rowCount: list.length };
  }

  // 5. Create user
  if (sql.includes('INSERT INTO users')) {
    const newUser = {
      id: uuidv4(),
      username: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3],
      full_name: params[4],
      phone: params[5],
      assigned_zone_id: params[6] || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbState.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 6. Toggle user active status
  if (sql.includes('UPDATE users SET is_active = $1')) {
    const user = dbState.users.find((u) => u.id === params[1]);
    if (user) {
      user.is_active = params[0];
      return { rows: [user], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 6b. Update user details
  if (sql.includes('UPDATE users SET') && sql.includes('full_name = $2')) {
    const userId = params[5]; // $6 in query
    const user = dbState.users.find((u) => u.id === userId);
    if (user) {
      user.email = params[0] || null;
      user.full_name = params[1];
      user.phone = params[2] || null;
      user.role = params[3];
      user.assigned_zone_id = params[4] || null;
      if (params.length > 6 && params[6]) {
        user.password_hash = params[6];
      }
      user.updated_at = new Date().toISOString();
      return { rows: [user], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 6c. Delete user
  if (sql.includes('DELETE FROM users WHERE id = $1')) {
    dbState.users = dbState.users.filter((u) => u.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }

  // 6d. Count records by user
  if (sql.includes('SELECT COUNT(*) FROM records WHERE created_by = $1')) {
    const cnt = dbState.records.filter((r) => r.created_by === params[0]).length;
    return { rows: [{ count: cnt }], rowCount: 1 };
  }

  // 7. Check username unique
  if (sql.includes('SELECT id FROM users WHERE username = $1')) {
    const user = dbState.users.find((u) => u.username === params[0]);
    return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 };
  }

  // 8. Find zone for point (point-in-bounding-box fallback)
  if (sql.includes('SELECT id FROM zones WHERE ST_Contains')) {
    const lng = params[0];
    const lat = params[1];
    const found = dbState.zones.find(
      (z) => lat >= z.min_lat && lat <= z.max_lat && lng >= z.min_lng && lng <= z.max_lng
    );
    return { rows: found ? [{ id: found.id }] : [], rowCount: found ? 1 : 0 };
  }

  // 9. Zone contains lookup
  if (sql.includes('FROM zones WHERE ST_Contains')) {
    const lng = params[0];
    const lat = params[1];
    const found = dbState.zones.find(
      (z) => lat >= z.min_lat && lat <= z.max_lat && lng >= z.min_lng && lng <= z.max_lng
    );
    return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
  }

  // Zone by ID
  if (sql.includes('FROM zones') && (sql.includes('WHERE z.id = $1') || sql.includes('WHERE id = $1'))) {
    const zone = dbState.zones.find((z) => z.id === params[0]);
    if (!zone) return { rows: [], rowCount: 0 };
    const records = dbState.records.filter((r) => r.zone_id === zone.id);
    return {
      rows: [
        {
          ...zone,
          record_count: records.length,
          approved_count: records.filter((r) => r.status === 'approved').length,
        },
      ],
      rowCount: 1,
    };
  }

  // 10. List zones
  if (sql.includes('FROM zones z') && !sql.includes('coverage_pct') && !sql.includes('ORDER BY record_count DESC')) {
    const list = dbState.zones.map((z) => {
      const records = dbState.records.filter((r) => r.zone_id === z.id);
      const approved = records.filter((r) => r.status === 'approved').length;
      return {
        id: z.id,
        name: z.name,
        code: z.code,
        target_count: z.target_count,
        min_lat: z.min_lat,
        max_lat: z.max_lat,
        min_lng: z.min_lng,
        max_lng: z.max_lng,
        boundary_geojson: z.boundary_geojson,
        created_at: z.created_at,
        updated_at: z.updated_at,
        record_count: records.length,
        approved_count: approved,
      };
    });
    return { rows: list, rowCount: list.length };
  }

  // 11. Create zone
  if (sql.includes('INSERT INTO zones')) {
    const newZone = {
      id: uuidv4(),
      name: params[0],
      code: params[1],
      target_count: params[2] || 0,
      min_lat: 5.5,
      max_lat: 5.7,
      min_lng: -0.3,
      max_lng: 0.1,
      boundary_geojson: null,
      created_at: new Date().toISOString(),
    };
    dbState.zones.push(newZone);
    return { rows: [newZone], rowCount: 1 };
  }

  // 11b. Update zone
  if (sql.includes('UPDATE zones')) {
    const name = params[0];
    const code = params[1];
    const targetCount = params[2] || 0;
    const id = params[3];
    const zone = dbState.zones.find((z) => z.id === id);
    if (!zone) return { rows: [], rowCount: 0 };
    zone.name = name;
    zone.code = code;
    zone.target_count = targetCount;
    zone.updated_at = new Date().toISOString();
    return { rows: [zone], rowCount: 1 };
  }

  // 12. Delete zone
  if (sql.includes('DELETE FROM zones WHERE id = $1')) {
    dbState.zones = dbState.zones.filter((z) => z.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }

  // 13. Check duplicates
  if (sql.includes('similarity(r.owner_name, $4)')) {
    const lng = params[0];
    const lat = params[1];
    const radius = params[2];
    const owner = params[3];
    const excludeId = params[5] || null;

    const duplicates = dbState.records
      .filter((r) => r.id !== excludeId && r.owner_name)
      .map((r) => {
        const dist = haversineMeters(lat, lng, r.latitude, r.longitude);
        const sim = stringSimilarity(owner, r.owner_name);
        return { ...r, distance_m: Math.round(dist), name_similarity: sim };
      })
      .filter((r) => r.distance_m <= radius && r.name_similarity > 0.3);

    return { rows: duplicates, rowCount: duplicates.length };
  }

  // 14. Find nearby records
  if (sql.includes('ST_DWithin') && sql.includes('FROM records r')) {
    const lng = params[0];
    const lat = params[1];
    const radius = params[2];

    const nearby = dbState.records
      .map((r) => {
        const dist = haversineMeters(lat, lng, r.latitude, r.longitude);
        return { ...r, distance_m: Math.round(dist) };
      })
      .filter((r) => r.distance_m <= radius)
      .sort((a, b) => a.distance_m - b.distance_m);

    return { rows: nearby, rowCount: nearby.length };
  }

  // 15. Record count (evaluates all query filters, excluding dashboard total_records query)
  if (
    sql.includes('SELECT COUNT(*)') &&
    !sql.includes('as total_records') &&
    (sql.includes('FROM records') || sql.includes('FROM records r'))
  ) {
    if (sql.includes('WHERE zone_id = $1')) {
      const cnt = dbState.records.filter((r) => r.zone_id === params[0]).length;
      return { rows: [{ count: cnt }], rowCount: 1 };
    }
    const filtered = filterRecordsBySql(dbState.records, sql, params);
    return { rows: [{ count: filtered.length }], rowCount: 1 };
  }

  // 16. Record detail by id (matches with or without table alias r)
  if (
    (sql.includes('FROM records') || sql.includes('FROM records r')) &&
    (sql.includes('WHERE r.id = $1') || sql.includes('WHERE id = $1'))
  ) {
    const record = dbState.records.find((r) => r.id === params[0]);
    if (!record) return { rows: [], rowCount: 0 };

    const zone = dbState.zones.find((z) => z.id === record.zone_id);
    const creator = dbState.users.find((u) => u.id === record.created_by);
    const reviewer = dbState.users.find((u) => u.id === record.reviewed_by);

    return {
      rows: [
        {
          ...record,
          zone_name: zone ? zone.name : null,
          created_by_name: creator ? creator.full_name : null,
          reviewed_by_name: reviewer ? reviewer.full_name : null,
        },
      ],
      rowCount: 1,
    };
  }

  // 17. Single photo with record join
  if (sql.includes('FROM photos p') && sql.includes('JOIN records r') && sql.includes('WHERE p.id = $1')) {
    const photo = dbState.photos.find((p) => p.id === params[0]);
    if (!photo) return { rows: [], rowCount: 0 };
    const rec = dbState.records.find((r) => r.id === photo.record_id);
    return {
      rows: [
        {
          ...photo,
          created_by: rec ? rec.created_by : null,
          status: rec ? rec.status : null,
        },
      ],
      rowCount: 1,
    };
  }

  // 17a. Count photos for record (must precede 17b because both contain FROM photos and WHERE record_id = $1)
  if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM photos') && sql.includes('WHERE record_id = $1')) {
    const count = dbState.photos.filter((p) => p.record_id === params[0]).length;
    return { rows: [{ count }], rowCount: 1 };
  }

  // 17b. Record photos list
  if (sql.includes('FROM photos') && sql.includes('WHERE record_id = $1')) {
    const photos = dbState.photos.filter((p) => p.record_id === params[0]);
    return { rows: photos, rowCount: photos.length };
  }

  // 17c. Insert photo
  if (sql.includes('INSERT INTO photos')) {
    const newPhoto = {
      id: uuidv4(),
      record_id: params[0],
      file_path: params[1],
      thumbnail_path: params[2],
      original_name: params[3],
      size_bytes: params[4],
      mime_type: params[5],
      sort_order: params[6] || 0,
      uploaded_at: new Date().toISOString(),
    };
    dbState.photos.push(newPhoto);
    return { rows: [newPhoto], rowCount: 1 };
  }

  // 17d. Delete photo
  if (sql.includes('DELETE FROM photos WHERE id = $1')) {
    dbState.photos = dbState.photos.filter((p) => p.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }

  // 18. Record version number calculation
  if (sql.includes('MAX(version_number)')) {
    const recordId = params[0];
    const versions = dbState.record_versions.filter((v) => v.record_id === recordId);
    const maxV = versions.reduce((m, v) => Math.max(m, v.version_number || 0), 0);
    return { rows: [{ next_v: maxV + 1 }], rowCount: 1 };
  }

  // 18b. Insert record version
  if (sql.includes('INSERT INTO record_versions')) {
    const isThree = params.length === 3;
    const recId = params[0];
    const vNum = isThree ? 1 : params[1];
    const rawData = isThree ? params[1] : params[2];
    const changedBy = isThree ? params[2] : params[3];
    let parsedData = {};
    try {
      parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (e) {
      parsedData = rawData;
    }
    const newV = {
      id: dbState.record_versions.length + 1,
      record_id: recId,
      version_number: vNum,
      data: parsedData,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
    };
    dbState.record_versions.push(newV);
    return { rows: [newV], rowCount: 1 };
  }

  // 18c. Record versions list
  if (sql.includes('FROM record_versions')) {
    const versions = dbState.record_versions.filter((v) => v.record_id === params[0]);
    return { rows: versions, rowCount: versions.length };
  }

  // 19. List records (evaluates filters and applies LIMIT/OFFSET)
  if (sql.includes('FROM records') && (sql.includes('GROUP BY') || sql.includes('ORDER BY r.created_at') || sql.includes('ORDER BY created_at'))) {
    let filtered = filterRecordsBySql(dbState.records, sql, params);

    // Apply limit & offset if present
    const limitMatch = sql.match(/LIMIT\s*\$(\d+)/i);
    const offsetMatch = sql.match(/OFFSET\s*\$(\d+)/i);
    if (limitMatch && offsetMatch) {
      const limitVal = parseInt(params[parseInt(limitMatch[1], 10) - 1], 10);
      const offsetVal = parseInt(params[parseInt(offsetMatch[1], 10) - 1], 10);
      if (!isNaN(limitVal) && !isNaN(offsetVal)) {
        filtered = filtered.slice(offsetVal, offsetVal + limitVal);
      }
    }

    const list = filtered.map((r) => {
      const zone = dbState.zones.find((z) => z.id === r.zone_id);
      const creator = dbState.users.find((u) => u.id === r.created_by);
      const reviewer = dbState.users.find((u) => u.id === r.reviewed_by);
      const recordPhotos = dbState.photos.filter((p) => p.record_id === r.id);

      return {
        ...r,
        zone_name: zone ? zone.name : null,
        created_by_name: creator ? creator.full_name : null,
        reviewed_by_name: reviewer ? reviewer.full_name : null,
        photo_count: recordPhotos.length,
        photos: recordPhotos,
      };
    });

    return { rows: list, rowCount: list.length };
  }

  // 20. Insert record
  if (sql.includes('INSERT INTO records')) {
    const newRecord = {
      id: uuidv4(),
      module: params[0],
      longitude: params[1],
      latitude: params[2],
      altitude: params[3],
      accuracy_m: params[4],
      capture_method: params[5],
      ghana_post_address: params[6],
      owner_name: params[7],
      owner_phone: params[8],
      owner_id_type: params[9],
      owner_id_number: params[10],
      attributes: typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11],
      status: params[12],
      zone_id: params[13],
      created_by: params[14],
      device_info: params[15],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbState.records.unshift(newRecord);
    return { rows: [newRecord], rowCount: 1 };
  }

  // 21. Update record
  if (sql.includes('UPDATE records SET')) {
    const recordId = params[params.length - 1];
    const record = dbState.records.find((r) => r.id === recordId);
    if (record) {
      if (sql.includes('status = $1')) {
        record.status = params[0];
        record.reviewed_by = params[1];
        record.review_comment = params[2];
        record.review_time = new Date().toISOString();
      } else if (sql.includes('attributes = $1') && !sql.includes('module =')) {
        // Budget Director attribute update (PATCH /attributes)
        const newAttrs = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
        record.attributes = newAttrs;
      } else {
        record.module = params[0];
        record.longitude = params[1];
        record.latitude = params[2];
        record.altitude = params[3];
        record.accuracy_m = params[4];
        record.capture_method = params[5];
        record.ghana_post_address = params[6];
        record.owner_name = params[7];
        record.owner_phone = params[8];
        record.owner_id_type = params[9];
        record.owner_id_number = params[10];
        record.attributes = typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11];
        record.zone_id = params[12];
      }
      record.updated_at = new Date().toISOString();
      return { rows: [record], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 21b. Delete record
  if (sql.includes('DELETE FROM records WHERE id = $1')) {
    dbState.records = dbState.records.filter((r) => r.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }

  // 21c. Count users by zone
  if (sql.includes('SELECT COUNT(*) FROM users WHERE assigned_zone_id = $1')) {
    const cnt = dbState.users.filter((u) => u.assigned_zone_id === params[0]).length;
    return { rows: [{ count: cnt }], rowCount: 1 };
  }

  // 21d. Count records by zone
  if (sql.includes('SELECT COUNT(*) FROM records WHERE zone_id = $1')) {
    const cnt = dbState.records.filter((r) => r.zone_id === params[0]).length;
    return { rows: [{ count: cnt }], rowCount: 1 };
  }

  // 22. Dashboard stats & Budget Intelligence
  if (sql.includes('COUNT(*)::int as total_records')) {
    const records = dbState.records;
    const approved = records.filter((r) => r.status === 'approved');
    const reviewed = records.filter((r) => r.status === 'reviewed');
    const submitted = records.filter((r) => r.status === 'submitted');
    const draft = records.filter((r) => r.status === 'draft');
    const rejected = records.filter((r) => r.status === 'rejected');
    const flagged = records.filter((r) => r.status === 'flagged');
    const props = records.filter((r) => r.module === 'property');
    const biz = records.filter((r) => r.module === 'business');
    const stalls = records.filter((r) => r.module === 'market_stall');
    const accuracies = records.map((r) => r.accuracy_m).filter((a) => a != null);
    const avgAcc = accuracies.length > 0 ? (accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(1) : 0;

    // Helper for revenue potential calculation based on Ghanaian local government rates
    const calcRev = (r) => {
      const a = r.attributes || {};
      if (r.module === 'property') {
        const val = parseFloat(a.rateable_value) || 0;
        const imp = parseFloat(a.rate_impost) || 0.005;
        return Math.round(val * imp);
      }
      if (r.module === 'business') {
        if (a.fee_amount) return parseFloat(a.fee_amount);
        const cat = (a.business_category || '').toLowerCase();
        if (cat.includes('hospitality') || cat.includes('food')) return 450;
        if (cat.includes('wholesale') || cat.includes('bank')) return 850;
        return 350;
      }
      if (r.module === 'market_stall') {
        return parseFloat(a.fee_amount) || 180;
      }
      return 100;
    };

    const approvedRevenue = approved.reduce((sum, r) => sum + calcRev(r), 0);
    const reviewedRevenue = reviewed.reduce((sum, r) => sum + calcRev(r), 0);
    const submittedRevenue = submitted.reduce((sum, r) => sum + calcRev(r), 0);
    const totalRateableValue = props.reduce((sum, r) => sum + (parseFloat(r.attributes?.rateable_value) || 0), 0);

    // Revenue by stream breakdown
    const propertyApprovedRev = props.filter((r) => r.status === 'approved').reduce((sum, r) => sum + calcRev(r), 0);
    const propertyPendingRev = props.filter((r) => r.status === 'reviewed' || r.status === 'submitted').reduce((sum, r) => sum + calcRev(r), 0);

    const bizApprovedRev = biz.filter((r) => r.status === 'approved').reduce((sum, r) => sum + calcRev(r), 0);
    const bizPendingRev = biz.filter((r) => r.status === 'reviewed' || r.status === 'submitted').reduce((sum, r) => sum + calcRev(r), 0);

    const stallApprovedRev = stalls.filter((r) => r.status === 'approved').reduce((sum, r) => sum + calcRev(r), 0);
    const stallPendingRev = stalls.filter((r) => r.status === 'reviewed' || r.status === 'submitted').reduce((sum, r) => sum + calcRev(r), 0);

    return {
      rows: [
        {
          total_records: records.length,
          approved_count: approved.length,
          reviewed_count: reviewed.length,
          submitted_count: submitted.length,
          pending_count: submitted.length + reviewed.length,
          draft_count: draft.length,
          rejected_count: rejected.length,
          flagged_count: flagged.length,
          property_count: props.length,
          business_count: biz.length,
          market_stall_count: stalls.length,
          avg_accuracy_m: avgAcc,
          // Budget & Revenue Intelligence Metrics
          approved_revenue_ghs: approvedRevenue,
          reviewed_revenue_ghs: reviewedRevenue,
          submitted_revenue_ghs: submittedRevenue,
          total_pipeline_revenue_ghs: reviewedRevenue + submittedRevenue,
          total_rateable_value_ghs: totalRateableValue,
          revenue_by_stream: {
            property: {
              count: props.length,
              approved_count: props.filter((r) => r.status === 'approved').length,
              reviewed_count: props.filter((r) => r.status === 'reviewed').length,
              approved_ghs: propertyApprovedRev,
              pipeline_ghs: propertyPendingRev,
            },
            business: {
              count: biz.length,
              approved_count: biz.filter((r) => r.status === 'approved').length,
              pipeline_count: biz.filter((r) => r.status === 'reviewed' || r.status === 'submitted').length,
              approved_ghs: bizApprovedRev,
              pipeline_ghs: bizPendingRev,
            },
            market_stall: {
              count: stalls.length,
              approved_count: stalls.filter((r) => r.status === 'approved').length,
              approved_ghs: stallApprovedRev,
              pipeline_ghs: stallPendingRev,
            },
          },
        },
      ],
      rowCount: 1,
    };
  }

  // 23. Dashboard coverage & Zone Revenue Realization
  if (sql.includes('FROM zones z LEFT JOIN records r')) {
    const calcRev = (r) => {
      const a = r.attributes || {};
      if (r.module === 'property') {
        const val = parseFloat(a.rateable_value) || 0;
        const imp = parseFloat(a.rate_impost) || 0.005;
        return Math.round(val * imp);
      }
      if (r.module === 'business') {
        return parseFloat(a.fee_amount) || 450;
      }
      if (r.module === 'market_stall') {
        return parseFloat(a.fee_amount) || 180;
      }
      return 100;
    };

    const coverage = dbState.zones.map((z) => {
      const records = dbState.records.filter((r) => r.zone_id === z.id);
      const approvedRecords = records.filter((r) => r.status === 'approved');
      const reviewedRecords = records.filter((r) => r.status === 'reviewed');
      const submittedRecords = records.filter((r) => r.status === 'submitted');

      const approvedRev = approvedRecords.reduce((sum, r) => sum + calcRev(r), 0);
      const pendingRev = [...reviewedRecords, ...submittedRecords].reduce((sum, r) => sum + calcRev(r), 0);
      const pct = z.target_count > 0 ? ((records.length / z.target_count) * 100).toFixed(1) : 0;

      return {
        id: z.id,
        name: z.name,
        code: z.code,
        zone_id: z.id,
        zone_name: z.name,
        zone_code: z.code,
        target_count: z.target_count,
        record_count: records.length,
        approved_count: approvedRecords.length,
        reviewed_count: reviewedRecords.length,
        submitted_count: submittedRecords.length,
        approved_revenue_ghs: approvedRev,
        pending_revenue_ghs: pendingRev,
        coverage_pct: parseFloat(pct),
        boundary_geojson: z.boundary_geojson,
      };
    });
    return { rows: coverage, rowCount: coverage.length };
  }

  // 24. Collector stats
  if (sql.includes("WHERE u.role = 'collector'")) {
    const collectors = dbState.users
      .filter((u) => u.role === 'collector')
      .map((u) => {
        const records = dbState.records.filter((r) => r.created_by === u.id);
        const zone = dbState.zones.find((z) => z.id === u.assigned_zone_id);
        const rejected = records.filter((r) => r.status === 'rejected').length;
        const rate = records.length > 0 ? ((rejected / records.length) * 100).toFixed(1) : 0;
        return {
          user_id: u.id,
          full_name: u.full_name,
          username: u.username,
          assigned_zone_name: zone ? zone.name : null,
          total_records: records.length,
          records_today: records.length,
          records_last_7_days: records.length,
          avg_accuracy_m: 8.5,
          rejected_count: rejected,
          rejection_rate_pct: parseFloat(rate),
        };
      });
    return { rows: collectors, rowCount: collectors.length };
  }

  // 25. Recent activity
  if (sql.includes('FROM audit_log a')) {
    return {
      rows: dbState.audit_log.map((a) => {
        const u = dbState.users.find((usr) => usr.id === a.user_id);
        return {
          ...a,
          user_name: u ? u.full_name : 'System User',
          user_role: u ? u.role : 'user',
        };
      }),
      rowCount: dbState.audit_log.length,
    };
  }

  // 26. Insert audit log
  if (sql.includes('INSERT INTO audit_log')) {
    const item = {
      id: dbState.audit_log.length + 1,
      user_id: params[0],
      action: params[1],
      entity_type: params[2],
      entity_id: params[3],
      created_at: new Date().toISOString(),
    };
    dbState.audit_log.unshift(item);
    return { rows: [item], rowCount: 1 };
  }

  // 27. Counts
  if (sql.includes('SELECT COUNT(*)::int as total_zones FROM zones')) {
    return { rows: [{ total_zones: dbState.zones.length }], rowCount: 1 };
  }
  if (sql.includes('SELECT COUNT(*)::int as total_users FROM users')) {
    return { rows: [{ total_users: dbState.users.length }], rowCount: 1 };
  }
  if (sql.includes('SELECT COUNT(*) FROM photos WHERE record_id = $1')) {
    const count = dbState.photos.filter((p) => p.record_id === params[0]).length;
    return { rows: [{ count }], rowCount: 1 };
  }

  // Default fallback
  return { rows: [], rowCount: 0 };
}
