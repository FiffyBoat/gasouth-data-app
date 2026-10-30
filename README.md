# Zebra RMS Geo — GPS Addressing & Revenue Data Collection MVP

A responsive, geo-enabled web application built for Ghanaian Municipal Assemblies (Ga South / Awutu Senya East) to create an accurate, location-referenced spatial register of rateable properties, businesses, and market stalls.

> **Core Principle: The GPS coordinate IS the digital address.**  
> Rather than relying on missing or inconsistent street names, every revenue item is anchored to verified latitude, longitude, and accuracy metrics (`±15m` threshold) captured directly from field officer mobile browsers.

---

## 🏗️ Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, MapLibre GL JS (raster & satellite layers), Lucide Icons
- **Backend**: Node.js, Express, ES Modules, JWT auth, Multer & Sharp for photo processing
- **Database**: PostgreSQL 16 with PostGIS 3.4 (`ST_DWithin`, `ST_Contains`, `pg_trgm` fuzzy matching)
- **Deployment**: Docker Compose for containerized database and backend

---

## 🚀 Quick Start with Docker

### 1. Start Database & API Services
```bash
docker-compose up -d
```
This spins up:
- **PostgreSQL 16 + PostGIS 3.4** on port `5432`
- **Zebra RMS Geo API** on port `3001`
- Auto-mounted upload volume for field evidence photos

### 2. Run Database Migrations & Demo Seed Data
```bash
cd server
npm run migrate
```

### 3. Start Frontend Dev Server
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo User Accounts

| Role | Username | Password | Assigned Zone | Permissions |
|---|---|---|---|---|
| **System Administrator** | `admin` | `admin123` | All Zones | Full system access, users & zone management |
| **Field Supervisor** | `supervisor1` | `super123` | Osu Sector | Verification, approve/reject workflow, zone maps |
| **Field Collector** | `collector1` | `collect123` | Osu Sector | GPS capture, photo uploads, draft submission |

---

## 📱 Mobile Field Usage Guide

1. Field officers open the web app on any smartphone browser (Chrome / Safari / Firefox) over HTTPS.
2. Navigate to **"Capture Record"**.
3. Tap the green **"📍 Capture My Location"** button.
   - The device location service returns latitude, longitude, and horizontal accuracy.
   - If indoors or accuracy is suboptimal, tap **"Average Readings (5 Fixes)"** to calculate a precise mean.
   - If GPS is obstructed, tap **"Place or adjust pin on interactive map"** to manually place the pin.
4. Fill in the ratepayer name, phone, national ID (Ghana Card), and category attributes.
5. Take 1 to 4 photos using the phone camera (compressed automatically on-device).
6. Tap **"Submit for Review"**.
   - If the officer is outside their assigned municipal zone, a **Geofence Boundary Alert** flags the submission for supervisor review.
   - Automatic duplicate detection flags any existing records within 20m with similar owner names.

---

## 🗺️ Review & Verification Workflow

1. Supervisors log in and navigate to **"Review Records"**.
2. A split view presents the queue on the left and the record detail, field photos, and PostGIS location map on the right.
3. The supervisor clicks **"Approve & Verify"** or **"Reject"** (with mandatory explanatory comment).
4. Approved records immediately become available for billing integration into the core Zebra Revenue Management System.

---

## 📁 Repository Structure

```
dataApp/
├── docker-compose.yml          # PostgreSQL PostGIS & API container definitions
├── .env.example                # Environment variables template
├── server/
│   ├── migrations/
│   │   ├── 001_initial.sql     # PostGIS schema, tables, spatial indexes
│   │   └── 002_seed_demo.sql   # Accra zone polygons & seed accounts
│   ├── src/
│   │   ├── config/database.js  # Connection pooling (node-postgres)
│   │   ├── middleware/         # JWT auth, audit logging, input validation
│   │   ├── routes/             # records, zones, users, dashboard, photos
│   │   ├── utils/              # PostGIS spatial helpers, duplicate checking
│   │   ├── index.js            # Express server entry point
│   │   └── migrate.js          # Migration runner
│   └── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── gps/            # GPSCapture, AccuracyIndicator, ManualPinMap
    │   │   ├── map/            # MapView (MapLibre), MapFilters, RecordPopup
    │   │   ├── records/        # RecordForm, RecordList, RecordDetail, PhotoUpload
    │   │   ├── review/         # ReviewPanel, ReviewDetail
    │   │   └── dashboard/      # StatsCards, CoverageMap, CollectorStats
    │   ├── contexts/           # AuthContext
    │   ├── hooks/              # useGeolocation, useApi
    │   ├── pages/              # Login, Dashboard, CaptureRecord, MapExplorer, etc.
    │   ├── utils/              # geo formatting, autosave, API client
    │   ├── App.jsx             # React router configuration
    │   └── main.jsx
    └── package.json
```
