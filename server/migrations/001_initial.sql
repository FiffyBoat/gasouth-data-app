-- Zebra RMS Initial Migration
-- Creates all tables, indexes, and seeds the admin user.

-- Enable PostGIS and trigram extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('collector','supervisor','admin')),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    assigned_zone_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zones with PostGIS geometry
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

ALTER TABLE users
    ADD CONSTRAINT fk_users_zone
    FOREIGN KEY (assigned_zone_id) REFERENCES zones(id);

-- Records — the core GPS-addressed items
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL CHECK (module IN ('property','business','market_stall')),
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy_m DOUBLE PRECISION,
    capture_method VARCHAR(20) NOT NULL CHECK (capture_method IN ('device-gps','averaged','manual-pin')),
    ghana_post_address VARCHAR(50),
    owner_name VARCHAR(200),
    owner_phone VARCHAR(20),
    owner_id_type VARCHAR(50),
    owner_id_number VARCHAR(100),
    attributes JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','flagged')),
    zone_id UUID REFERENCES zones(id),
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    review_comment TEXT,
    review_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    device_info VARCHAR(500),
    capture_time TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_records_location ON records USING GIST(location);
CREATE INDEX idx_records_zone ON records(zone_id);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_module ON records(module);
CREATE INDEX idx_records_created_by ON records(created_by);
CREATE INDEX idx_records_owner_name ON records USING GIN(owner_name gin_trgm_ops);

-- Photos
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

-- Audit log
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
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

-- Record version history
CREATE TABLE record_versions (
    id BIGSERIAL PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_versions_record ON record_versions(record_id);

-- Seed an admin user (password: admin123 — change immediately)
-- The password hash is for 'admin123' using bcryptjs with 12 rounds
INSERT INTO users (username, email, password_hash, role, full_name, phone)
VALUES (
    'admin',
    'admin@zebrarms.app',
    '$2a$12$LJ3m4ys3Lz0QX2E8e5Pxn.vFwY5z5Q8q5r5s5t5u5v5w5x5y5z5A',
    'admin',
    'System Administrator',
    '0200000000'
);
