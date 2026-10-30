import pptxgen from 'pptxgenjs';
import path from 'path';

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Zebra RMS Engineering Team';
pres.company = 'Municipal Revenue Management';
pres.title = 'Zebra RMS - Geo-Enabled Revenue Management System';

// Theme Colors
const C_DARK = '0F172A';      // Slate 900
const C_NAVY = '1E293B';      // Slate 800
const C_BLUE = '2563EB';      // Blue 600
const C_TEAL = '0D9488';      // Teal 600
const C_EMERALD = '059669';   // Emerald 600
const C_AMBER = 'D97706';     // Amber 600
const C_LIGHT_BG = 'F8FAFC';  // Slate 50
const C_CARD_BG = 'FFFFFF';
const C_MUTED = '64748B';     // Slate 500
const C_WHITE = 'FFFFFF';

// Helper: Add consistent slide header
function addSlideHeader(slide, title, category) {
  // Background
  slide.background = { color: C_LIGHT_BG };

  // Top accent bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.1,
    fill: { color: C_BLUE }, line: { color: C_BLUE }
  });

  // Category pill
  if (category) {
    slide.addText(category.toUpperCase(), {
      x: 0.8, y: 0.45, w: 6.0, h: 0.25,
      fontSize: 9, bold: true, color: C_BLUE, fontFace: 'Calibri'
    });
  }

  // Slide Title
  slide.addText(title, {
    x: 0.8, y: 0.7, w: 11.5, h: 0.55,
    fontSize: 22, bold: true, color: C_DARK, fontFace: 'Calibri'
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 1: Title & Cover Slide
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C_DARK };

  // Subtle decorative shape
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8, y: 1.8, w: 0.15, h: 3.2,
    fill: { color: C_EMERALD }, line: { color: C_EMERALD }
  });

  // System Badge
  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.2, y: 1.6, w: 2.8, h: 0.35, rectRadius: 0.1,
    fill: { color: '1E3A8A' }, line: { color: '3B82F6', width: 1 }
  });
  slide.addText('MUNICIPAL SPATIAL REVENUE PLATFORM', {
    x: 1.2, y: 1.6, w: 2.8, h: 0.35,
    fontSize: 8.5, bold: true, color: '93C5FD', align: 'center', fontFace: 'Calibri'
  });

  // Main Title
  slide.addText('Zebra RMS', {
    x: 1.2, y: 2.1, w: 10.5, h: 0.9,
    fontSize: 44, bold: true, color: C_WHITE, fontFace: 'Calibri'
  });

  // Subtitle
  slide.addText('High-Fidelity Geo-Enabled Revenue Management & Rate Assessment System', {
    x: 1.2, y: 3.0, w: 10.5, h: 0.5,
    fontSize: 18, color: '94A3B8', fontFace: 'Calibri'
  });

  // Descriptive Lead
  slide.addText(
    'A turnkey spatial governance platform engineered for Metropolitan, Municipal, and District Assemblies (MMDAs). Transforming manual tax collection into verified digital cadastral registers with GPS, photographic evidence, and role-based budget authorization.',
    {
      x: 1.2, y: 3.65, w: 9.8, h: 0.8,
      fontSize: 12, color: 'CBD5E1', fontFace: 'Calibri', lineSpacing: 18
    }
  );

  // Footer metadata
  slide.addText('Pilot Corridor: Ngleshie Amanfro & Kasoa Enclave  |  Ghana Local Governance Act 936', {
    x: 1.2, y: 6.2, w: 10.5, h: 0.3,
    fontSize: 10, color: '64748B', fontFace: 'Calibri'
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 2: Executive Problem & Municipal Solution
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Transforming Municipal Revenue Mobilization', 'Strategic Imperative');

  // Left Card: The Traditional Challenge
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 1.5, w: 5.6, h: 5.0, rectRadius: 0.15,
    fill: { color: C_CARD_BG }, line: { color: 'FCA5A5', width: 1 }
  });
  slide.addText('Traditional Manual Collection Challenges', {
    x: 1.1, y: 1.8, w: 5.0, h: 0.4,
    fontSize: 15, bold: true, color: 'DC2626', fontFace: 'Calibri'
  });
  slide.addText([
    { text: '• Ghost Properties & Unregistered Businesses: ', options: { bold: true, color: C_DARK } },
    { text: 'Assemblies capture < 30% of actual ground properties due to manual paper ledgers.\n\n', options: { color: C_MUTED } },
    { text: '• Disputed & Duplicate Bills: ', options: { bold: true, color: C_DARK } },
    { text: 'Without GPS ground coordinates, collectors issue conflicting rate demand notices.\n\n', options: { color: C_MUTED } },
    { text: '• Revenue Leakage & Ghost Collectors: ', options: { bold: true, color: C_DARK } },
    { text: 'Cash collection without cryptographic audit trails and geofence tracking.\n\n', options: { color: C_MUTED } },
    { text: '• Valuation Valuation Delays: ', options: { bold: true, color: C_DARK } },
    { text: 'Field inspectors lack standardized formulas for rateable values and rate imposts.', options: { color: C_MUTED } }
  ], {
    x: 1.1, y: 2.3, w: 5.0, h: 3.8, fontSize: 11, fontFace: 'Calibri', lineSpacing: 16
  });

  // Right Card: Zebra RMS Solution
  slide.addShape(pres.ShapeType.roundRect, {
    x: 6.8, y: 1.5, w: 5.7, h: 5.0, rectRadius: 0.15,
    fill: { color: C_CARD_BG }, line: { color: '86EFAC', width: 1 }
  });
  slide.addText('The Zebra RMS Digital Advantage', {
    x: 7.1, y: 1.8, w: 5.1, h: 0.4,
    fontSize: 15, bold: true, color: C_EMERALD, fontFace: 'Calibri'
  });
  slide.addText([
    { text: '• 100% Spatial Pinpoint (Sub-15m GPS): ', options: { bold: true, color: C_DARK } },
    { text: 'Every rateable asset has verified coordinates and photographic proof.\n\n', options: { color: C_MUTED } },
    { text: '• Automated Geofencing & Zone Control: ', options: { bold: true, color: C_DARK } },
    { text: 'Officers are spatially bound to designated sectors; boundary breaches trigger instant alerts.\n\n', options: { color: C_MUTED } },
    { text: '• Separation of Administrative Powers: ', options: { bold: true, color: C_DARK } },
    { text: 'Collectors capture ground facts; only the Budget Director assesses valuation & imposts.\n\n', options: { color: C_MUTED } },
    { text: '• Complete Cadastral Fiscal Map: ', options: { bold: true, color: C_DARK } },
    { text: 'Instant visual overview of revenue yields, collection gaps, and certified billings.', options: { color: C_MUTED } }
  ], {
    x: 7.1, y: 2.3, w: 5.1, h: 3.8, fontSize: 11, fontFace: 'Calibri', lineSpacing: 16
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 3: System Architecture & Technical Foundation
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Modern Full-Stack Cloud-Native Architecture', 'System Architecture');

  const cols = [
    {
      title: 'Frontend Client',
      color: C_BLUE,
      items: [
        'React 18 & Vite ultra-fast SPA',
        'Tailwind CSS design system',
        'MapLibre / Leaflet spatial viewer',
        'Camera API & touch photo upload',
        'Offline localStorage autosave',
        'Responsive mobile & tablet layout'
      ]
    },
    {
      title: 'API Server',
      color: C_TEAL,
      items: [
        'Node.js & Express REST engine',
        'JWT Auth with role middleware',
        'Multer multi-part file pipeline',
        'Sharp 200x200 thumbnail generator',
        'Rate limiting & Helmet headers',
        'CORS & Vite dev reverse proxy'
      ]
    },
    {
      title: 'Spatial Database',
      color: C_EMERALD,
      items: [
        'PostGIS spatial extensions (SRID 4326)',
        'ST_Contains point-in-polygon',
        'ST_DWithin metre-based proximity',
        'pg_trgm fuzzy text similarity',
        'High-fidelity fallback spatial DB',
        'Audit logs & record versioning'
      ]
    }
  ];

  cols.forEach((c, idx) => {
    const xPos = 0.8 + idx * 3.95;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.5, w: 3.75, h: 5.0, rectRadius: 0.15,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.3, y: 1.8, w: 3.15, h: 0.45, rectRadius: 0.08,
      fill: { color: c.color }
    });
    slide.addText(c.title, {
      x: xPos + 0.3, y: 1.8, w: 3.15, h: 0.45,
      fontSize: 13, bold: true, color: C_WHITE, align: 'center', fontFace: 'Calibri'
    });

    const bulletList = c.items.map((it) => ({
      text: `✓  ${it}\n\n`,
      options: { fontSize: 11, color: C_DARK, fontFace: 'Calibri' }
    }));

    slide.addText(bulletList, {
      x: xPos + 0.3, y: 2.5, w: 3.15, h: 3.8, lineSpacing: 14
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 4: High-Accuracy GPS & Spatial Intelligence
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Ground-Truth Geographic Information Capture', 'Spatial Module');

  // 3 GPS Modes
  const modes = [
    {
      badge: 'MODE 1: INSTANT GPS',
      title: 'Device GPS Single-Shot',
      desc: 'One-tap satellite lock using mobile GPS hardware with strict 15-metre accuracy gating. Prevents poor signal readings.'
    },
    {
      badge: 'MODE 2: PRECISION AVERAGING',
      title: 'Multi-Reading Weighted Average',
      desc: 'Takes 5 sequential GPS readings with inverse-variance weighting to cancel satellite drift in dense alleys and market stalls.'
    },
    {
      badge: 'MODE 3: MANUAL PINMAP',
      title: 'Interactive Map Pinning',
      desc: 'Allows field officers to fine-tune rooftop coordinates or back-alley structures directly on high-resolution OpenStreetMap.'
    }
  ];

  modes.forEach((m, idx) => {
    const yPos = 1.5 + idx * 1.6;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 7.2, h: 1.4, rectRadius: 0.12,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    slide.addText(m.badge, {
      x: 1.0, y: yPos + 0.15, w: 4.0, h: 0.25,
      fontSize: 9, bold: true, color: C_BLUE, fontFace: 'Calibri'
    });
    slide.addText(m.title, {
      x: 1.0, y: yPos + 0.38, w: 5.5, h: 0.35,
      fontSize: 14, bold: true, color: C_DARK, fontFace: 'Calibri'
    });
    slide.addText(m.desc, {
      x: 1.0, y: yPos + 0.75, w: 6.7, h: 0.55,
      fontSize: 10.5, color: C_MUTED, fontFace: 'Calibri'
    });
  });

  // Right Side: Ghana Post & PostGIS Features
  slide.addShape(pres.ShapeType.roundRect, {
    x: 8.3, y: 1.5, w: 4.2, h: 4.8, rectRadius: 0.15,
    fill: { color: C_NAVY }
  });
  slide.addText('Integrated National Standards', {
    x: 8.6, y: 1.8, w: 3.6, h: 0.4,
    fontSize: 15, bold: true, color: C_WHITE, fontFace: 'Calibri'
  });
  slide.addText([
    { text: '• Ghana Post GPS Addressing: ', options: { bold: true, color: '93C5FD' } },
    { text: 'Standard format (e.g. GS-0124-8891, AW-054-3201) captured alongside WGS84 latitude/longitude.\n\n', options: { color: 'CBD5E1' } },
    { text: '• Elevation & Accuracy Tagging: ', options: { bold: true, color: '93C5FD' } },
    { text: 'Stores altitude (meters) and horizontal precision to verify that readings were taken on the ground.\n\n', options: { color: 'CBD5E1' } },
    { text: '• Real-Time Spatial Duplicates: ', options: { bold: true, color: '93C5FD' } },
    { text: 'Instantly alerts collector if a property within 20m has already been recorded.', options: { color: 'CBD5E1' } }
  ], {
    x: 8.6, y: 2.3, w: 3.6, h: 3.8, fontSize: 11, fontFace: 'Calibri', lineSpacing: 16
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 5: Geofencing & Boundary Management
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Municipal Zone Assignment & Boundary Geofencing', 'Spatial Governance');

  // Process Flow Cards
  const steps = [
    {
      num: '01',
      title: 'Zone Boundary Definition',
      text: 'Assembly administrators delineate operational zones via GeoJSON polygons (e.g., Ngleshie Amanfro Central, Kasoa New Market, Galilea Enclave) with target quotas.'
    },
    {
      num: '02',
      title: 'Officer Territory Assignment',
      text: 'Every collector account is assigned a designated zone. Field officers carry a spatial boundary mask synchronized with their mobile app.'
    },
    {
      num: '03',
      title: 'Point-in-Polygon Check',
      text: 'On every coordinate lock, PostGIS ST_Contains compares the point against the collector’s assigned polygon in under 15ms.'
    },
    {
      num: '04',
      title: 'Geofence Boundary Alert',
      text: 'If coordinates fall outside the assigned sector, a soft-warning alert is triggered. Ground capture proceeds, but the record is flagged for supervisor audit.'
    }
  ];

  steps.forEach((s, idx) => {
    const xPos = 0.8 + idx * 2.95;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.5, w: 2.8, h: 4.8, rectRadius: 0.15,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    slide.addText(s.num, {
      x: xPos + 0.2, y: 1.8, w: 1.0, h: 0.6,
      fontSize: 28, bold: true, color: C_BLUE, fontFace: 'Calibri'
    });
    slide.addText(s.title, {
      x: xPos + 0.2, y: 2.4, w: 2.4, h: 0.6,
      fontSize: 13, bold: true, color: C_DARK, fontFace: 'Calibri'
    });
    slide.addText(s.text, {
      x: xPos + 0.2, y: 3.1, w: 2.4, h: 3.0,
      fontSize: 10.5, color: C_MUTED, fontFace: 'Calibri', lineSpacing: 15
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 6: Multi-Module Revenue Streams
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Three Unified Municipal Revenue Modules', 'Revenue Streams');

  const modules = [
    {
      title: '1. Property Rates (Cadastral)',
      color: C_BLUE,
      fields: [
        'Unique Property Number (UPN)',
        'Valuation Roll Number (LVD)',
        'Building Use Code (RES, COM, MIX, IND)',
        'Rateable Value (GH¢)',
        'Rate Impost Rate (e.g., 0.005)',
        'Estimated Annual Bill calculation'
      ]
    },
    {
      title: '2. Business Operating Permit',
      color: C_TEAL,
      fields: [
        'Business Trade Name & TIN',
        'Self-Learning Business Type list',
        'Fee-Fixing Class autocomplete',
        'Services provided specification',
        'Shopfront / Signboard photograph',
        'Ghana Post Address & Landmark'
      ]
    },
    {
      title: '3. Market Stalls & Tolls',
      color: C_AMBER,
      fields: [
        'Market Enclave (e.g., Kasoa New Market)',
        'Shed & Stall alphanumeric code',
        'Commodity category (Textiles, Agro, Fish)',
        'Toll frequency (Daily, Weekly, Monthly)',
        'Ratepayer Association membership',
        'Collector cash / ticket batch tracking'
      ]
    }
  ];

  modules.forEach((m, idx) => {
    const xPos = 0.8 + idx * 3.95;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.5, w: 3.75, h: 5.0, rectRadius: 0.15,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.3, y: 1.8, w: 3.15, h: 0.45, rectRadius: 0.08,
      fill: { color: m.color }
    });
    slide.addText(m.title, {
      x: xPos + 0.3, y: 1.8, w: 3.15, h: 0.45,
      fontSize: 12, bold: true, color: C_WHITE, align: 'center', fontFace: 'Calibri'
    });

    const fieldLines = m.fields.map((f) => ({
      text: `•  ${f}\n\n`,
      options: { fontSize: 11, color: C_DARK, fontFace: 'Calibri' }
    }));
    slide.addText(fieldLines, {
      x: xPos + 0.3, y: 2.5, w: 3.15, h: 3.8, lineSpacing: 15
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 7: Separation of Powers & Workflow Governance
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Tiered Multi-Role Review & Approval Workflow', 'Governance & Audit');

  const workflow = [
    {
      step: 'Step 1: Ground Capture',
      actor: 'FIELD COLLECTOR',
      color: C_BLUE,
      desc: 'Captures physical coordinates, ratepayer identity, and evidence photos. Valuation fields are disabled to prevent conflict of interest on site.'
    },
    {
      step: 'Step 2: Quality Review',
      actor: 'DATA SUPERVISOR',
      color: '7C3AED', // Purple
      desc: 'Inspects photos, checks GPS placement on map, verifies physical shopfront, and either endorses (Reviewed), flags (Anomaly), or rejects with comment.'
    },
    {
      step: 'Step 3: Financial Authorization',
      actor: 'BUDGET DIRECTOR',
      color: C_EMERALD,
      desc: 'Exclusive access to enter Valuation Number, Use Code, Rateable Value, and Rate Impost. Approves final certification for official MMDA billing.'
    }
  ];

  workflow.forEach((w, idx) => {
    const yPos = 1.5 + idx * 1.65;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 11.73, h: 1.45, rectRadius: 0.12,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    // Step tag
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.1, y: yPos + 0.25, w: 2.2, h: 0.35, rectRadius: 0.08,
      fill: { color: w.color }
    });
    slide.addText(w.actor, {
      x: 1.1, y: yPos + 0.25, w: 2.2, h: 0.35,
      fontSize: 9.5, bold: true, color: C_WHITE, align: 'center', fontFace: 'Calibri'
    });

    slide.addText(w.step, {
      x: 3.5, y: yPos + 0.2, w: 7.5, h: 0.35,
      fontSize: 14, bold: true, color: C_DARK, fontFace: 'Calibri'
    });
    slide.addText(w.desc, {
      x: 3.5, y: yPos + 0.58, w: 8.7, h: 0.7,
      fontSize: 11, color: C_MUTED, fontFace: 'Calibri', lineSpacing: 15
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 8: Photographic Evidence & Anti-Fraud Architecture
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Photographic Audit & Anti-Fraud Controls', 'Data Integrity');

  const features = [
    {
      title: 'Digital Evidence Pipeline',
      items: [
        'Direct camera capture & gallery upload',
        'Automatic 200x200 thumbnail generation (Sharp)',
        'Client-side image preview before upload',
        'Original name, mime type & file size metadata',
        'Cross-origin static asset streaming'
      ]
    },
    {
      title: 'Anti-Fraud Protections',
      items: [
        'ST_DWithin 20m spatial duplicate checks',
        'Trigram string matching for owner & trade names',
        'Geofence zone mismatch warning banner',
        'Immutable audit logs on status transitions',
        'Zero-trust password hashing (bcrypt salt 12)'
      ]
    }
  ];

  features.forEach((f, idx) => {
    const xPos = 0.8 + idx * 5.95;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.5, w: 5.75, h: 5.0, rectRadius: 0.15,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });

    slide.addText(f.title, {
      x: xPos + 0.4, y: 1.8, w: 5.0, h: 0.4,
      fontSize: 16, bold: true, color: C_DARK, fontFace: 'Calibri'
    });

    const lines = f.items.map((it) => ({
      text: `✓  ${it}\n\n`,
      options: { fontSize: 11.5, color: C_DARK, fontFace: 'Calibri' }
    }));
    slide.addText(lines, {
      x: xPos + 0.4, y: 2.4, w: 5.0, h: 3.8, lineSpacing: 16
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 9: Executive Dashboard & Budget Intelligence
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  addSlideHeader(slide, 'Executive Analytics, Cadastral Maps & Reporting', 'Decision Support');

  const stats = [
    { label: 'Total Revenue Cadastre', value: '4 Assets', sub: 'Indexed & Mapped' },
    { label: 'Valuation Certified', value: 'GH¢ 830,000', sub: 'Rateable Base' },
    { label: 'Annual Bill Potential', value: 'GH¢ 4,600', sub: 'Approved Assessment' },
    { label: 'Average GPS Accuracy', value: '6.7 metres', sub: 'Sub-15m Compliant' }
  ];

  stats.forEach((st, idx) => {
    const xPos = 0.8 + idx * 2.95;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.5, w: 2.8, h: 1.5, rectRadius: 0.12,
      fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
    });
    slide.addText(st.label.toUpperCase(), {
      x: xPos + 0.2, y: 1.7, w: 2.4, h: 0.25,
      fontSize: 8.5, bold: true, color: C_MUTED, fontFace: 'Calibri'
    });
    slide.addText(st.value, {
      x: xPos + 0.2, y: 2.0, w: 2.4, h: 0.5,
      fontSize: 18, bold: true, color: C_BLUE, fontFace: 'Calibri'
    });
    slide.addText(st.sub, {
      x: xPos + 0.2, y: 2.55, w: 2.4, h: 0.25,
      fontSize: 9.5, color: C_EMERALD, fontFace: 'Calibri'
    });
  });

  // Reporting & Export Card
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 3.3, w: 11.73, h: 3.2, rectRadius: 0.15,
    fill: { color: C_CARD_BG }, line: { color: 'E2E8F0', width: 1 }
  });
  slide.addText('Integrated MMDA Operational Capabilities', {
    x: 1.2, y: 3.6, w: 10.5, h: 0.4,
    fontSize: 15, bold: true, color: C_DARK, fontFace: 'Calibri'
  });
  slide.addText([
    { text: '• Interactive Municipal Coverage Map: ', options: { bold: true, color: C_BLUE } },
    { text: 'Clustered marker rendering supporting 50,000+ points with street & satellite base maps.\n\n', options: { color: C_MUTED } },
    { text: '• Direct CSV Cadastral Export: ', options: { bold: true, color: C_BLUE } },
    { text: 'Export all approved records with 24 columns for Ministry of Local Government & GIS import.\n\n', options: { color: C_MUTED } },
    { text: '• Complete User Administration: ', options: { bold: true, color: C_BLUE } },
    { text: 'Full CRUD user management with instant zone assignment, role switches, and account deactivation.', options: { color: C_MUTED } }
  ], {
    x: 1.2, y: 4.1, w: 10.9, h: 2.2, fontSize: 11, fontFace: 'Calibri', lineSpacing: 16
  });
}

// ─────────────────────────────────────────────────────────────
// SLIDE 10: Conclusion & Next Steps
// ─────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C_DARK };

  slide.addText('The Future of MMDA Revenue Mobilization', {
    x: 1.0, y: 1.2, w: 11.0, h: 0.6,
    fontSize: 28, bold: true, color: C_WHITE, fontFace: 'Calibri'
  });

  slide.addText('Key Takeaways & Rollout Readiness', {
    x: 1.0, y: 1.8, w: 11.0, h: 0.4,
    fontSize: 15, color: '94A3B8', fontFace: 'Calibri'
  });

  const summary = [
    {
      title: 'Ready for Field Deployment',
      text: 'Production-ready PWA running on any modern smartphone or tablet browser without App Store friction.'
    },
    {
      title: 'Scalable Spatial Cadastre',
      text: 'Standardized PostGIS schema capable of ingesting entire municipal districts and synchronizing with LVD rolls.'
    },
    {
      title: 'Transparent Fiscal Governance',
      text: 'Auditable separation of powers ensures fair, tamper-evident rates backed by photo evidence and satellite accuracy.'
    }
  ];

  summary.forEach((item, idx) => {
    const yPos = 2.5 + idx * 1.3;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.0, y: yPos, w: 11.33, h: 1.1, rectRadius: 0.1,
      fill: { color: C_NAVY }
    });

    slide.addText(item.title, {
      x: 1.3, y: yPos + 0.18, w: 10.5, h: 0.35,
      fontSize: 13, bold: true, color: '93C5FD', fontFace: 'Calibri'
    });
    slide.addText(item.text, {
      x: 1.3, y: yPos + 0.52, w: 10.5, h: 0.45,
      fontSize: 11, color: 'CBD5E1', fontFace: 'Calibri'
    });
  });

  slide.addText('Zebra RMS  •  Empowering Assemblies with Spatial Intelligence  •  2026', {
    x: 1.0, y: 6.3, w: 11.33, h: 0.3,
    fontSize: 10, color: '64748B', align: 'center', fontFace: 'Calibri'
  });
}

// Write the PowerPoint file to the project workspace root
const outputPath = path.resolve('c:/Users/QUOFFYBOAT/Desktop/dataApp/Zebra_RMS_Executive_Presentation.pptx');
await pres.writeFile({ fileName: outputPath });
console.log(`Presentation generated successfully at: ${outputPath}`);
