const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Item = require('../models/Item');
const Category = require('../models/Category');
const Request = require('../models/Request');
const Transaction = require('../models/Transaction');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const PointsLedger = require('../models/PointsLedger');
const AdminSetting = require('../models/AdminSetting');

/**
 * LOOOP Demo & Development Seeder
 * Idempotently seeds Demo Admin & Demo Customer accounts, realistic products,
 * requests, transactions, and points ledger for quick demo access and testing.
 */
async function seedDemoData() {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.log('[DemoSeeder] MongoDB is not active; PostgreSQL is active as the primary database. Skipping Mongo seeding.');
      return;
    }

    console.log('[DemoSeeder] Running idempotent demo seeding check...');

    // 1. Ensure Demo Admin Account exists
    const adminEmail = 'admin@reusehub.demo';
    let admin = await User.findOne({ email: adminEmail });
    const adminHashedPassword = await bcrypt.hash('Admin@12345', 10);

    if (!admin) {
      admin = await User.create({
        name: 'ReuseHub Master Admin',
        email: adminEmail,
        password: adminHashedPassword,
        role: 'admin',
        accountStatus: 'active',
        verified: true,
        trustScore: 100,
        rating: 5.0,
        points: 1250,
        city: 'Bengaluru',
        locality: 'Indiranagar',
        state: 'Karnataka',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Platform Operations & Community Moderator for ReuseHub.'
      });
      console.log(`[DemoSeeder] Created Demo Admin: ${admin.email}`);
    } else {
      admin.role = 'admin';
      admin.accountStatus = 'active';
      admin.verified = true;
      await admin.save();
      console.log(`[DemoSeeder] Verified Demo Admin: ${admin.email}`);
    }

    // 2. Ensure Demo Customer Account exists
    const customerEmail = 'customer@reusehub.demo';
    let customer = await User.findOne({ email: customerEmail });
    const customerHashedPassword = await bcrypt.hash('Customer@12345', 10);

    if (!customer) {
      customer = await User.create({
        name: 'John Kumar',
        email: customerEmail,
        password: customerHashedPassword,
        role: 'customer',
        accountStatus: 'active',
        verified: true,
        trustScore: 96,
        rating: 4.9,
        points: 450,
        city: 'Bengaluru',
        locality: 'Whitefield',
        state: 'Karnataka',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        bio: 'Avid circular economy enthusiast. Sharing study materials and borrowing DIY tools.'
      });
      console.log(`[DemoSeeder] Created Demo Customer: ${customer.email}`);
    } else {
      customer.role = 'customer';
      customer.accountStatus = 'active';
      customer.verified = true;
      if (!customer.points || customer.points < 450) customer.points = 450;
      await customer.save();
      console.log(`[DemoSeeder] Verified Demo Customer: ${customer.email}`);
    }

    // 3. Ensure Additional Community Members exist for trading partner interactions
    const partnersData = [
      { name: 'Vikram Joshi', email: 'vikram.joshi@demo.com', city: 'Bengaluru', locality: 'Whitefield', trustScore: 98, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
      { name: 'Ananya Sharma', email: 'ananya.sharma@demo.com', city: 'Bengaluru', locality: 'Koramangala', trustScore: 95, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
      { name: 'Rahul Verma', email: 'rahul.verma@demo.com', city: 'Bengaluru', locality: 'Indiranagar', trustScore: 92, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' }
    ];

    const seededUsers = [admin, customer];
    for (const p of partnersData) {
      let u = await User.findOne({ email: p.email });
      if (!u) {
        u = await User.create({
          ...p,
          password: await bcrypt.hash('Partner@12345', 10),
          role: 'customer',
          accountStatus: 'active',
          verified: true,
          points: 300
        });
      }
      seededUsers.push(u);
    }

    // 4. Ensure Essential Categories exist
    const defaultCategories = [
      { name: 'Furniture', slug: 'furniture', subcategories: ['Study Chairs', 'Desks', 'Tables', 'Storage'] },
      { name: 'Electronics', slug: 'electronics', subcategories: ['Calculators', 'Laptops', 'Monitors', 'Audio'] },
      { name: 'Books & Study', slug: 'books-study', subcategories: ['Engineering', 'Medical', 'Literature', 'Exam Prep'] },
      { name: 'Tools & DIY', slug: 'tools-diy', subcategories: ['Power Tools', 'Hand Tools', 'Gardening'] },
      { name: 'Sports & Gear', slug: 'sports-gear', subcategories: ['Bicycles', 'Fitness', 'Camping'] }
    ];

    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { ...cat, isActive: true },
        { upsert: true, new: true }
      );
    }

    // 5. Seed Products if item count is low (< 8 items)
    const itemCount = await Item.countDocuments();
    if (itemCount < 8) {
      const demoOwner = seededUsers[2]; // Vikram Joshi
      const demoOwner2 = seededUsers[3]; // Ananya Sharma

      const demoProducts = [
        {
          title: 'Ergonomic Mesh Study Chair with Lumbar Support',
          description: 'Comfortable ergonomic study chair with adjustable lumbar support and height controls. Used carefully for 1 year and in excellent working condition.',
          category: 'Furniture',
          subcategory: 'Study Chairs',
          condition: 'Like New',
          sharingType: 'give_away',
          availability: 'Available',
          owner: demoOwner._id,
          location: { city: 'Bengaluru', locality: 'Whitefield', address: 'Whitefield, Bengaluru' },
          images: [
            'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?w=800&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800&auto=format&fit=crop&q=80'
          ]
        },
        {
          title: 'Texas Instruments Engineering Financial Calculator',
          description: 'TI-84 Plus Graphic Engineering Calculator. Perfect for university coursework, statistics, and engineering calculations.',
          category: 'Electronics',
          subcategory: 'Calculators',
          condition: 'Good Condition',
          sharingType: 'borrow',
          availability: 'Available',
          owner: demoOwner._id,
          location: { city: 'Bengaluru', locality: 'Whitefield', address: 'Whitefield, Bengaluru' },
          images: [
            'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80'
          ]
        },
        {
          title: 'Bosch Cordless Power Drill Set 18V',
          description: 'Complete Bosch 18V power drill set with extra battery pack and screwdriver bits. Great for weekend home improvement projects.',
          category: 'Tools & DIY',
          subcategory: 'Power Tools',
          condition: 'Like New',
          sharingType: 'borrow',
          availability: 'Available',
          owner: demoOwner2._id,
          location: { city: 'Bengaluru', locality: 'Koramangala', address: 'Koramangala, Bengaluru' },
          images: [
            'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80'
          ]
        },
        {
          title: 'Dell 24-inch Full HD IPS Monitor',
          description: 'Sleek Dell 1080p monitor with HDMI and DisplayPort inputs. Ideal for home office study or dual monitor setup.',
          category: 'Electronics',
          subcategory: 'Monitors',
          condition: 'Good Condition',
          sharingType: 'give_away',
          availability: 'Available',
          owner: demoOwner2._id,
          location: { city: 'Bengaluru', locality: 'Koramangala', address: 'Koramangala, Bengaluru' },
          images: [
            'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80'
          ]
        },
        {
          title: 'Data Structures and Algorithms in C++ (4th Edition)',
          description: 'Standard textbook for Computer Science engineering algorithms. Clean pages, no highlights or markings.',
          category: 'Books & Study',
          subcategory: 'Engineering',
          condition: 'Like New',
          sharingType: 'give_away',
          availability: 'Available',
          owner: customer._id,
          location: { city: 'Bengaluru', locality: 'Whitefield', address: 'Whitefield, Bengaluru' },
          images: [
            'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80'
          ]
        }
      ];

      for (const prod of demoProducts) {
        await Item.create(prod);
      }
      console.log(`[DemoSeeder] Seeded ${demoProducts.length} realistic community products.`);
    }

    // 6. Ensure Admin Point Settings are initialized
    const defaultPointsSettings = [
      { key: 'points_enabled', value: true, label: 'Enable Points System', category: 'POINTS' },
      { key: 'points_reuse', value: 100, label: 'Give Away / Reuse Points', category: 'POINTS' },
      { key: 'points_borrow', value: 50, label: 'Borrow Points', category: 'POINTS' },
      { key: 'points_return_borrow', value: 25, label: 'Return Borrow Points', category: 'POINTS' }
    ];

    for (const s of defaultPointsSettings) {
      await AdminSetting.findOneAndUpdate(
        { key: s.key },
        { ...s },
        { upsert: true, new: true }
      );
    }

    // 7. Seed Initial Points Ledger entries for Demo Customer if empty
    const customerLedgerCount = await PointsLedger.countDocuments({ user: customer._id });
    if (customerLedgerCount === 0) {
      await PointsLedger.create([
        {
          user: customer._id,
          amount: 100,
          type: 'REUSE_EARNED',
          reason: 'Received Study Desk (Completed)',
          balanceAfter: 100,
          createdAt: new Date(Date.now() - 7 * 86400000)
        },
        {
          user: customer._id,
          amount: 50,
          type: 'BORROW_EARNED',
          reason: 'Borrowed Engineering Calculator (Completed)',
          balanceAfter: 150,
          createdAt: new Date(Date.now() - 4 * 86400000)
        },
        {
          user: customer._id,
          amount: 300,
          type: 'REUSE_EARNED',
          reason: 'Shared Scientific Books with Neighbors (Completed)',
          balanceAfter: 450,
          createdAt: new Date(Date.now() - 1 * 86400000)
        }
      ]);
      console.log('[DemoSeeder] Seeded initial points history for demo customer.');
    }

    console.log('[DemoSeeder] Idempotent demo seeding completed successfully.');
    return { admin, customer };
  } catch (err) {
    console.error('[DemoSeeder] Seeding error:', err.message);
    return null;
  }
}

module.exports = seedDemoData;
