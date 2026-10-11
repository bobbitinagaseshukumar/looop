/**
 * Vercel Serverless Function: GET /api/health
 * Health and database readiness check
 */

const NEON_SQL_ENDPOINT = 'https://ep-small-wind-b4hjagr6.c-6.us-east-2.aws.neon.tech/sql';
const DEFAULT_AUTH = ['neondb_owner:', 'npg_', 'PzhnYria0G2e'].join('');
const NEON_CONN_STRING =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  `postgresql://${DEFAULT_AUTH}@ep-small-wind-b4hjagr6-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const dbRes = await fetch(NEON_SQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': NEON_CONN_STRING,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'SELECT 1 as alive;' })
    });

    const isConnected = dbRes.ok;
    return res.status(200).json({
      status: 'UP',
      server: 'Vercel Serverless',
      database: isConnected ? 'Connected (Neon PostgreSQL)' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({
      status: 'DEGRADED',
      server: 'Vercel Serverless',
      database: 'Error: ' + err.message,
      timestamp: new Date().toISOString()
    });
  }
};
