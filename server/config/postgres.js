const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let isConnected = false;
let dbInfo = { host: null, database: null, version: null };
let tablesInitialized = false;
let lastConnectionAttempt = 0;
const RECONNECT_COOLDOWN_MS = 30000;

const DEFAULT_NEON_URL = 'postgresql://neondb_owner:npg_PzhnYria0G2e@ep-small-wind-b4hjagr6-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

/**
 * Build PostgreSQL Connection Pool Configuration
 */
const getPoolConfig = () => {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.POSTGRESQL_URL || DEFAULT_NEON_URL;

  if (connectionString) {
    const isSslRequired = process.env.DATABASE_SSL === 'true' || 
      (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));
    
    return {
      connectionString,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PG_MAX_POOL || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };
  }

  // Fallback to individual variables
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'looop',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.PG_MAX_POOL || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
};

/**
 * Initialize PostgreSQL connection pool and create schemas if needed
 */
const connectPostgres = async () => {
  try {
    const config = getPoolConfig();
    pool = new Pool(config);

    // Verify connection
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT version(), current_database() as db_name, inet_server_addr() as server_ip;');
      isConnected = true;
      const row = res.rows[0];
      dbInfo = {
        version: row?.version?.split(' ')?.[0] + ' ' + (row?.version?.split(' ')?.[1] || ''),
        database: row?.db_name,
        host: config.host || 'connected'
      };
      console.log(`[PostgreSQL] Connected successfully to database: ${dbInfo.database}`);
      console.log(`[PostgreSQL] Engine: ${row?.version?.slice(0, 45)}...`);

      // Initialize tables from initPostgres.sql once on startup
      if (!tablesInitialized) {
        const initSqlPath = path.resolve(__dirname, '../scripts/initPostgres.sql');
        if (fs.existsSync(initSqlPath)) {
          const sql = fs.readFileSync(initSqlPath, 'utf8');
          await client.query(sql);
          console.log('[PostgreSQL] Database tables and indexes verified/initialized.');
          tablesInitialized = true;
        }
      }
    } finally {
      client.release();
    }

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
      isConnected = false;
      lastConnectionAttempt = Date.now();
    });

    return pool;
  } catch (err) {
    console.error(`[PostgreSQL] Connection failure: ${err.message}`);
    isConnected = false;
    lastConnectionAttempt = Date.now();
    return null;
  }
};

/**
 * Execute parameterized SQL query against the live PostgreSQL pool.
 * No in-memory fallback: persistence failures must surface immediately.
 */
const query = async (text, params = []) => {
  const now = Date.now();
  if (!pool || !isConnected) {
    if (now - lastConnectionAttempt > RECONNECT_COOLDOWN_MS) {
      lastConnectionAttempt = now;
      await connectPostgres();
    }
  }

  if (!pool || !isConnected) {
    throw new Error('PostgreSQL connection is unavailable');
  }

  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.log(`[PostgreSQL Slow Query] ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (dbErr) {
    console.error('[PostgreSQL Query Error]:', dbErr.message);
    if (
      dbErr.code === 'ECONNRESET' ||
      dbErr.code === '57P01' ||
      dbErr.message.includes('timeout') ||
      dbErr.message.includes('closed') ||
      dbErr.message.includes('terminated')
    ) {
      isConnected = false;
      lastConnectionAttempt = Date.now();
    }
    throw dbErr;
  }
};

/**
 * Close PostgreSQL connection pool safely
 */
const closePostgres = async () => {
  if (pool) {
    try {
      await pool.end();
      isConnected = false;
      console.log('[PostgreSQL] Connection pool safely closed.');
    } catch (err) {
      console.error('[PostgreSQL] Error closing pool:', err.message);
    }
  }
};

/**
 * Get current PostgreSQL status for health checks
 */
const getPostgresStatus = () => {
  return {
    engine: 'PostgreSQL',
    isConnected,
    database: dbInfo.database || process.env.PGDATABASE || 'looop',
    host: dbInfo.host || process.env.PGHOST || '127.0.0.1',
    poolTotalCount: pool?.totalCount || 0,
    poolIdleCount: pool?.idleCount || 0,
    poolWaitingCount: pool?.waitingCount || 0
  };
};

module.exports = {
  pool,
  getPool: () => pool,
  connectPostgres,
  closePostgres,
  query,
  getPostgresStatus
};
