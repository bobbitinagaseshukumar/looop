const express = require('express');
const router = express.Router();

const CATEGORY_DEFINITIONS = [
  {
    id: 'books',
    name: 'Books',
    description: 'Literature, novels, textbooks, exam prep, non-fiction',
    subcategories: ['Engineering', 'School', 'Competitive Exams', 'Fiction', 'Non-Fiction', 'Other']
  },
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Gadgets, peripherals, chargers, hardware accessories',
    subcategories: ['Headphones', 'Chargers', 'Keyboards', 'Computer Accessories', 'Audio & Speakers', 'Other']
  },
  {
    id: 'education',
    name: 'Study Materials',
    description: 'Notes, calculators, drafting tools, reference materials',
    subcategories: ['Scientific Calculators', 'Course Notes', 'Lab Equipment', 'Stationery Bundles', 'Drawing Boards', 'Other']
  },
  {
    id: 'furniture',
    name: 'Furniture',
    description: 'Study tables, chairs, bookshelves, ergonomic seating',
    subcategories: ['Study Desks', 'Office Chairs', 'Bookshelves', 'Lamps & Lighting', 'Side Tables', 'Other']
  },
  {
    id: 'clothing',
    name: 'Clothing',
    description: 'Jackets, seasonal wear, formals, reusable garments',
    subcategories: ['Winter Jackets', 'Formal Attire', 'Casual Wear', 'Shoes & Footwear', 'Sportswear', 'Other']
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Fitness equipment, balls, racquets, outdoor gear',
    subcategories: ['Gym & Dumbbells', 'Badminton & Tennis', 'Football & Basketball', 'Bicycle Gear', 'Yoga & Fitness', 'Other']
  },
  {
    id: 'tools',
    name: 'Tools',
    description: 'Hand tools, DIY hardware, electrical meters, drills',
    subcategories: ['Hand Tool Sets', 'Power Drills', 'Multimeters', 'Gardening Tools', 'Hardware Kits', 'Other']
  },
  {
    id: 'home',
    name: 'Home Items',
    description: 'Kitchenware, small appliances, storage containers',
    subcategories: ['Electric Kettles', 'Cookware', 'Storage Organizers', 'Bedding & Linen', 'Tableware', 'Other']
  },
  {
    id: 'accessories',
    name: 'Accessories',
    description: 'Backpacks, bags, travel cases, smart watches',
    subcategories: ['Backpacks & Laptop Bags', 'Watches', 'Eyewear & Cases', 'Travel Luggage', 'Other']
  },
  {
    id: 'mobility',
    name: 'Vehicles / Mobility',
    description: 'Bicycles, skateboards, roller skates, helmets',
    subcategories: ['Bicycles', 'Skateboards', 'Helmets & Locks', 'Cycle Accessories', 'Other']
  },
  {
    id: 'other',
    name: 'Other',
    description: 'General unused useful items, creative supplies',
    subcategories: ['Board Games & Hobbies', 'Art Supplies', 'Musical Instruments', 'Miscellaneous', 'Other']
  }
];

const { query: pgQuery } = require('../config/postgres');
let Item;
try {
  Item = require('../models/Item');
} catch {}

const mapCategoryToId = (rawCat) => {
  if (!rawCat) return 'other';
  const c = String(rawCat).toLowerCase().trim();
  if (c.includes('book') || c.includes('media')) return 'books';
  if (c.includes('elect') || c.includes('gadget')) return 'electronics';
  if (c.includes('study') || c.includes('educat')) return 'education';
  if (c.includes('furn')) return 'furniture';
  if (c.includes('cloth') || c.includes('apparel')) return 'clothing';
  if (c.includes('sport') || c.includes('outdoor')) return 'sports';
  if (c.includes('tool') || c.includes('diy')) return 'tools';
  if (c.includes('home') || c.includes('living') || c.includes('kitchen')) return 'home';
  if (c.includes('access')) return 'accessories';
  if (c.includes('mobil') || c.includes('vehic') || c.includes('cycle') || c.includes('bike')) return 'mobility';
  return 'other';
};

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const countsByCat = {};
    let totalItems = 0;

    // 1. Try PostgreSQL (Neon) active available items
    try {
      const pgRes = await pgQuery(
        "SELECT category, COUNT(*)::int as count FROM items WHERE LOWER(status) = 'active' GROUP BY category;"
      );
      if (pgRes?.rows?.length > 0) {
        pgRes.rows.forEach(r => {
          const catId = mapCategoryToId(r.category);
          const count = parseInt(r.count, 10) || 0;
          totalItems += count;
          countsByCat[catId] = (countsByCat[catId] || 0) + count;
        });
      }
    } catch (pgErr) {
      console.warn('Postgres category count query error:', pgErr.message);
    }

    // 2. If Postgres returned 0 items, try MongoDB fallback
    if (totalItems === 0 && Item) {
      try {
        const mongoAgg = await Item.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        if (mongoAgg && mongoAgg.length > 0) {
          mongoAgg.forEach(r => {
            const catId = mapCategoryToId(r._id);
            const count = r.count || 0;
            totalItems += count;
            countsByCat[catId] = (countsByCat[catId] || 0) + count;
          });
        }
      } catch (mongoErr) {
        // Mongo fallback failed or not connected
      }
    }

    const categoriesWithCounts = CATEGORY_DEFINITIONS.map(cat => ({
      ...cat,
      count: countsByCat[cat.id] || 0
    }));

    return res.status(200).json({
      success: true,
      count: CATEGORY_DEFINITIONS.length,
      totalItems,
      categoryCounts: countsByCat,
      categories: categoriesWithCounts
    });
  } catch (error) {
    console.error('Error fetching categories with counts:', error);
    return res.status(200).json({
      success: true,
      count: CATEGORY_DEFINITIONS.length,
      totalItems: 0,
      categoryCounts: {},
      categories: CATEGORY_DEFINITIONS.map(c => ({ ...c, count: 0 }))
    });
  }
});

module.exports = router;

