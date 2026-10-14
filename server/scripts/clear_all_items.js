const { query } = require('../config/postgres');
const mongoose = require('mongoose');

async function clearAllProducts() {
  console.log('[ClearProducts] Connecting and purging all product records...');

  try {
    // 1. Clear PostgreSQL items and dependencies
    const resReq = await query('DELETE FROM requests;');
    console.log('[PostgreSQL] Cleared requests:', resReq.rowCount || 0);

    const resTx = await query('DELETE FROM transactions;');
    console.log('[PostgreSQL] Cleared transactions:', resTx.rowCount || 0);

    const resRep = await query('DELETE FROM reports WHERE target_item_id IS NOT NULL;');
    console.log('[PostgreSQL] Cleared item reports:', resRep.rowCount || 0);

    const resAudit = await query("DELETE FROM admin_audit_logs WHERE target_type = 'ITEM';");
    console.log('[PostgreSQL] Cleared item audit logs:', resAudit.rowCount || 0);

    const resItems = await query('DELETE FROM items;');
    console.log('[PostgreSQL] Successfully deleted all items. Count removed:', resItems.rowCount || 0);

    // Verify 0 items remain
    const verifyRes = await query('SELECT COUNT(*)::int as count FROM items;');
    console.log('[PostgreSQL] Verification: Total items in database is now:', verifyRes.rows[0].count);
  } catch (pgErr) {
    console.error('[PostgreSQL] Error clearing items:', pgErr.message);
  }

  // 2. Clear MongoDB items if connected
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/looop';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 }).catch(() => null);
    if (mongoose.connection.readyState === 1) {
      const Item = require('../models/Item');
      const Request = require('../models/Request');
      const Transaction = require('../models/Transaction');
      await Item.deleteMany({});
      await Request.deleteMany({});
      await Transaction.deleteMany({});
      console.log('[MongoDB] Cleared all Mongo item documents.');
      await mongoose.disconnect();
    }
  } catch (mErr) {
    console.log('[MongoDB] Notice (skipped):', mErr.message);
  }

  console.log('[ClearProducts] All products removed successfully!');
  process.exit(0);
}

clearAllProducts();
