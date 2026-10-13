const Item = require('../models/Item');
const User = require('../models/User');
const mongoose = require('mongoose');
const matchingService = require('../services/matchingService');
const uploadRulesService = require('../services/uploadRulesService');
const { query: pgQuery } = require('../config/postgres');
const { invalidateDashboardCache } = require('../services/adminDashboardService');
const { invalidateAnalyticsCache } = require('../services/adminAnalyticsService');

/**
 * GET /api/items/upload-rules
 * Public route to fetch platform product upload rules
 */
exports.getUploadRules = async (req, res) => {
  try {
    const rules = await uploadRulesService.getUploadRules();
    return res.status(200).json({
      success: true,
      rules
    });
  } catch (error) {
    console.error('Error fetching upload rules:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch upload rules.',
      rules: uploadRulesService.DEFAULT_UPLOAD_RULES
    });
  }
};

/**
 * POST /api/items/upload-media
 * Uploads a single media item (image or pdf)
 */
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process file upload.'
    });
  }
};

/**
 * Item Controller
 * Handles item creation, listing, retrieval, and sharing workflows
 */
exports.createItem = async (req, res) => {
  try {
    const rules = await uploadRulesService.getUploadRules();
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';

    const {
      title,
      description,
      category,
      subcategory,
      brand,
      model,
      images,
      sharingType,
      condition,
      location,
      coordinates,
      borrowSettings,
      exchangeDetails,
      specifications
    } = req.body;

    // Rules validation
    if (rules.customerUploadAllowed === false && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Product listing uploads by customers are currently disabled by platform administration.'
      });
    }

    if (rules.requiredTitle && (!title || !title.trim())) {
      return res.status(400).json({ success: false, message: 'Item title is required.' });
    }

    if (rules.requiredDescription && (!description || !description.trim())) {
      return res.status(400).json({ success: false, message: 'Item description is required.' });
    }

    if (rules.requiredCategory && !category) {
      return res.status(400).json({ success: false, message: 'Please select a category.' });
    }

    if (rules.requiredCondition && !condition) {
      return res.status(400).json({ success: false, message: 'Please select the item condition.' });
    }

    if (!images || !Array.isArray(images) || images.length < rules.minImages) {
      return res.status(400).json({
        success: false,
        message: `Please upload at least ${rules.minImages} photo(s) of the item.`
      });
    }

    if (images.length > rules.maxImages) {
      return res.status(400).json({
        success: false,
        message: `You can upload up to ${rules.maxImages} photos per item according to current settings.`
      });
    }

    if (rules.requiredPrimaryImage && !images.some(img => typeof img === 'object' && img.isPrimary)) {
      if (typeof images[0] === 'object') {
        images[0].isPrimary = true;
      }
    }

    if (rules.requiredSpecifications && (!specifications || !Array.isArray(specifications) || specifications.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Product specifications are required.'
      });
    }

    // Format sanitized images array
    const formattedImages = images.slice(0, rules.maxImages).map((img, index) => {
      if (typeof img === 'string') {
        return { url: img, isPrimary: index === 0 };
      }
      return {
        url: img.url,
        isPrimary: img.isPrimary !== undefined ? Boolean(img.isPrimary) : index === 0,
        caption: img.caption || ''
      };
    });

    const parsedCity = location?.city || (typeof location === 'string' ? location.split(',')[0] : 'Bengaluru');
    const locationObj = {
      city: parsedCity.trim(),
      district: location?.district || '',
      state: location?.state || '',
      locality: location?.locality || '',
      approximateAddress: typeof location === 'string' ? location : (location?.approximateAddress || `${parsedCity}`)
    };

    // 4. Coordinates GeoJSON [longitude, latitude]
    let geoCoords = [77.5946, 12.9716];
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      geoCoords = [Number(coordinates[0]), Number(coordinates[1])];
    } else if (location?.coordinates && Array.isArray(location.coordinates)) {
      geoCoords = [Number(location.coordinates[0]), Number(location.coordinates[1])];
    }

    // 5. Derive authenticated user ID
    const userId = req.user?.id || req.user?._id || `usr-${Date.now()}`;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const userName = req.user?.name || (userEmail ? userEmail.split('@')[0] : 'LOOOP Member');
    const effectiveRole = req.user?.role || userRole || 'customer';
    const ownerIdStr = String(userId);

    let ownerIdMongo = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          ownerIdMongo = new mongoose.Types.ObjectId(userId);
        } else if (userEmail) {
          let mUser = await User.findOne({ email: userEmail });
          if (!mUser) {
            mUser = await User.create({
              name: userName,
              email: userEmail,
              password: '$2a$10$abcdefghijklmnopqrstuv',
              role: effectiveRole,
              trustScore: 100
            });
          }
          ownerIdMongo = mUser._id;
        }
      } catch (mErr) {
        console.warn('[itemController] Mongo user lookup notice:', mErr.message);
      }
    }
    if (!ownerIdMongo) {
      ownerIdMongo = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId();
    }

    // 6. Ensure user exists in Neon PostgreSQL to satisfy foreign keys
    try {
      await pgQuery(
        `INSERT INTO users (id, name, email, password, role, avatar, city, state, locality, account_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;`,
        [
          ownerIdStr,
          userName,
          userEmail || `${ownerIdStr}@looop.community`,
          '$2a$10$abcdefghijklmnopqrstuv',
          effectiveRole,
          req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          locationObj.city || '',
          locationObj.state || '',
          locationObj.locality || ''
        ]
      );
    } catch (pgUserErr) {
      console.warn('[itemController] PG user check notice:', pgUserErr.message);
    }

    const neonItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const borrowMaxDays = Number(borrowSettings?.maxDurationDays) || 14;
    const borrowMaxUnit = borrowSettings?.maxDurationUnit || 'days';
    const borrowNotesStr = borrowSettings?.notes ? borrowSettings.notes.trim() : '';
    const exchangeWantedStr = exchangeDetails?.wantedItems ? exchangeDetails.wantedItems.trim() : '';
    const lng = Number(geoCoords[0]);
    const lat = Number(geoCoords[1]);

    const newItemData = {
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      subcategory: subcategory ? subcategory.trim() : 'General',
      brand: brand ? brand.trim() : '',
      model: model ? model.trim() : '',
      images: formattedImages,
      sharingType: sharingType || 'give_away',
      condition: condition || 'good',
      availability: req.body.availability || 'Available',
      status: req.body.status || 'active',
      approvalStatus: req.body.approvalStatus || 'APPROVED',
      rejectionReason: '',
      specifications: Array.isArray(specifications) ? specifications : [],
      location: locationObj,
      locationCoordinates: {
        type: 'Point',
        coordinates: geoCoords
      },
      owner: ownerIdMongo
    };

    if (sharingType === 'borrow') {
      newItemData.borrowSettings = {
        maxDurationDays: borrowMaxDays,
        maxDurationUnit: borrowMaxUnit,
        notes: borrowNotesStr
      };
    } else if (sharingType === 'exchange') {
      newItemData.exchangeDetails = {
        wantedItems: exchangeWantedStr
      };
    }

    // 7. Save item into Neon PostgreSQL Database Backend
    let pgSavedItem = null;
    try {
      const pgRes = await pgQuery(
        `INSERT INTO items (
          id, title, description, category, subcategory, brand, model, images,
          sharing_type, condition, availability, status, city, district, state,
          locality, approximate_address, latitude, longitude, borrow_max_duration_days,
          borrow_max_duration_unit, borrow_notes, exchange_wanted_items, owner_id,
          views_count, saves_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23, $24,
          0, 0, NOW(), NOW()
        ) RETURNING *;`,
        [
          neonItemId,
          title.trim(),
          description.trim(),
          category.toLowerCase(),
          subcategory ? subcategory.trim() : 'General',
          brand ? brand.trim() : '',
          model ? model.trim() : '',
          JSON.stringify(formattedImages),
          sharingType || 'give_away',
          condition || 'good',
          'Available',
          'active',
          locationObj.city,
          locationObj.district,
          locationObj.state,
          locationObj.locality,
          locationObj.approximateAddress,
          lat,
          lng,
          borrowMaxDays,
          borrowMaxUnit,
          borrowNotesStr,
          exchangeWantedStr,
          ownerIdStr
        ]
      );
      if (pgRes?.rows?.[0]) {
        pgSavedItem = pgRes.rows[0];
        console.log(`[Neon PostgreSQL] Item successfully saved with ID: ${pgSavedItem.id}`);
      }
    } catch (pgErr) {
      console.error('[Neon PostgreSQL] Error saving item:', pgErr.message);
    }

    // 8. Invalidate admin profile and admin dashboard caches so numbers update/increment instantly
    invalidateDashboardCache();
    invalidateAnalyticsCache();

    // 9. Record item creation event in Neon admin audit logs
    try {
      await pgQuery(
        `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, target_title, metadata, created_at, updated_at)
         VALUES ($1, $2, 'ITEM_CREATED', 'ITEM', $3, $4, $5::jsonb, NOW(), NOW());`,
        [
          `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ownerIdStr,
          pgSavedItem ? pgSavedItem.id : neonItemId,
          title.trim(),
          JSON.stringify({ category, sharingType, city: locationObj.city })
        ]
      );
    } catch {
      // non-critical
    }

    // 10. Attempt MongoDB save if active
    let savedItem;
    if (mongoose.connection.readyState === 1) {
      try {
        const itemDoc = new Item(newItemData);
        savedItem = await itemDoc.save();
        matchingService.triggerMatchingForItem(savedItem).catch((err) => {
          console.error('[itemController] Error triggering matching for item:', err.message);
        });
      } catch (mongoErr) {
        console.warn('[itemController] Mongo save warning:', mongoErr.message);
      }
    }

    // Return Neon-backed item response
    let dbOwner = null;
    try {
      const uRes = await pgQuery(
        'SELECT name, avatar, trust_score, rating, response_rate, city, locality, state, bio, verified, created_at, reviews_count FROM users WHERE id = $1 LIMIT 1;',
        [ownerIdStr]
      );
      if (uRes?.rows?.[0]) {
        dbOwner = uRes.rows[0];
      }
    } catch {}

    const finalItem = {
      _id: pgSavedItem ? pgSavedItem.id : (savedItem?._id || neonItemId),
      id: pgSavedItem ? pgSavedItem.id : (savedItem?.id || neonItemId),
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      subcategory: subcategory ? subcategory.trim() : 'General',
      images: formattedImages,
      sharingType: sharingType || 'give_away',
      condition: condition || 'good',
      availability: 'Available',
      status: 'active',
      location: locationObj,
      locationCoordinates: { type: 'Point', coordinates: [lng, lat] },
      owner: {
        id: ownerIdStr,
        _id: ownerIdStr,
        name: dbOwner?.name || req.user?.name || userName || 'LOOOP Member',
        avatar: dbOwner?.avatar || req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        trustScore: dbOwner?.trust_score || req.user?.trustScore || 98,
        rating: dbOwner?.rating || req.user?.rating || 5.0,
        responseRate: dbOwner?.response_rate || 'Under 1 hour',
        city: dbOwner?.city || locationObj.city || '',
        locality: dbOwner?.locality || locationObj.locality || '',
        state: dbOwner?.state || locationObj.state || '',
        bio: dbOwner?.bio || '',
        verified: dbOwner?.verified !== false,
        memberSince: dbOwner?.created_at || new Date().toISOString()
      },
      createdAt: pgSavedItem?.created_at || new Date().toISOString(),
      updatedAt: pgSavedItem?.updated_at || new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: 'Your item has been shared and saved to Neon backend!',
      item: finalItem
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return res.status(500).json({
      success: false,
      message: 'We couldn’t publish your item right now. Please try again.'
    });
  }
};

const { calculateHaversineDistance, resolveCoordinates } = require('../utils/geoUtils');

exports.getItems = async (req, res) => {
  return exports.discoverItems(req, res);
};

exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Attempt to fetch from Neon PostgreSQL Database Backend
    try {
      const pgRes = await pgQuery(
        `SELECT 
          i.*, 
          u.name AS owner_name, 
          u.avatar AS owner_avatar, 
          u.trust_score AS owner_trust_score, 
          u.rating AS owner_rating,
          u.response_rate AS owner_response_rate,
          u.city AS owner_city,
          u.locality AS owner_locality,
          u.state AS owner_state,
          u.bio AS owner_bio,
          u.verified AS owner_verified,
          u.created_at AS owner_created_at,
          u.reviews_count AS owner_reviews_count
        FROM items i 
        LEFT JOIN users u ON i.owner_id = u.id 
        WHERE i.id = $1 LIMIT 1;`,
        [id]
      );

      if (pgRes?.rows?.[0]) {
        const row = pgRes.rows[0];
        let parsedImages = [];
        try {
          parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
        } catch {
          parsedImages = [];
        }

        const itemObj = {
          _id: row.id,
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          subcategory: row.subcategory || 'General',
          brand: row.brand || '',
          model: row.model || '',
          images: parsedImages,
          sharingType: row.sharing_type,
          condition: row.condition,
          availability: row.availability,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          location: {
            city: row.city || '',
            locality: row.locality || '',
            district: row.district || '',
            state: row.state || '',
            approximateAddress: row.approximate_address || `${row.locality ? row.locality + ', ' : ''}${row.city || ''}`
          },
          locationCoordinates: {
            type: 'Point',
            coordinates: [row.longitude || 77.5946, row.latitude || 12.9716]
          },
          owner: {
            _id: row.owner_id,
            id: row.owner_id,
            name: row.owner_name || 'LOOOP Member',
            avatar: row.owner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            trustScore: row.owner_trust_score || 95,
            rating: row.owner_rating || 5.0,
            responseRate: row.owner_response_rate || 'Under 1 hour',
            city: row.owner_city || row.city || '',
            locality: row.owner_locality || row.locality || '',
            state: row.owner_state || row.state || '',
            bio: row.owner_bio || '',
            verified: row.owner_verified !== false,
            memberSince: row.owner_created_at || row.created_at,
            reviewsCount: row.owner_reviews_count || 0
          }
        };

        return res.status(200).json({
          success: true,
          item: itemObj
        });
      }
    } catch (pgErr) {
      console.warn('[itemController] getItemById PG notice:', pgErr.message);
    }

    // 2. Fallback to MongoDB
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      const item = await Item.findById(id).populate('owner', 'name avatar trustScore rating responseRate');
      if (item) {
        return res.status(200).json({
          success: true,
          item
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Item not found.'
    });
  } catch (error) {
    console.error('Error fetching item by id:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch item details.'
    });
  }
};

/**
 * Fetch items owned by currently authenticated user
 * Derives ownership strictly from req.user
 */
exports.getMyItems = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session missing.'
      });
    }

    const {
      search = '',
      category = 'all',
      sharingType = 'all',
      condition = 'all',
      status = 'all',
      sort = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const userEmail = (req.user?.email || '').toLowerCase().trim();

    // 1. Try Neon PostgreSQL first
    try {
      let whereSql = 'WHERE (owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE LOWER(email) = $2)) AND status != \'removed\'';
      const params = [String(userId), userEmail];
      let paramIdx = 3;

      if (category && category !== 'all') {
        whereSql += ` AND LOWER(category) = $${paramIdx++}`;
        params.push(category.toLowerCase().trim());
      }
      if (sharingType && sharingType !== 'all') {
        whereSql += ` AND LOWER(sharing_type) = $${paramIdx++}`;
        params.push(sharingType.toLowerCase().trim());
      }
      if (condition && condition !== 'all') {
        whereSql += ` AND LOWER(condition) = $${paramIdx++}`;
        params.push(condition.toLowerCase().trim());
      }
      if (search && search.trim()) {
        whereSql += ` AND (title ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`;
        params.push(`%${search.trim()}%`);
        paramIdx++;
      }

      const countSql = `SELECT COUNT(*)::int as total FROM items ${whereSql};`;
      const countRes = await pgQuery(countSql, params);
      const total = countRes?.rows?.[0]?.total || 0;

      const dataSql = `SELECT * FROM items ${whereSql} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++};`;
      const dataRes = await pgQuery(dataSql, [...params, parsedLimit, skip]);

      if (dataRes && dataRes.rows && dataRes.rows.length > 0) {
        const items = dataRes.rows.map(row => {
          let parsedImages = [];
          try {
            parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
          } catch {
            parsedImages = [];
          }

          return {
            _id: row.id,
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category,
            subcategory: row.subcategory || 'General',
            brand: row.brand || '',
            model: row.model || '',
            images: parsedImages,
            sharingType: row.sharing_type,
            condition: row.condition,
            availability: row.availability,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            location: {
              city: row.city || '',
              locality: row.locality || '',
              district: row.district || '',
              state: row.state || '',
              approximateAddress: row.approximate_address || ''
            }
          };
        });

        return res.status(200).json({
          success: true,
          items,
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit) || 1
        });
      }
    } catch (pgMyErr) {
      console.warn('[itemController] getMyItems PG notice:', pgMyErr.message);
    }

    // 2. Fallback to Mongo
    let mongoOwnerIds = [];
    if (mongoose.Types.ObjectId.isValid(userId)) {
      mongoOwnerIds.push(new mongoose.Types.ObjectId(userId));
    }
    if (userEmail && mongoose.connection.readyState === 1) {
      try {
        const mUser = await User.findOne({ email: userEmail });
        if (mUser) mongoOwnerIds.push(mUser._id);
      } catch {}
    }

    const query = {
      $or: [
        { owner: { $in: mongoOwnerIds } },
        { owner: userId }
      ]
    };
    if (status !== 'removed') {
      query.status = { $ne: 'removed' };
    }

    if (mongoose.connection.readyState === 1) {
      const skipMongo = (Math.max(1, Number(page)) - 1) * Number(limit);
      const items = await Item.find(query)
        .sort({ createdAt: -1 })
        .skip(skipMongo)
        .limit(Number(limit))
        .catch(() => []);

      const total = await Item.countDocuments(query).catch(() => 0);

      return res.status(200).json({
        success: true,
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1
      });
    }

    return res.status(200).json({
      success: true,
      items: [],
      total: 0,
      page: 1,
      limit: Number(limit),
      totalPages: 1
    });
  } catch (error) {
    console.error('Error in getMyItems:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load your items right now.'
    });
  }
};

/**
 * Aggregated summary statistics of user listings
 */
exports.getMyItemsSummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    let total = 0;
    let available = 0;
    let pending = 0;
    let borrowed = 0;
    let completed = 0;

    // Try Neon PostgreSQL first
    try {
      const pgRes = await pgQuery(
        `SELECT 
          COUNT(*)::int AS total,
          COUNT(CASE WHEN availability = 'Available' AND status = 'active' THEN 1 END)::int AS available,
          COUNT(CASE WHEN status = 'pending moderation' THEN 1 END)::int AS pending,
          COUNT(CASE WHEN availability = 'Reserved' THEN 1 END)::int AS borrowed,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed
        FROM items
        WHERE owner_id = $1 AND status != 'removed';`,
        [String(userId)]
      );

      if (pgRes?.rows?.[0]) {
        const row = pgRes.rows[0];
        total = row.total;
        available = row.available;
        pending = row.pending;
        borrowed = row.borrowed;
        completed = row.completed;
      }
    } catch {
      // fallback
    }

    if (total === 0 && mongoose.connection.readyState === 1) {
      total = await Item.countDocuments({ owner: userId, status: { $ne: 'removed' } }).catch(() => 0);
      available = await Item.countDocuments({ owner: userId, status: 'active', availability: 'Available' }).catch(() => 0);
      pending = await Item.countDocuments({ owner: userId, status: 'pending moderation' }).catch(() => 0);
      borrowed = await Item.countDocuments({ owner: userId, availability: 'Reserved', status: { $ne: 'removed' } }).catch(() => 0);
      completed = await Item.countDocuments({ owner: userId, status: 'completed' }).catch(() => 0);
    }

    return res.status(200).json({
      success: true,
      summary: {
        total,
        available,
        pending,
        borrowed,
        completed
      }
    });
  } catch (error) {
    console.error('Error in getMyItemsSummary:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load summary statistics.'
    });
  }
};

/**
 * Toggle listing availability (Available / Unavailable)
 */
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const { availability } = req.body;

    if (!['Available', 'Unavailable'].includes(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availability status.'
      });
    }

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      const item = await Item.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found.'
        });
      }

      // Enforce ownership
      if (item.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this listing.'
        });
      }

      item.availability = availability;
      await item.save();

      // If item becomes unavailable, invalidate active matches
      if (availability !== 'Available') {
        matchingService.invalidateItemMatches(item._id).catch((err) => {
          console.error('[itemController] Error invalidating matches on availability change:', err.message);
        });
      }

      return res.status(200).json({
        success: true,
        message: `Listing marked as ${availability.toLowerCase()}.`,
        item
      });
    }

    return res.status(200).json({
      success: true,
      message: `Listing marked as ${availability.toLowerCase()}.`,
      item: { id, availability }
    });
  } catch (error) {
    console.error('Error in updateAvailability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update item availability.'
    });
  }
};

/**
 * Soft delete / remove item from active discovery
 */
exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      const item = await Item.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found.'
        });
      }

      // Enforce ownership
      if (item.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove this listing.'
        });
      }

      // Soft delete to preserve historical integrity and request records
      item.status = 'removed';
      item.availability = 'Unavailable';
      await item.save();

      // Invalidate active matches
      matchingService.invalidateItemMatches(item._id).catch((err) => {
        console.error('[itemController] Error invalidating matches on delete:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Listing has been removed from active community discovery.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Listing has been removed from active community discovery.'
    });
  } catch (error) {
    console.error('Error in deleteItem:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove listing.'
    });
  }
};

/**
 * GET /api/items/discover
 * Real backend-powered, privacy-first community discovery endpoint.
 * Supports geospatial radius filtering ($geoNear / Haversine), text-based location fallback,
 * multi-attribute filtering, deterministic sorting, pagination, and privacy sanitization.
 */
exports.discoverItems = async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      sharingType,
      condition,
      city,
      district,
      state,
      radius = 25,
      latitude,
      longitude,
      sort = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    // Bounds checking and sanitization
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const parsedRadius = Math.min(100, Math.max(1, parseFloat(radius) || 25));
    const skip = (parsedPage - 1) * parsedLimit;

    // Check if valid client coordinates are provided
    const hasValidCoords =
      latitude !== undefined &&
      longitude !== undefined &&
      latitude !== '' &&
      longitude !== '' &&
      !isNaN(parseFloat(latitude)) &&
      !isNaN(parseFloat(longitude)) &&
      parseFloat(latitude) >= -90 &&
      parseFloat(latitude) <= 90 &&
      parseFloat(longitude) >= -180 &&
      parseFloat(longitude) <= 180;

    const userLat = hasValidCoords ? parseFloat(latitude) : 12.9716;
    const userLon = hasValidCoords ? parseFloat(longitude) : 77.5946;

    let items = [];
    let total = 0;

    // 1. Attempt to query Neon PostgreSQL Database Backend
    try {
      const whereConditions = [
        "(LOWER(i.status) = 'active' OR i.status IS NULL)",
        "(LOWER(i.availability) != 'removed' OR i.availability IS NULL)"
      ];
      const countParams = [];

      if (req.query.availability && req.query.availability !== 'all') {
        const avClean = req.query.availability.toLowerCase().trim();
        countParams.push(`%${avClean}%`);
        whereConditions.push(`LOWER(i.availability) ILIKE $${countParams.length}`);
      }

      if (category && category !== 'all') {
        const catClean = category.toLowerCase().trim();
        if (catClean === 'clothing' || catClean === 'clothes') {
          whereConditions.push("(LOWER(i.category) ILIKE '%cloth%' OR LOWER(i.category) ILIKE '%apparel%')");
        } else if (catClean === 'home' || catClean === 'kitchen') {
          whereConditions.push("(LOWER(i.category) ILIKE '%home%' OR LOWER(i.category) ILIKE '%kitchen%')");
        } else if (catClean === 'furniture') {
          whereConditions.push("(LOWER(i.category) ILIKE '%furn%')");
        } else if (catClean === 'books' || catClean === 'education' || catClean === 'study_materials' || catClean === 'study materials') {
          whereConditions.push("(LOWER(i.category) ILIKE '%book%' OR LOWER(i.category) ILIKE '%study%' OR LOWER(i.category) ILIKE '%educat%')");
        } else if (catClean === 'tools') {
          whereConditions.push("(LOWER(i.category) ILIKE '%tool%' OR LOWER(i.category) ILIKE '%diy%')");
        } else if (catClean === 'sports') {
          whereConditions.push("(LOWER(i.category) ILIKE '%sport%' OR LOWER(i.category) ILIKE '%outdoor%')");
        } else if (catClean === 'toys') {
          whereConditions.push("(LOWER(i.category) ILIKE '%toy%' OR LOWER(i.category) ILIKE '%game%')");
        } else if (catClean === 'electronics') {
          whereConditions.push("(LOWER(i.category) ILIKE '%elect%' OR LOWER(i.category) ILIKE '%gadget%' OR LOWER(i.category) ILIKE '%phone%')");
        } else {
          countParams.push(`%${catClean}%`);
          whereConditions.push(`LOWER(i.category) ILIKE $${countParams.length}`);
        }
      }

      if (sharingType && sharingType !== 'all') {
        const stClean = sharingType.toLowerCase().trim();
        if (stClean === 'give_away' || stClean === 'giveaway' || stClean === 'free') {
          whereConditions.push("LOWER(i.sharing_type) IN ('give_away', 'giveaway', 'free')");
        } else {
          countParams.push(stClean);
          whereConditions.push(`LOWER(i.sharing_type) = $${countParams.length}`);
        }
      }

      if (condition && condition !== 'all') {
        countParams.push(`%${condition.toLowerCase().trim()}%`);
        whereConditions.push(`LOWER(i.condition) ILIKE $${countParams.length}`);
      }

      if (city && city.trim() && city.toLowerCase() !== 'all') {
        countParams.push(`%${city.toLowerCase().trim()}%`);
        const cIdx = countParams.length;
        whereConditions.push(`(LOWER(i.city) ILIKE $${cIdx} OR LOWER(i.locality) ILIKE $${cIdx} OR LOWER(i.approximate_address) ILIKE $${cIdx} OR LOWER(i.state) ILIKE $${cIdx})`);
      }

      if (search && search.trim()) {
        countParams.push(`%${search.trim()}%`);
        const sIdx = countParams.length;
        whereConditions.push(`(i.title ILIKE $${sIdx} OR i.description ILIKE $${sIdx} OR i.locality ILIKE $${sIdx} OR i.city ILIKE $${sIdx})`);
      }

      const countWhere = `WHERE ${whereConditions.join(' AND ')}`;
      const countSql = `SELECT COUNT(*)::int as total FROM items i ${countWhere};`;
      const countRes = await pgQuery(countSql, countParams);
      const pgTotal = countRes?.rows?.[0]?.total || 0;

      // Data query with distance calculation
      // $1 = userLat, $2 = userLon
      const dataWhereConditions = [
        "(LOWER(i.status) = 'active' OR i.status IS NULL)",
        "(LOWER(i.availability) != 'removed' OR i.availability IS NULL)"
      ];
      const dataParams = [userLat, userLon];

      if (req.query.availability && req.query.availability !== 'all') {
        const avClean = req.query.availability.toLowerCase().trim();
        dataParams.push(`%${avClean}%`);
        dataWhereConditions.push(`LOWER(i.availability) ILIKE $${dataParams.length}`);
      }

      if (category && category !== 'all') {
        const catClean = category.toLowerCase().trim();
        if (catClean === 'clothing' || catClean === 'clothes') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%cloth%' OR LOWER(i.category) ILIKE '%apparel%')");
        } else if (catClean === 'home' || catClean === 'kitchen') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%home%' OR LOWER(i.category) ILIKE '%kitchen%')");
        } else if (catClean === 'furniture') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%furn%')");
        } else if (catClean === 'books' || catClean === 'education' || catClean === 'study_materials' || catClean === 'study materials') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%book%' OR LOWER(i.category) ILIKE '%study%' OR LOWER(i.category) ILIKE '%educat%')");
        } else if (catClean === 'tools') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%tool%' OR LOWER(i.category) ILIKE '%diy%')");
        } else if (catClean === 'sports') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%sport%' OR LOWER(i.category) ILIKE '%outdoor%')");
        } else if (catClean === 'toys') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%toy%' OR LOWER(i.category) ILIKE '%game%')");
        } else if (catClean === 'electronics') {
          dataWhereConditions.push("(LOWER(i.category) ILIKE '%elect%' OR LOWER(i.category) ILIKE '%gadget%' OR LOWER(i.category) ILIKE '%phone%')");
        } else {
          dataParams.push(`%${catClean}%`);
          dataWhereConditions.push(`LOWER(i.category) ILIKE $${dataParams.length}`);
        }
      }

      if (sharingType && sharingType !== 'all') {
        const stClean = sharingType.toLowerCase().trim();
        if (stClean === 'give_away' || stClean === 'giveaway' || stClean === 'free') {
          dataWhereConditions.push("LOWER(i.sharing_type) IN ('give_away', 'giveaway', 'free')");
        } else {
          dataParams.push(stClean);
          dataWhereConditions.push(`LOWER(i.sharing_type) = $${dataParams.length}`);
        }
      }

      if (condition && condition !== 'all') {
        dataParams.push(`%${condition.toLowerCase().trim()}%`);
        dataWhereConditions.push(`LOWER(i.condition) ILIKE $${dataParams.length}`);
      }

      if (city && city.trim() && city.toLowerCase() !== 'all') {
        dataParams.push(`%${city.toLowerCase().trim()}%`);
        const cIdx = dataParams.length;
        dataWhereConditions.push(`(LOWER(i.city) ILIKE $${cIdx} OR LOWER(i.locality) ILIKE $${cIdx} OR LOWER(i.approximate_address) ILIKE $${cIdx} OR LOWER(i.state) ILIKE $${cIdx})`);
      }

      if (search && search.trim()) {
        dataParams.push(`%${search.trim()}%`);
        const sIdx = dataParams.length;
        dataWhereConditions.push(`(i.title ILIKE $${sIdx} OR i.description ILIKE $${sIdx} OR i.locality ILIKE $${sIdx} OR i.city ILIKE $${sIdx})`);
      }

      let orderSql = "ORDER BY i.created_at DESC";
      if (sort === 'nearest') {
        orderSql = "ORDER BY distance_km ASC NULLS LAST, i.created_at DESC";
      } else if (sort === 'updated') {
        orderSql = "ORDER BY i.updated_at DESC, i.created_at DESC";
      } else {
        orderSql = "ORDER BY i.created_at DESC";
      }

      dataParams.push(parsedLimit, skip);
      const limitIdx = dataParams.length - 1;
      const offsetIdx = dataParams.length;

      const dataSql = `
        SELECT 
          i.*,
          u.name AS owner_name,
          u.avatar AS owner_avatar,
          u.trust_score AS owner_trust_score,
          u.rating AS owner_rating,
          u.reviews_count AS owner_reviews_count,
          u.city AS owner_city,
          u.locality AS owner_locality,
          u.state AS owner_state,
          u.bio AS owner_bio,
          u.verified AS owner_verified,
          u.created_at AS owner_created_at,
          (
            6371 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(($1::double precision - i.latitude) / 2)), 2) +
              COS(RADIANS($1::double precision)) * COS(RADIANS(i.latitude)) *
              POWER(SIN(RADIANS(($2::double precision - i.longitude) / 2)), 2)
            ))
          ) AS distance_km
        FROM items i
        LEFT JOIN users u ON i.owner_id = u.id
        WHERE ${dataWhereConditions.join(' AND ')}
        ${orderSql}
        LIMIT $${limitIdx} OFFSET $${offsetIdx};
      `;

      const dataRes = await pgQuery(dataSql, dataParams);

      if (dataRes && dataRes.rows && dataRes.rows.length > 0) {
        total = pgTotal;
        items = dataRes.rows.map(row => {
          let parsedImages = [];
          try {
            parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
          } catch {
            parsedImages = [];
          }

          const distVal = row.distance_km !== null && row.distance_km !== undefined
            ? Math.round(Number(row.distance_km) * 10) / 10
            : null;

          return {
            _id: row.id,
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category,
            subcategory: row.subcategory || 'General',
            brand: row.brand || '',
            model: row.model || '',
            images: parsedImages,
            sharingType: row.sharing_type,
            condition: row.condition,
            availability: row.availability,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            distanceKm: distVal,
            location: {
              city: row.city || '',
              locality: row.locality || '',
              district: row.district || '',
              state: row.state || '',
              approximateAddress: row.approximate_address || `${row.locality ? row.locality + ', ' : ''}${row.city || ''}`
            },
            locationCoordinates: {
              type: 'Point',
              coordinates: [row.longitude || 77.5946, row.latitude || 12.9716]
            },
            owner: {
              _id: row.owner_id,
              id: row.owner_id,
              name: row.owner_name || 'LOOOP Member',
              avatar: row.owner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
              trustScore: row.owner_trust_score || 95,
              rating: row.owner_rating || 5.0,
              reviewsCount: row.owner_reviews_count || 0,
              city: row.owner_city || row.city || '',
              locality: row.owner_locality || row.locality || '',
              state: row.owner_state || row.state || '',
              bio: row.owner_bio || '',
              verified: row.owner_verified !== false,
              memberSince: row.owner_created_at || row.created_at
            }
          };
        });
      }
    } catch (pgDiscErr) {
      console.warn('[itemController] Neon PG discovery search notice:', pgDiscErr.message);
    }

    // 2. Fallback to MongoDB if Neon PG returned no items
    if (items.length === 0 && mongoose.connection.readyState === 1) {
      const baseFilter = {
        status: 'active',
        availability: 'Available'
      };

      if (category && category !== 'all') {
        baseFilter.category = category.toLowerCase().trim();
      }
      if (sharingType && sharingType !== 'all') {
        baseFilter.sharingType = sharingType.toLowerCase().trim();
      }
      if (condition && condition !== 'all') {
        baseFilter.condition = condition.toLowerCase().trim();
      }

      if (city && city.trim() && city.toLowerCase() !== 'all') {
        const sanitizedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cityRegex = new RegExp(sanitizedCity, 'i');
        baseFilter.$or = [
          { 'location.city': cityRegex },
          { 'location.locality': cityRegex }
        ];
      }

      if (search && search.trim()) {
        const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(sanitizedSearch, 'i');
        const searchOr = [
          { title: searchRegex },
          { description: searchRegex },
          { 'location.locality': searchRegex },
          { 'location.city': searchRegex }
        ];

        if (baseFilter.$or) {
          baseFilter.$and = [{ $or: baseFilter.$or }, { $or: searchOr }];
          delete baseFilter.$or;
        } else {
          baseFilter.$or = searchOr;
        }
      }

      const rawItems = await Item.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('owner', 'name avatar trustScore rating reviewsCount')
        .catch(() => []);

      total = await Item.countDocuments(baseFilter).catch(() => 0);

      items = rawItems.map((item) => {
        let calculatedDist = null;
        if (hasValidCoords && item.locationCoordinates?.coordinates) {
          calculatedDist = matchingService.calculateHaversineDistanceKm(
            [userLon, userLat],
            item.locationCoordinates.coordinates
          );
        }

        return {
          _id: item._id,
          id: item._id,
          title: item.title,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          brand: item.brand || '',
          model: item.model || '',
          images: item.images || [],
          sharingType: item.sharingType,
          condition: item.condition,
          availability: item.availability,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          distanceKm: calculatedDist,
          location: {
            city: item.location?.city || '',
            locality: item.location?.locality || '',
            district: item.location?.district || '',
            state: item.location?.state || '',
            approximateAddress: item.location?.locality
              ? `${item.location.locality}, ${item.location.city || ''}`
              : (item.location?.city || '')
          },
          locationCoordinates: item.locationCoordinates,
          owner: item.owner
        };
      });

      if (hasValidCoords && (sort === 'nearest' || !sort || sort === 'newest')) {
        items.sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }
    }

    return res.status(200).json({
      success: true,
      items,
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit) || 1,
      limit: parsedLimit,
      radius: parsedRadius,
      hasCoordinates: hasValidCoords
    });
  } catch (error) {
    console.error('Error in discoverItems:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to discover items.'
    });
  }
};

/**
 * GET /api/items/nearby
 * Convenience alias for discovering items within proximity
 */
exports.getNearbyItems = async (req, res) => {
  return exports.discoverItems(req, res);
};

/**
 * GET /api/items/:id/matches
 * Retrieves active WantedItem requests from neighbors that match this Item
 */
exports.getItemMatches = async (req, res) => {
  try {
    const { id } = req.params;
    const { minScore = 40, radius } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID.'
      });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.'
      });
    }

    const matches = await matchingService.findMatchesForItem(item, {
      minScore: parseInt(minScore, 10) || 40,
      radiusKm: radius ? parseFloat(radius) : undefined
    });

    return res.status(200).json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    console.error('Error in getItemMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve item matches.'
    });
  }
};

/**
 * GET /api/items/:id/similar or GET /api/items/similar
 * Returns similar available items based on category, subcategory, brand, sharing type, and condition
 * Prioritizes AVAILABLE items over reserved/reused ones.
 */
exports.getSimilarItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, subcategory, brand, sharingType, condition, limit = 8 } = req.query;
    const parsedLimit = Math.min(24, Math.max(1, parseInt(limit, 10) || 8));

    let sourceCategory = category || '';
    let sourceSubcategory = subcategory || '';
    let sourceBrand = brand || '';
    let sourceSharingType = sharingType || '';
    let sourceCondition = condition || '';
    let excludeId = null;

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      excludeId = id;
      if (mongoose.connection.readyState === 1) {
        const sourceItem = await Item.findById(id);
        if (sourceItem) {
          sourceCategory = sourceCategory || sourceItem.category || '';
          sourceSubcategory = sourceSubcategory || sourceItem.subcategory || '';
          sourceBrand = sourceBrand || sourceItem.brand || '';
          sourceSharingType = sourceSharingType || sourceItem.sharingType || '';
          sourceCondition = sourceCondition || sourceItem.condition || '';
        }
      }
    }

    const filter = {
      status: { $ne: 'removed' }
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    if (sourceCategory && sourceCategory !== 'all') {
      filter.category = sourceCategory.toLowerCase().trim();
    }

    let rawItems = [];
    if (mongoose.connection.readyState === 1) {
      rawItems = await Item.find(filter)
        .sort({ createdAt: -1 })
        .limit(40)
        .populate('owner', 'name avatar trustScore verified rating reviewsCount');
    }

    // Score and rank candidates
    const scoredItems = rawItems.map((item) => {
      let score = 0;
      const isAvailable = item.availability === 'Available' || item.status === 'active';

      // Priority 1: AVAILABLE items prioritized FIRST over reserved/reused ones
      if (isAvailable) score += 1000;

      if (sourceSubcategory && item.subcategory && item.subcategory.toLowerCase() === sourceSubcategory.toLowerCase()) {
        score += 50;
      }
      if (sourceBrand && item.brand && item.brand.toLowerCase() === sourceBrand.toLowerCase()) {
        score += 40;
      }
      if (sourceSharingType && item.sharingType === sourceSharingType) {
        score += 20;
      }
      if (sourceCondition && item.condition === sourceCondition) {
        score += 10;
      }

      return { item, score };
    });

    scoredItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.createdAt || 0) - new Date(a.item.createdAt || 0);
    });

    const items = scoredItems.slice(0, parsedLimit).map((s) => ({
      ...s.item.toObject(),
      id: s.item._id
    }));

    return res.status(200).json({
      success: true,
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Error in getSimilarItems:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve similar items.'
    });
  }
};
