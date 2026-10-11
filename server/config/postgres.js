const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let isConnected = false;
let dbInfo = { host: null, database: null, version: null };

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
      connectionTimeoutMillis: 5000
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
    connectionTimeoutMillis: 5000
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

      // Initialize tables from initPostgres.sql if configured or needed
      const initSqlPath = path.resolve(__dirname, '../scripts/initPostgres.sql');
      if (fs.existsSync(initSqlPath)) {
        const sql = fs.readFileSync(initSqlPath, 'utf8');
        await client.query(sql);
        console.log('[PostgreSQL] Database tables and indexes verified/initialized.');
      }
    } finally {
      client.release();
    }

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
      isConnected = false;
    });

    return pool;
  } catch (err) {
    console.error(`[PostgreSQL] Connection failure: ${err.message}`);
    isConnected = false;
    return null;
  }
};

const memStore = {
  users: [],
  otp_tokens: [],
  email_outbox: [],
  notification_preferences: []
};

/**
 * In-memory SQL query evaluator fallback for offline/test environments
 */
function mockQueryEvaluator(text, params = []) {
  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // 1. INSERT INTO users
  if (lowerSql.includes('insert into users')) {
    const id = params[0];
    const name = params[1];
    const email = (params[2] || '').toLowerCase();
    const password = params[3];
    const verified = params[6] !== undefined ? Boolean(params[6]) : false;
    const user = { id, name, email, password, verified, role: params[4] || 'customer' };
    memStore.users = memStore.users.filter(u => u.email !== email);
    memStore.users.push(user);
    return { rows: [user], rowCount: 1 };
  }

  // 2. SELECT FROM users
  if (lowerSql.includes('from users')) {
    if (lowerSql.includes('lower(email) =')) {
      const targetEmail = (params[0] || '').toLowerCase();
      const match = memStore.users.find(u => u.email === targetEmail);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    return { rows: memStore.users, rowCount: memStore.users.length };
  }

  // 3. UPDATE users
  if (lowerSql.includes('update users')) {
    if (lowerSql.includes('set verified = true')) {
      const targetEmail = (params[0] || '').toLowerCase();
      const match = memStore.users.find(u => u.email === targetEmail);
      if (match) match.verified = true;
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    if (lowerSql.includes('set password =')) {
      const newPassword = params[0];
      const targetEmail = (params[1] || '').toLowerCase();
      const match = memStore.users.find(u => u.email === targetEmail);
      if (match) match.password = newPassword;
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 4. INSERT INTO otp_tokens
  if (lowerSql.includes('insert into otp_tokens')) {
    const record = {
      id: params[0],
      user_id: params[1],
      email: (params[2] || '').toLowerCase(),
      purpose: params[3],
      hashed_otp: params[4],
      expires_at: params[5],
      failed_attempts: 0,
      resend_count: 0,
      consumed_at: null,
      created_at: new Date()
    };
    memStore.otp_tokens.push(record);
    return { rows: [record], rowCount: 1 };
  }

  // 5. UPDATE otp_tokens SET consumed_at
  if (lowerSql.includes('update otp_tokens set consumed_at')) {
    if (params.length === 2 && lowerSql.includes('where email = $1 and purpose = $2')) {
      const email = (params[0] || '').toLowerCase();
      const purpose = params[1];
      memStore.otp_tokens.filter(t => t.email === email && t.purpose === purpose && !t.consumed_at)
        .forEach(t => t.consumed_at = new Date());
      return { rows: [], rowCount: 1 };
    }
    if (params.length === 1 && lowerSql.includes('where id = $1')) {
      const id = params[0];
      const match = memStore.otp_tokens.find(t => t.id === id);
      if (match) match.consumed_at = new Date();
      return { rows: [], rowCount: 1 };
    }
  }

  // 6. UPDATE otp_tokens SET failed_attempts
  if (lowerSql.includes('update otp_tokens set failed_attempts')) {
    const attempts = params[0];
    const id = params[1];
    const match = memStore.otp_tokens.find(t => t.id === id);
    if (match) match.failed_attempts = attempts;
    return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
  }

  // 7. SELECT FROM otp_tokens
  if (lowerSql.includes('from otp_tokens')) {
    let matches = memStore.otp_tokens;
    if (lowerSql.includes('hashed_otp =')) {
      const hash = params[0];
      matches = matches.filter(t => t.hashed_otp === hash);
    } else {
      const email = (params[0] || '').toLowerCase();
      matches = matches.filter(t => t.email === email);
      if (params[1]) {
        matches = matches.filter(t => t.purpose === params[1]);
      }
    }
    if (lowerSql.includes('consumed_at is null')) {
      matches = matches.filter(t => !t.consumed_at);
    }
    matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: matches.slice(0, 1), rowCount: matches.length > 0 ? 1 : 0 };
  }

  // 8. INSERT INTO email_outbox
  if (lowerSql.includes('insert into email_outbox')) {
    const record = {
      id: params[0],
      event_type: params[1],
      deduplication_key: params[2],
      recipient_user_id: params[3],
      recipient_email: (params[4] || '').toLowerCase(),
      template_key: params[5],
      template_data: params[6],
      status: 'PENDING',
      attempt_count: 0,
      next_attempt_at: new Date(),
      created_at: new Date()
    };
    memStore.email_outbox.push(record);
    return { rows: [record], rowCount: 1 };
  }

  // 9. UPDATE email_outbox
  if (lowerSql.includes('update email_outbox')) {
    const status = params[0];
    if (lowerSql.includes('where provider_message_id =')) {
      const msgId = params[params.length - 1];
      const match = memStore.email_outbox.find(o => o.provider_message_id === msgId);
      if (match) {
        match.status = status;
        if (status === 'DELIVERED') match.delivered_at = new Date();
      }
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    if (lowerSql.includes('where id =')) {
      const id = params[params.length - 1];
      const match = memStore.email_outbox.find(o => o.id === id);
      if (match) {
        match.status = status;
        if (params.length > 2) match.provider_message_id = params[1];
      }
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 10. SELECT FROM email_outbox
  if (lowerSql.includes('from email_outbox')) {
    if (lowerSql.includes('deduplication_key =')) {
      const key = params[0];
      const match = memStore.email_outbox.find(o => o.deduplication_key === key);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    if (lowerSql.includes('provider_message_id =')) {
      const msgId = params[0];
      const match = memStore.email_outbox.find(o => o.provider_message_id === msgId);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    if (lowerSql.includes("status in ('pending', 'failed')")) {
      const matches = memStore.email_outbox.filter(o => o.status === 'PENDING' || o.status === 'FAILED');
      return { rows: matches, rowCount: matches.length };
    }
    if (lowerSql.includes('recipient_email =')) {
      const email = (params[0] || '').toLowerCase();
      const matches = memStore.email_outbox.filter(o => o.recipient_email === email);
      return { rows: matches, rowCount: matches.length };
    }
    if (lowerSql.includes('count(*) filter')) {
      const pending = memStore.email_outbox.filter(o => o.status === 'PENDING').length;
      const accepted = memStore.email_outbox.filter(o => o.status === 'ACCEPTED_BY_PROVIDER' || o.status === 'DELIVERED').length;
      const failed = memStore.email_outbox.filter(o => o.status === 'FAILED').length;
      return { rows: [{ pending, accepted, failed, total: memStore.email_outbox.length }] };
    }
    return { rows: memStore.email_outbox, rowCount: memStore.email_outbox.length };
  }

  // 11. INSERT INTO notification_preferences
  if (lowerSql.includes('insert into notification_preferences')) {
    const record = { id: params[0], user_id: params[1], categories: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2] };
    memStore.notification_preferences.push(record);
    return { rows: [record], rowCount: 1 };
  }

  // 12. SELECT FROM notification_preferences
  if (lowerSql.includes('from notification_preferences')) {
    const userId = params[0];
    const match = memStore.notification_preferences.find(np => np.user_id === userId);
    return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
}

/**
 * Execute parameterized SQL query with live DB connection or resilient fallback
 */
const query = async (text, params = []) => {
  if (pool && isConnected) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 200) {
        console.log(`[PostgreSQL Slow Query] ${duration}ms: ${text.slice(0, 100)}`);
      }
      return res;
    } catch (dbErr) {
      if (dbErr.code === 'ENOTFOUND' || dbErr.code === 'EAI_AGAIN' || dbErr.message.includes('getaddrinfo')) {
        console.warn('[PostgreSQL Offline Fallback] Network unavailable, using memory query evaluator.');
        return mockQueryEvaluator(text, params);
      }
      throw dbErr;
    }
  }

  return mockQueryEvaluator(text, params);
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
