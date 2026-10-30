import pg from 'pg';
import dotenv from 'dotenv';
import { executeFallbackQuery } from './fallbackDb.js';

dotenv.config();

const { Pool } = pg;

let useFallback = false;

let rawUrl = process.env.DATABASE_URL || 'postgresql://zebra:zebra_dev@localhost:5432/zebra_rms';

// Auto-correct Supabase pooler username if project ref prefix is missing
if (rawUrl.includes('pooler.supabase.com')) {
  // If user is just 'postgres:' without project ref, and url or project id is available:
  const projectRef = 'rklivuhmhpblqajsaaff';
  if (rawUrl.includes('://postgres:') && !rawUrl.includes('://postgres.')) {
    rawUrl = rawUrl.replace('://postgres:', `://postgres.${projectRef}:`);
  }
}

const connectionString = rawUrl;
const isRemoteDb = connectionString.includes('supabase') || connectionString.includes('pooler') || connectionString.includes('sslmode=require') || connectionString.includes('.co:') || connectionString.includes('.com:');

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isRemoteDb ? 10000 : 2500,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
  if (!useFallback) {
    console.warn('Database connection lost. Operating in spatial memory fallback mode:', err.message);
    useFallback = true;
  }
});

// Test initial connection asynchronously and log status explicitly
(async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT postgis_version()');
    client.release();
    console.log(`===============================================`);
    console.log(`>>> Connected to LIVE PostgreSQL/PostGIS Database! <<<`);
    console.log(`PostGIS Version: ${res.rows[0]?.postgis_version}`);
    console.log(`Database Host: ${connectionString.split('@')[1]?.split('/')[0] || 'localhost'}`);
    console.log(`===============================================`);
    useFallback = false;
  } catch (err) {
    console.error(`===============================================`);
    console.error(`!!! FAILED TO CONNECT TO LIVE DATABASE !!!`);
    console.error(`Error:`, err.message);
    console.error(`Falling back to temporary memory storage. DATA WILL NOT PERSIST!`);
    console.error(`Check your DATABASE_URL on Render environment settings.`);
    console.error(`===============================================`);
    useFallback = true;
  }
})();

/**
 * Execute parameterized query with automatic fallback to embedded spatial store
 */
export async function query(text, params = []) {
  if (useFallback) {
    return executeFallbackQuery(text, params);
  }

  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    }

    return result;
  } catch (err) {
    console.error('Query execution error on live database:', err.message);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect ECONNREFUSED')) {
      useFallback = true;
      return executeFallbackQuery(text, params);
    }
    throw err;
  }
}

/**
 * Acquire a dedicated client from the pool or simulated transaction client
 */
export async function getClient() {
  if (useFallback) {
    return {
      query: (sql, p) => executeFallbackQuery(sql, p),
      release: () => {},
    };
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    useFallback = true;
    return {
      query: (sql, p) => executeFallbackQuery(sql, p),
      release: () => {},
    };
  }
}

export default pool;
