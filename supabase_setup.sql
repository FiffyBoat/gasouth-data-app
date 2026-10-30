-- ==============================================================================
-- ZEBRA RMS (Revenue Management System) — Supabase Production Setup Script
-- Area: Ngleshie Amanfro & Kasoa Commercial Corridor (Ga South / Awutu Senya East)
-- ==============================================================================

-- 1. ENABLE REQUIRED EXTENSIONS
-- PostGIS for high-accuracy spatial geometry and point-in-polygon geofencing
-- pg_trgm for fuzzy string duplicate detection
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. CLEAN UP EXISTING TABLES IF RE-INITIALIZING (Safely drops in foreign-key order)
DROP TABLE IF EXISTS record_versions CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

-- 3. CREATE ZONES TABLE
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    boundary GEOMETRY(MultiPolygon, 4326),
    target_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);

-- 4. CREATE USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('collector', 'supervisor', 'budget_director', 'admin')),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    assigned_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_assigned_zone ON users(assigned_zone_id);

-- 5. CREATE RECORDS TABLE
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL CHECK (module IN ('property', 'business', 'market_stall')),
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy_m DOUBLE PRECISION,
    capture_method VARCHAR(20) NOT NULL CHECK (capture_method IN ('device-gps', 'averaged', 'manual-pin')),
    ghana_post_address VARCHAR(50),
    owner_name VARCHAR(200),
    owner_phone VARCHAR(20),
    owner_id_type VARCHAR(50),
    owner_id_number VARCHAR(100),
    attributes JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected', 'flagged')),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    review_comment TEXT,
    review_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    device_info VARCHAR(500),
    capture_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial and Performance Indexes
CREATE INDEX idx_records_location ON records USING GIST(location);
CREATE INDEX idx_records_zone ON records(zone_id);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_module ON records(module);
CREATE INDEX idx_records_created_by ON records(created_by);
CREATE INDEX idx_records_owner_name ON records USING GIN(owner_name gin_trgm_ops);

-- 6. CREATE PHOTOS TABLE
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    original_name VARCHAR(255),
    size_bytes INTEGER,
    mime_type VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_photos_record ON photos(record_id);

-- 7. CREATE AUDIT LOG TABLE
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- 8. CREATE RECORD VERSIONS TABLE
CREATE TABLE record_versions (
    id BIGSERIAL PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_versions_record ON record_versions(record_id);

-- ==============================================================================
-- 9. SEED OPERATIONAL ZONES (Ngleshie Amanfro & Kasoa Corridor)
-- ==============================================================================
INSERT INTO zones (id, name, code, boundary, target_count)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Ngleshie Amanfro Central',
    'GS-AM-001',
    ST_Multi(ST_GeomFromText(
        'POLYGON((-0.420 5.518, -0.380 5.518, -0.380 5.545, -0.420 5.545, -0.420 5.518))',
        4326
    )),
    500
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Kasoa New Market & Interchange',
    'AW-KS-002',
    ST_Multi(ST_GeomFromText(
        'POLYGON((-0.450 5.520, -0.415 5.520, -0.415 5.555, -0.450 5.555, -0.450 5.520))',
        4326
    )),
    750
),
(
    'a0000000-0000-0000-0000-000000000003',
    'Galilea - Iron City Enclave',
    'GS-GL-003',
    ST_Multi(ST_GeomFromText(
        'POLYGON((-0.400 5.525, -0.365 5.525, -0.365 5.558, -0.400 5.558, -0.400 5.525))',
        4326
    )),
    650
);

-- ==============================================================================
-- 10. SEED USERS & SYSTEM ROLES
-- Passwords match the application quick-login buttons:
-- admin / admin123 | supervisor1 / super123 | collector1 / collect123 | budget_director / budget123
-- ==============================================================================
INSERT INTO users (id, username, email, password_hash, role, full_name, phone, assigned_zone_id)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'admin',
    'admin@zebrarms.app',
    '$2a$10$5bQ3OGlWgWMKty7EjlxGoez1GqHNWHET6Z9Vh3EhGYBRDoYZ0vkXi',
    'admin',
    'System Administrator',
    '0200000000',
    NULL
),
(
    'b0000000-0000-0000-0000-000000000002',
    'supervisor1',
    'supervisor@zebrarms.app',
    '$2a$10$qHgTAucY6Dm0Yoe9P4vetulm4zHTLsY4NCUZv6ik6A88H5SgZ5iWq',
    'supervisor',
    'Kwame Asante',
    '0241234567',
    'a0000000-0000-0000-0000-000000000001'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'collector1',
    'collector@zebrarms.app',
    '$2a$10$xQb1nK/eFbGvbLoXVKmk7uYTxyHvuYHx0iC7/veg5xbBOswby7qU2',
    'collector',
    'Ama Darko',
    '0271234567',
    'a0000000-0000-0000-0000-000000000001'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'budget_director',
    'budget@zebrarms.app',
    '$2a$10$A7GrSJWrk9bdXQ.g.58n4.h6Ob0NczFLDyHg2qwVJ6Mh/zFjYue4u',
    'budget_director',
    'Dr. Emmanuel Baah',
    '0245678901',
    NULL
);

-- ==============================================================================
-- 11. SEED PILOT REVENUE RECORDS (Kasoa & Amanfro Ground Truth)
-- ==============================================================================
INSERT INTO records (
    id, module, location, latitude, longitude, altitude, accuracy_m,
    capture_method, ghana_post_address, owner_name, owner_phone,
    attributes, status, zone_id, created_by, reviewed_by, review_comment, review_time
)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'property',
    ST_SetSRID(ST_MakePoint(-0.4024, 5.5312), 4326),
    5.5312, -0.4024, 42.0, 5.4,
    'device-gps', 'GS-0124-8891',
    'Amanfro Royal Heritage Plaza', '0244111222',
    '{
        "upn": "05-012-004-001",
        "property_address": "Hse No. AM-42/3, Winneba - Kasoa Main Highway",
        "valuation_number": "VAL-2024-GS-104",
        "use_code": "COM-2",
        "rateable_value": "450000",
        "rate_impost": "0.005",
        "groups": "commercial_entity",
        "landmark": "Adjacent Amanfro Toll Booth / Total Station",
        "street_name": "Winneba - Kasoa Highway",
        "collection_area": "Ngleshie Amanfro",
        "sub_collection_area": "Amanfro Town Sector"
    }'::jsonb,
    'approved',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'Reviewed by Data Supervisor and Final Approval by Budget Director.',
    now() - INTERVAL '2 days'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'business',
    ST_SetSRID(ST_MakePoint(-0.4289, 5.5345), 4326),
    5.5345, -0.4289, 38.5, 6.8,
    'device-gps', 'AW-054-3201',
    'Kasoa Interchange Super Buka & Catering', '0209876543',
    '{
        "business_type": "sole_proprietorship",
        "business_category": "hospitality_food",
        "services_provided": "Local Ghanaian dishes, banku, fufu, catering & cold drinks",
        "property_address": "Shop 12, Ground Floor, Kasoa New Market Road",
        "upn": "05-012-004-002",
        "groups": "traders_association",
        "landmark": "Near Kasoa Overhead Bridge",
        "street_name": "Kasoa - Bawjiase Road",
        "collection_area": "Kasoa Central",
        "sub_collection_area": "Interchange Commercial Sector"
    }'::jsonb,
    'submitted',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    NULL, NULL, NULL
),
(
    'c0000000-0000-0000-0000-000000000003',
    'market_stall',
    ST_SetSRID(ST_MakePoint(-0.4320, 5.5380), 4326),
    5.5380, -0.4320, 35.0, 8.5,
    'averaged', 'AW-082-1400',
    'Auntie Mary Fabric & Textile Stalls', '0551239876',
    '{
        "market_name": "Kasoa New Market Enclave",
        "stall_number": "Shed C-42",
        "commodity": "Kente, Holland Wax & Local Textiles",
        "rent_category": "daily_toll"
    }'::jsonb,
    'draft',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    NULL, NULL, NULL
),
(
    'c0000000-0000-0000-0000-000000000004',
    'property',
    ST_SetSRID(ST_MakePoint(-0.3845, 5.5398), 4326),
    5.5398, -0.3845, 45.2, 5.9,
    'device-gps', 'GS-0199-7712',
    'Galilea Heights Commercial Complex', '0244998877',
    '{
        "upn": "05-012-008-015",
        "property_address": "Plot 18, Galilea Station Link",
        "valuation_number": "VAL-2024-GS-215",
        "use_code": "COM-1",
        "rateable_value": "380000",
        "rate_impost": "0.005",
        "groups": "commercial_entity",
        "landmark": "Opposite Galilea Market / Police Post",
        "street_name": "Old Barrier - Galilea Road",
        "collection_area": "Galilea",
        "sub_collection_area": "Iron City Sector"
    }'::jsonb,
    'reviewed',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Field data and GPS location verified by Data Supervisor. Ready for Budget Director endorsement.',
    now() - INTERVAL '12 hours'
);

-- ==============================================================================
-- 12. SEED FIELD PHOTOS
-- ==============================================================================
INSERT INTO photos (id, record_id, file_path, thumbnail_path, original_name, size_bytes, mime_type, sort_order)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=200&q=80',
    'plaza_front.jpg', 421000, 'image/jpeg', 0
),
(
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
    'chopbar_signboard.jpg', 389000, 'image/jpeg', 0
),
(
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80',
    'galilea_complex_front.jpg', 512000, 'image/jpeg', 0
),
(
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    'building_side_elevation.jpg', 480000, 'image/jpeg', 1
);

-- Output confirmation summary
SELECT 
    (SELECT COUNT(*) FROM zones) as zones_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM records) as records_count,
    (SELECT COUNT(*) FROM photos) as photos_count;
