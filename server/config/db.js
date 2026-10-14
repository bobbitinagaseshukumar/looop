const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const { connectPostgres, closePostgres, getPostgresStatus } = require('./postgres');

let isMongoConnected = false;
let isPostgresConnected = false;

/**
 * Connect to Database
 * Defaults to PostgreSQL as the primary SQL engine.
 */
const connectDB = async () => {
  console.log('[Database] Connecting to PostgreSQL database...');
  
  // 1. Attempt PostgreSQL connection
  const pgPool = await connectPostgres();
  if (pgPool) {
    isPostgresConnected = true;
    console.log('[Database] PostgreSQL is active as the primary database.');
  } else {
    console.warn('[Database] PostgreSQL is not reachable at the configured connection string.');
  }

  // 2. Also connect to MongoDB if MONGODB_URI is provided and needed for backwards compatibility
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && !process.env.DISABLE_MONGODB) {
    try {
      const safeUri = mongoUri.replace(/\/\/(.*?):(.*?)@/, '//***:***@');
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 50,
        minPoolSize: 5,
        socketTimeoutMS: 45000
      });
      isMongoConnected = true;
      console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name} (${safeUri})`);
    } catch (err) {
      console.warn(`[MongoDB] Not connected: ${err.message}`);
      isMongoConnected = false;
    }
  }

  return { postgres: isPostgresConnected, mongodb: isMongoConnected };
};

/**
 * Safely Close Database connections
 */
const closeDB = async () => {
  await closePostgres();
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close(false);
      isMongoConnected = false;
      console.log('[MongoDB] Connection pool safely closed.');
    } catch (err) {
      console.error('[MongoDB] Error during connection close:', err.message);
    }
  }
};

/**
 * Get unified DB status for health checks
 */
const getDBStatus = () => {
  const pgStatus = getPostgresStatus();
  const mongoReady = mongoose.connection ? mongoose.connection.readyState : 0;
  const isConn = pgStatus.isConnected || mongoReady === 1;
  
  return {
    engine: 'PostgreSQL',
    isConnected: isConn,
    stateName: isConn ? 'connected' : 'disconnected',
    postgres: pgStatus,
    mongodb: {
      isConnected: mongoReady === 1,
      readyState: mongoReady
    }
  };
};

module.exports = {
  connectDB,
  closeDB,
  getDBStatus,
  connectPostgres,
  closePostgres,
  getPostgresStatus
};
