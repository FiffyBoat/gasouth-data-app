-- Zebra RMS Demo Seed Data
-- Sample zones with real Accra-area coordinates, demo supervisor and collector users.

-- Zone 1: Osu — a well-known commercial area in Accra
INSERT INTO zones (id, name, code, boundary, target_count)
VALUES (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Osu',
    'OSU-001',
    ST_GeomFromText(
        'MULTIPOLYGON(((-0.175 5.555, -0.165 5.555, -0.165 5.565, -0.175 5.565, -0.175 5.555)))',
        4326
    ),
    500
);

-- Zone 2: Madina — a large residential/commercial suburb
INSERT INTO zones (id, name, code, boundary, target_count)
VALUES (
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Madina',
    'MAD-002',
    ST_GeomFromText(
        'MULTIPOLYGON(((-0.220 5.670, -0.200 5.670, -0.200 5.690, -0.220 5.690, -0.220 5.670)))',
        4326
    ),
    750
);

-- Zone 3: Tema — the industrial port city east of Accra
INSERT INTO zones (id, name, code, boundary, target_count)
VALUES (
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    'Tema',
    'TEM-003',
    ST_GeomFromText(
        'MULTIPOLYGON(((0.000 5.660, 0.020 5.660, 0.020 5.680, 0.000 5.680, 0.000 5.660)))',
        4326
    ),
    1000
);

-- Supervisor user (password: super123)
INSERT INTO users (id, username, email, password_hash, role, full_name, phone, assigned_zone_id)
VALUES (
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
    'supervisor1',
    'supervisor@zebrarms.app',
    '$2a$12$LJ3m4ys3Lz0QX2E8e5Pxn.vFwY5z5Q8q5r5s5t5u5v5w5x5y5z5A',
    'supervisor',
    'Kwame Asante',
    '0241234567',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
);

-- Collector user (password: collect123)
INSERT INTO users (id, username, email, password_hash, role, full_name, phone, assigned_zone_id)
VALUES (
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    'collector1',
    'collector@zebrarms.app',
    '$2a$12$LJ3m4ys3Lz0QX2E8e5Pxn.vFwY5z5Q8q5r5s5t5u5v5w5x5y5z5A',
    'collector',
    'Ama Darko',
    '0271234567',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
);

-- Sample records in the Osu zone
INSERT INTO records (module, location, latitude, longitude, accuracy_m, capture_method, owner_name, owner_phone, attributes, status, zone_id, created_by)
VALUES
(
    'property',
    ST_SetSRID(ST_MakePoint(-0.170, 5.560), 4326),
    5.560, -0.170, 5.2, 'device-gps',
    'Kofi Mensah', '0241111111',
    '{"property_type": "residential", "storeys": 2, "roof_type": "metal_sheet"}',
    'submitted',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091'
),
(
    'business',
    ST_SetSRID(ST_MakePoint(-0.171, 5.558), 4326),
    5.558, -0.171, 3.8, 'device-gps',
    'Esi Appiah', '0242222222',
    '{"business_type": "retail_shop", "business_name": "Esi Fashion", "employees": 3}',
    'approved',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091'
),
(
    'market_stall',
    ST_SetSRID(ST_MakePoint(-0.168, 5.561), 4326),
    5.561, -0.168, 8.1, 'averaged',
    'Akua Boateng', '0243333333',
    '{"stall_number": "B14", "market_name": "Osu Night Market", "goods_sold": "textiles"}',
    'draft',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091'
);

-- Sample audit log entries
INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
SELECT
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    'create',
    'record',
    r.id,
    '{}'
FROM records r
LIMIT 3;
