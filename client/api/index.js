const app = require('../server/app');
const { connectPostgres } = require('../server/config/postgres');

let isPostgresInitialized = false;

/**
 * Vercel Serverless Function entry point for LOOOP API
 * Routes all /api/* requests directly through Express with live Neon PostgreSQL connectivity
 */
module.exports = async (req, res) => {
  if (!isPostgresInitialized) {
    try {
      await connectPostgres();
      isPostgresInitialized = true;
    } catch (err) {
      console.warn('[Vercel Serverless] PostgreSQL initialization notice:', err.message);
    }
  }
  return app(req, res);
};
