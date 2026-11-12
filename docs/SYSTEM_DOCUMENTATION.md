# Ga South Municipal Assembly — Data Collection System (GSMA-DCS)
## Technical Architecture, Administration & Operations Manual

**Document Version:** 2.0.0  
**Effective Date:** November 2026  
**Jurisdiction:** Ga South Municipal Assembly (Ngleshie Amanfro, Greater Accra, Ghana)  
**System Classification:** Municipal Revenue Administration & GIS Infrastructure  
**Author:** Municipal IT & Revenue Operations Taskforce  

---

## 1. System Overview & Mandate

### 1.1 Purpose
The **Ga South Municipal Assembly Data Collection System (GSMA-DCS)** is an enterprise web GIS and revenue register platform designed to index, verify, audit, and spatially map all ratable properties, commercial establishments, and market operations across the Ga South Municipality.

### 1.2 Legal & Policy Mandate
The system operationalizes statutory powers granted to the Municipal Assembly under:
* **Local Governance Act, 2016 (Act 936)**, Sections 137–169 (Rating and Revenue Mobilization).
* **Public Financial Management Act, 2016 (Act 921)** (Internal Control, Transparency, and Audit Proof).
* **Land Use and Spatial Planning Act, 2016 (Act 925)** (Geographic Addressability and Zoning).

### 1.3 Core Revenue Modules
1. **Property Rate Module (`property`)**: Commercial, residential, industrial, and mixed-use structures indexed by Unique Parcel Number (UPN), construction typology, number of floors, occupancy status, and spatial coordinates.
2. **Business Operating Permit Module (`business`)**: Formal and informal commercial enterprises, registration certificates, business categories, ratepayer contacts, and primary commercial signage.
3. **Market Stalls & Tolls Module (`market_stall`)**: Lockable stores, sheds, daily market toll operations, and commodity classifications across community and central markets.

---

## 2. Technical Architecture & Technology Stack

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|  React 18 (Vite SPA) + Tailwind CSS + Lucide Icons + MapLibre GL                |
|  - Progressive Web App capability (Mobile/Desktop/Tablet)                       |
|  - Continuous watchPosition Satellite Warm-Up Engine                            |
|  - Offline-first localStorage Autosave & Queue                                  |
|  - In-browser HTML5 Canvas Geotag Watermarking Engine                           |
+---------------------------------------------------------------------------------+
                                       |
                           HTTPS REST API (JSON)
                                       v
+---------------------------------------------------------------------------------+
|                                 SERVER TIER                                     |
|  Node.js (v18+) + Express Engine (ES Modules)                                   |
|  - JWT Bearer Authentication & Role-Based Middleware                            |
|  - Spatial validation (Geofence enforcement & Point-in-Polygon zone linking)   |
|  - Multer multipart/form-data image ingest with Sharp compression               |
|  - Streaming CSV/Excel Export & Bulk Importer                                   |
+---------------------------------------------------------------------------------+
                                       |
                             SSL Connection Pool
                                       v
+---------------------------------------------------------------------------------+
|                                DATABASE TIER                                    |
|  PostgreSQL 15+ with PostGIS 3.3+ (Hosted on Supabase Cloud)                   |
|  - SRID 4326 (WGS 84 geographic coordinate system)                              |
|  - Spatial indexes (GIST on geometry points and boundaries)                     |
|  - Relational constraints, cascading deletions, audit timestamps               |
+---------------------------------------------------------------------------------+
```

### 2.1 Technology Matrix
| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js (via Vite) | 18.2.0 | Reactive user interface and single-page routing |
| **Styling & Icons** | Tailwind CSS & Lucide React | 3.4 / 0.3 | Mobile-responsive design and iconography |
| **Spatial Mapping** | MapLibre GL | 3.6+ | Satellite hybrid raster rendering and interactive pin editing |
| **Backend Runtime** | Node.js (ESM) | 18.x LTS | High-throughput asynchronous REST API |
| **API Framework** | Express.js | 4.18+ | Route handling, authentication, multipart streaming |
| **Database** | PostgreSQL + PostGIS | 15 / 3.3 | Relational ledger, ACID compliance, spatial geometry engine |
| **Image Processing** | Sharp & Browser Canvas | 0.33+ | Compression, thumbnail generation, canvas watermark burning |
| **Hosting Platform** | Render Cloud Services | Standard | Zero-downtime automated deployment via Git triggers |

---

## 3. Database Architecture & Schema Specification

The database is built on PostgreSQL with the PostGIS extension enabled (`CREATE EXTENSION IF NOT EXISTS postgis;`).

### 3.1 Entity Relationship Model
```
                      +-------------------+
                      |       ZONES       |
                      |-------------------|
                      | id (UUID, PK)     |
                      | name (VARCHAR)    |
                      | code (VARCHAR)    |
                      | boundary (MULTIPOL|
                      +-------------------+
                                ^
                                | (1:N)
+------------------+   +-------------------+   +--------------------+
|      USERS       |   |      RECORDS      |   |       PHOTOS       |
|------------------|   |-------------------|   |--------------------|
| id (UUID, PK)    |   | id (UUID, PK)     |   | id (UUID, PK)      |
| username (UNIQUE)|<--| created_by (UUID) |<--| record_id (UUID)   |
| password_hash    |   | zone_id (UUID)    |   | file_path (VARCHAR)|
| role (ENUM)      |   | module (ENUM)     |   | thumbnail_path     |
| zone_id (UUID)   |   | owner_name        |   | latitude (FLOAT)   |
+------------------+   | owner_phone       |   | longitude (FLOAT)  |
                       | location_name     |   | watermark_meta     |
                       | ghana_post_address|   +--------------------+
                       | latitude (FLOAT)  |
                       | longitude (FLOAT) |
                       | geom (GEOMETRY)   |
                       | status (ENUM)     |
                       | attributes (JSONB)|
                       +-------------------+
```

### 3.2 Data Dictionary (Key Tables)

#### `records` Table
| Column Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique record identifier |
| `module` | `VARCHAR(20)` | NOT NULL | Category: `'property'`, `'business'`, `'market_stall'` |
| `owner_name` | `VARCHAR(255)` | NOT NULL | Ratepayer, property owner, or business operator name |
| `owner_phone` | `VARCHAR(50)` | NULLABLE | Primary mobile number for billing & SMS notices |
| `location_name` | `VARCHAR(150)` | NOT NULL | Locality / Suburb / Landmark (e.g. Amanfrom, Tuba, Galilea) |
| `ghana_post_address` | `VARCHAR(60)` | NULLABLE | Optional Ghana Post Digital Address (e.g. `GS-0124-5678`) |
| `latitude` | `DOUBLE PRECISION`| NULLABLE | WGS 84 latitude coordinate (-90 to +90) |
| `longitude` | `DOUBLE PRECISION`| NULLABLE | WGS 84 longitude coordinate (-180 to +180) |
| `accuracy_m` | `DOUBLE PRECISION`| NULLABLE | Horizontal accuracy radius in meters |
| `geom` | `GEOMETRY(Point, 4326)` | NULLABLE | PostGIS spatial point indexed via GIST |
| `zone_id` | `UUID` | FOREIGN KEY (`zones.id`) | Operational municipal zone assignment |
| `status` | `VARCHAR(20)` | DEFAULT `'draft'` | Lifecycle state: `'draft'`, `'submitted'`, `'approved'`, `'rejected'` |
| `attributes` | `JSONB` | DEFAULT `'{}'` | Dynamic fields (bill number, structural type, store size, arrears) |
| `created_by` | `UUID` | FOREIGN KEY (`users.id`) | Authenticated collector who captured/imported record |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Timestamp of initial record creation |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Timestamp of last modification |
| `capture_time`| `TIMESTAMPTZ` | NULLABLE | Exact timestamp when GPS coordinates were locked |

#### `zones` Table
| Column Name | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique zone identifier |
| `name` | `VARCHAR(100)` | NOT NULL | Official Assembly Zone Name (e.g., Tuba Zone) |
| `code` | `VARCHAR(20)` | NULLABLE | Standardized code prefix (e.g., `GS-TB-005`) |
| `boundary` | `GEOMETRY(MultiPolygon, 4326)` | NULLABLE | Geographic polygon boundary for geofencing & auto-linking |

---

## 4. Security, Roles & Access Control Matrix (RBAC)

Authentication utilizes **JSON Web Tokens (JWT)** transmitted via HTTP Authorization headers (`Bearer <token>`). Tokens expire after 24 hours. Passwords are encrypted using **bcrypt** (salt factor 10).

### 4.1 Role Hierarchy & Permissions
| Function / Action | Collector (`collector`) | Supervisor (`supervisor`) | Budget Director (`budget_director`) | Admin (`admin`) |
| :--- | :---: | :---: | :---: | :---: |
| **Login & Dashboard Overview** | Yes | Yes | Yes | Yes |
| **View Assigned Draft Records** | Yes | Yes | Yes | Yes |
| **Edit Records & Capture GPS** | Yes | No (Audit Only) | No (Read Only) | Yes |
| **Take / Upload Geotagged Photos**| Yes | No | No | Yes |
| **Submit Draft Records for Review**| Yes | No | No | Yes |
| **Review & Approve Submissions** | No | Yes | No | Yes |
| **Reject Record (Request Resurvey)**| No | Yes | No | Yes |
| **Trace Officer Routes (Map Replay)**| No | Yes | Yes | Yes |
| **Export Data (CSV / Excel)** | No | Yes | Yes | Yes |
| **Import Register / Wipe Database**| No | No | No | Yes |
| **Manage Users & Reset Passwords** | No | No | No | Yes |
| **Configure Zones & Boundaries** | No | No | No | Yes |

---

## 5. Subsystem Specifications

### 5.1 Real-Time Satellite Warm-Up Engine (`useGeolocation.js`)
* **Background Warmup**: As soon as the data capture form opens, the client invokes `navigator.geolocation.watchPosition` with `{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }`.
* **Accuracy Filtering**: The engine stores the best incoming fix (`lowest horizontal accuracy in meters`).
* **Live Telemetry Stream**: The user interface displays live satellite readiness in real-time without locking prematurely.
* **Lock-In Execution**: Tapping **"Lock GPS Position"** instantly binds the lowest-meter fix to the form state, stops the watcher to preserve device battery, and sets `isLocked = true`.
* **Averaging Engine**: An alternate multi-reading routine takes 5 discrete readings over 4 seconds and applies an inverse-variance weighted mean to cancel atmospheric multipath noise.

### 5.2 Strict Photo Gate & Anti-Fraud Geotagging
* **Lock Gate**: The camera trigger and gallery upload inputs are disabled (`pointer-events-none opacity-60`) until `isLocked === true`. This guarantees no photo can exist without physical location verification.
* **Canvas Watermark Stamping**: When photos are taken, an HTML5 Canvas pipeline burns irreversible evidentiary metadata directly onto the lower third of the image pixels:
  * Official Header: `"GA SOUTH MUNICIPAL ASSEMBLY — OFFICIAL VERIFICATION"`
  * GPS Coordinates: Latitude & Longitude to 6 decimal places (approx. 10 cm precision).
  * Suburb / Locality & Ghana Post Digital Address.
  * Officer Name & Capture Timestamp (GMT).
  * GSMA Cryptographic Hash Watermark.

### 5.3 Supervisor "Trace Officer Route" Replay Engine
* **Spatial Tracking**: When an officer captures properties, each submission stores a point along their daily route.
* **Haversine Distance**: Server computes geodetic distance between sequential points:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
* **Map Reconstruction**: The map dynamically renders a dual-cased purple vector line connecting all properties in chronological order. Pins are color-coded (🟢 #1 Morning Start $\rightarrow$ 🟣 Intermediate Stops $\rightarrow$ 🔴 Final Stop).

---

## 6. Deployment & Environment Configuration

### 6.1 Server Environment Variables (`server/.env`)
```bash
# PostgreSQL Connection (Supabase Cloud Pooler)
DATABASE_URL=postgresql://postgres.<project_id>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

# JSON Web Token Secret & Expiry
JWT_SECRET=super-secret-secure-jwt-key-2026
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# GPS Quality Threshold (meters)
ACCURACY_THRESHOLD=15
```

### 6.2 Client Environment Variables (`client/.env`)
```bash
# API Base Endpoint (Empty string in production uses relative path)
VITE_API_URL=

# Map & GPS Defaults
VITE_DEFAULT_LAT=5.5350
VITE_DEFAULT_LNG=-0.4285
VITE_GPS_ACCURACY_THRESHOLD=15
```

---

## 7. Disaster Recovery & Backup Procedures

1. **Daily Automated Snapshots**: Managed automatically through Supabase PITR (Point-in-Time Recovery).
2. **Manual Register Export**:
   * Prior to any schema change or bulk import, run the built-in export via `GET /api/records/export?format=csv` logged in as Administrator.
3. **Database Restore**:
   * Standard SQL dump restoration using standard PostgreSQL client tools:
     ```bash
     pg_restore --clean --no-acl --no-owner -h <db_host> -U postgres -d postgres backup.dump
     ```

---
*End of Technical Architecture Manual — Ga South Municipal Assembly.*
