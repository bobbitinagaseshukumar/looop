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

let keepAliveTimer = null;

const startKeepAlive = () => {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(async () => {
    if (pool && isConnected) {
      try {
        await pool.query('SELECT 1;');
      } catch (pingErr) {
        // silent ping error
      }
    }
  }, 30000);
  if (keepAliveTimer.unref) keepAliveTimer.unref();
};

let connectingPromise = null;

/**
 * Initialize PostgreSQL connection pool and create schemas if needed
 */
const connectPostgres = async () => {
  if (pool && isConnected) return pool;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      const config = getPoolConfig();
      if (!pool) {
        pool = new Pool(config);
        pool.on('error', (err) => {
          console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
          isConnected = false;
        });
      }

      // Verify connection and pre-warm pool
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

        startKeepAlive();
      } finally {
        client.release();
      }

      return pool;
    } catch (err) {
      console.error(`[PostgreSQL] Connection failure: ${err.message}`);
      isConnected = false;
      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function interpolateSql(sql, params = []) {
  if (!params || params.length === 0) return sql;
  return sql.replace(/\$(\d+)/g, (match, idx) => {
    const i = parseInt(idx, 10) - 1;
    return i >= 0 && i < params.length ? escapeSql(params[i]) : match;
  });
}

const queryNeonHttp = async (text, params = []) => {
  const NEON_SQL_ENDPOINT = 'https://ep-small-wind-b4hjagr6.c-6.us-east-2.aws.neon.tech/sql';
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.POSTGRESQL_URL || DEFAULT_NEON_URL;
  try {
    const finalSql = interpolateSql(text, params);
    const res = await fetch(NEON_SQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connectionString,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: finalSql })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Neon HTTP query error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return {
      rows: data.rows || [],
      rowCount: data.rowCount !== undefined ? data.rowCount : (data.rows ? data.rows.length : 0),
      fields: data.fields || [],
      command: data.command || ''
    };
  } catch (httpErr) {
    console.error('[Neon HTTP Fallback Error]:', httpErr.message);
    throw httpErr;
  }
};

/**
 * Execute parameterized SQL query against PostgreSQL pool with Neon HTTP fallback.
 */
const query = async (text, params = []) => {
  if (!pool || !isConnected) {
    await connectPostgres();
  }

  // If pool is still unavailable, execute via resilient Neon HTTP proxy
  if (!pool || !isConnected) {
    console.log('[PostgreSQL] Using Neon HTTP SQL endpoint fallback...');
    return await queryNeonHttp(text, params);
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
    console.warn('[PostgreSQL Pool Query Warning]:', dbErr.message);
    if (
      dbErr.code === 'ECONNRESET' ||
      dbErr.code === '57P01' ||
      dbErr.message.includes('timeout') ||
      dbErr.message.includes('closed') ||
      dbErr.message.includes('terminated') ||
      dbErr.message.includes('unavailable') ||
      dbErr.message.includes('getaddrinfo')
    ) {
      isConnected = false;
      lastConnectionAttempt = Date.now();
      console.log('[PostgreSQL] Connection dropped, routing query to Neon HTTP fallback...');
      return await queryNeonHttp(text, params);
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
