const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectPostgres, query: pgQuery } = require('../config/postgres');
const User = require('../models/User');
const Item = require('../models/Item');
require('dotenv').config();

const SAMPLE_USERS = [
  {
    id: 'usr-demo-001',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@looop.community',
    role: 'customer',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    trustScore: 98,
    rating: 4.9
  },
  {
    id: 'usr-demo-002',
    name: 'Priya Patel',
    email: 'priya.patel@looop.community',
    role: 'customer',
    city: 'Mumbai',
    locality: 'Bandra West',
    state: 'Maharashtra',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    trustScore: 96,
    rating: 4.8
  },
  {
    id: 'usr-demo-003',
    name: 'Srinivas Rao',
    email: 'srinivas.rao@looop.community',
    role: 'customer',
    city: 'Guntur',
    locality: 'Brodipet',
    state: 'Andhra Pradesh',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    trustScore: 99,
    rating: 5.0
  }
];

const SAMPLE_ITEMS = [
  {
    id: 'item-demo-guntur-01',
    title: 'Casio FX-991ES Plus Scientific Calculator',
    description: 'Original Casio scientific calculator for engineering and mathematics coursework. Solar powered with dual-line display, excellent condition.',
    category: 'electronics',
    subcategory: 'Calculators',
    brand: 'Casio',
    model: 'FX-991ES Plus',
    images: [
      { url: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Scientific Calculator Guntur' }
    ],
    sharingType: 'give_away',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Brodipet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Brodipet, Guntur',
    lat: 16.3067,
    lng: 80.4365,
    ownerIdx: 2
  },
  {
    id: 'item-demo-guntur-02',
    title: 'Wooden Engineering Study Table & Chair',
    description: 'Solid wooden study desk with drawers and comfortable chair. Used for college exam preparation in Guntur. Clean condition.',
    category: 'furniture',
    subcategory: 'Desks',
    brand: 'Godrej Interio',
    model: 'Study Desk Pro',
    images: [
      { url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Study Desk Guntur' }
    ],
    sharingType: 'free',
    condition: 'good',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Lakshmipuram',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Lakshmipuram, Guntur',
    lat: 16.3100,
    lng: 80.4400,
    ownerIdx: 2
  },
  {
    id: 'item-demo-guntur-03',
    title: 'Bosch Cordless Power Drill Set 18V',
    description: 'Heavy duty Bosch cordless drill machine with extra battery and screwdriver bits. Available for borrowing in Guntur community.',
    category: 'tools',
    subcategory: 'Power Tools',
    brand: 'Bosch',
    model: 'GSB 180-LI',
    images: [
      { url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Power Drill Set Guntur' }
    ],
    sharingType: 'borrow',
    borrowMaxDays: 14,
    borrowMaxUnit: 'days',
    borrowNotes: 'Please return in original carrying case.',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Arundelpet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Arundelpet, Guntur',
    lat: 16.3020,
    lng: 80.4320,
    ownerIdx: 2
  },
  {
    id: 'item-demo-guntur-04',
    title: 'Data Structures & Algorithms in C++ (4th Edition)',
    description: 'Standard computer science textbook for B.Tech engineering students. Clean pages, no highlights.',
    category: 'books',
    subcategory: 'Engineering',
    brand: 'Cengage',
    model: '4th Edition',
    images: [
      { url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'DSA Textbook Guntur' }
    ],
    sharingType: 'give_away',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Brodipet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Brodipet, Guntur',
    lat: 16.3067,
    lng: 80.4365,
    ownerIdx: 2
  },
  {
    id: 'item-demo-101',
    title: 'Casio FX-991EX ClassWiz Scientific Calculator',
    description: 'High-resolution ClassWiz scientific calculator, ideal for engineering, mathematics, and science coursework.',
    category: 'books',
    subcategory: 'Engineering',
    brand: 'Casio',
    model: 'FX-991EX',
    images: [
      { url: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Front view' }
    ],
    sharingType: 'give_away',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    approximateAddress: 'Indiranagar, Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
    ownerIdx: 0
  },
  {
    id: 'item-demo-104',
    title: 'Sony WH-1000XM4 Wireless Noise Canceling Headphones',
    description: 'Premium wireless over-ear noise-canceling headphones with 30-hour battery life.',
    category: 'electronics',
    subcategory: 'Audio',
    brand: 'Sony',
    model: 'WH-1000XM4',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Headphones' }
    ],
    sharingType: 'exchange',
    exchangeWantedItems: 'Interested in mechanical keyboard',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Mumbai',
    locality: 'Bandra West',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    approximateAddress: 'Bandra West, Mumbai',
    lat: 19.0596,
    lng: 72.8295,
    ownerIdx: 1
  },
  {
    id: 'item-demo-105',
    title: 'Realme 12+ 5G (Pioneer Green, 8GB RAM, 256GB Storage)',
    description: 'Brand new Realme 12+ 5G smartphone in excellent condition. Comes with original box, 67W SUPERVOOC fast charger, and clear case. Shared with community.',
    category: 'electronics',
    subcategory: 'Smartphones',
    brand: 'Realme',
    model: '12+ 5G',
    images: [
      { url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Realme Smartphone' }
    ],
    sharingType: 'give_away',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Brodipet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Brodipet, Guntur',
    lat: 16.3067,
    lng: 80.4365,
    ownerIdx: 2
  },
  {
    id: 'item-demo-106',
    title: 'Canon EOS 1500D DSLR Camera with 18-55mm Lens',
    description: '24.1 MP Digital SLR camera with optical viewfinder and Wi-Fi. Ideal for college photography projects or event shoots. Available for borrow.',
    category: 'electronics',
    subcategory: 'Cameras',
    brand: 'Canon',
    model: 'EOS 1500D',
    images: [
      { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Canon DSLR Camera' }
    ],
    sharingType: 'borrow',
    borrowMaxDays: 7,
    borrowMaxUnit: 'days',
    borrowNotes: 'Handle with care, SD card included.',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    approximateAddress: 'Indiranagar, Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
    ownerIdx: 0
  },
  {
    id: 'item-demo-107',
    title: 'Kindle Paperwhite (16 GB) – 6.8 inch Glare-Free Display',
    description: 'Waterproof e-reader with adjustable warm light and 10 weeks battery life. Loaded with classic literature and programming books.',
    category: 'books',
    subcategory: 'E-Readers',
    brand: 'Amazon',
    model: 'Paperwhite 11th Gen',
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Kindle Paperwhite' }
    ],
    sharingType: 'give_away',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Lakshmipuram',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Lakshmipuram, Guntur',
    lat: 16.3100,
    lng: 80.4400,
    ownerIdx: 2
  },
  {
    id: 'item-demo-108',
    title: 'Ergonomic High-Back Mesh Study Chair with Lumbar Support',
    description: 'Breathable mesh back with adjustable headrest, 3D armrests, and smooth rolling casters. Relieves back strain during long work or study sessions.',
    category: 'furniture',
    subcategory: 'Chairs',
    brand: 'Green Soul',
    model: 'Monster Pro',
    images: [
      { url: 'https://images.unsplash.com/photo-1580481077195-c3a9927b74b7?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Ergonomic Chair' }
    ],
    sharingType: 'free',
    condition: 'good',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Mumbai',
    locality: 'Bandra West',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    approximateAddress: 'Bandra West, Mumbai',
    lat: 19.0596,
    lng: 72.8295,
    ownerIdx: 1
  },
  {
    id: 'item-demo-109',
    title: 'Decathlon Quechua 3-Person Waterproof Camping Tent',
    description: 'Fresh & Black technology keeps tent dark and cool. Easy 10-minute setup, wind resistant, complete with stakes and carry bag.',
    category: 'sports',
    subcategory: 'Camping',
    brand: 'Decathlon Quechua',
    model: 'MH100 Fresh&Black',
    images: [
      { url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Camping Tent' }
    ],
    sharingType: 'borrow',
    borrowMaxDays: 10,
    borrowMaxUnit: 'days',
    borrowNotes: 'Please ensure tent is dry before packing.',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    approximateAddress: 'Indiranagar, Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
    ownerIdx: 0
  },
  {
    id: 'item-demo-110',
    title: 'Yamaha F280 Acoustic Guitar with Padded Gig Bag',
    description: 'Rich warm tone acoustic guitar, comfortable rosewood fretboard. Great for beginners or campus jamming. Comes with picks and tuner.',
    category: 'games',
    subcategory: 'Musical Instruments',
    brand: 'Yamaha',
    model: 'F280',
    images: [
      { url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Yamaha Acoustic Guitar' }
    ],
    sharingType: 'exchange',
    exchangeWantedItems: 'Looking for a drawing tablet or synthesizer',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Brodipet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Brodipet, Guntur',
    lat: 16.3067,
    lng: 80.4365,
    ownerIdx: 2
  },
  {
    id: 'item-demo-111',
    title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker 6L',
    description: 'Stainless steel cooker that pressure cooks, slow cooks, rice cook, steams, sautés, and warms. Clean, fully sanitized.',
    category: 'kitchen',
    subcategory: 'Appliances',
    brand: 'Instant Pot',
    model: 'Duo 60',
    images: [
      { url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Instant Pot Cooker' }
    ],
    sharingType: 'give_away',
    condition: 'good',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Mumbai',
    locality: 'Bandra West',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    approximateAddress: 'Bandra West, Mumbai',
    lat: 19.0596,
    lng: 72.8295,
    ownerIdx: 1
  },
  {
    id: 'item-demo-112',
    title: 'Keychron K2 Wireless Bluetooth Mechanical Keyboard',
    description: 'Compact 75% mechanical keyboard with Gateron G Pro Brown switches, white LED backlight, Mac and Windows keycaps included.',
    category: 'electronics',
    subcategory: 'Keyboards',
    brand: 'Keychron',
    model: 'K2 v2',
    images: [
      { url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Mechanical Keyboard' }
    ],
    sharingType: 'exchange',
    exchangeWantedItems: 'Interested in wireless mouse or USB microphone',
    condition: 'like_new',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    approximateAddress: 'Indiranagar, Bengaluru',
    lat: 12.9784,
    lng: 77.6408,
    ownerIdx: 0
  },
  {
    id: 'item-demo-113',
    title: 'Concepts of Physics by Dr. H.C. Verma (Vol 1 & 2)',
    description: 'The definitive physics foundation books for competitive exams and engineering fundamentals. Both volumes in great shape.',
    category: 'books',
    subcategory: 'Science',
    brand: 'Bharati Bhawan',
    model: 'HC Verma Set',
    images: [
      { url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80', isPrimary: true, caption: 'Physics Textbooks' }
    ],
    sharingType: 'free',
    condition: 'good',
    availability: 'Available',
    status: 'active',
    approvalStatus: 'APPROVED',
    city: 'Guntur',
    locality: 'Arundelpet',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    approximateAddress: 'Arundelpet, Guntur',
    lat: 16.3020,
    lng: 80.4320,
    ownerIdx: 2
  }
];

async function seedItems() {
  console.log('=== LOOOP GUNTUR & COMMUNITY ITEMS SEEDER ===');

  await connectPostgres();

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/looop';
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
      console.log('Connected to MongoDB:', mongoUri);
    }
  } catch (err) {
    console.warn('MongoDB connection notice:', err.message);
  }

  const hashedPassword = await bcrypt.hash('Demo@12345', 10);
  const createdUserDocs = [];

  for (const uData of SAMPLE_USERS) {
    try {
      await pgQuery(
        `INSERT INTO users (id, name, email, password, role, avatar, city, state, locality, account_status, trust_score, rating, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, city = EXCLUDED.city;`,
        [uData.id, uData.name, uData.email, hashedPassword, uData.role, uData.avatar, uData.city, uData.state, uData.locality, uData.trustScore, uData.rating]
      );
    } catch (pgUserErr) {
      console.warn('PG User seed warning:', pgUserErr.message);
    }

    if (mongoose.connection.readyState === 1) {
      try {
        let mongoUser = await User.findOne({ email: uData.email });
        if (!mongoUser) {
          mongoUser = await User.create({
            name: uData.name,
            email: uData.email,
            password: hashedPassword,
            role: uData.role,
            city: uData.city,
            locality: uData.locality,
            state: uData.state,
            avatar: uData.avatar,
            trustScore: uData.trustScore,
            rating: uData.rating,
            verified: true,
            accountStatus: 'active'
          });
        } else {
          mongoUser.city = uData.city;
          mongoUser.locality = uData.locality;
          await mongoUser.save();
        }
        createdUserDocs.push(mongoUser);
      } catch (mUserErr) {
        console.warn('Mongo user warning:', mUserErr.message);
      }
    }
  }

  console.log(`Seeded ${SAMPLE_USERS.length} user accounts including Guntur sharer (Srinivas Rao).`);

  let itemsSeededCount = 0;
  for (const itemData of SAMPLE_ITEMS) {
    const ownerData = SAMPLE_USERS[itemData.ownerIdx];
    const mongoOwnerDoc = createdUserDocs[itemData.ownerIdx];

    try {
      await pgQuery(
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
          15, 6, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          city = EXCLUDED.city,
          locality = EXCLUDED.locality,
          availability = 'Available',
          status = 'active';`,
        [
          itemData.id,
          itemData.title,
          itemData.description,
          itemData.category,
          itemData.subcategory,
          itemData.brand,
          itemData.model,
          JSON.stringify(itemData.images),
          itemData.sharingType,
          itemData.condition,
          'Available',
          'active',
          itemData.city,
          itemData.district,
          itemData.state,
          itemData.locality,
          itemData.approximateAddress,
          itemData.lat,
          itemData.lng,
          itemData.borrowMaxDays || 14,
          itemData.borrowMaxUnit || 'days',
          itemData.borrowNotes || '',
          itemData.exchangeWantedItems || '',
          ownerData.id
        ]
      );
    } catch (pgItemErr) {
      console.warn('PG Item seed notice:', pgItemErr.message);
    }

    if (mongoose.connection.readyState === 1 && mongoOwnerDoc) {
      try {
        await Item.findOneAndUpdate(
          { title: itemData.title },
          {
            title: itemData.title,
            description: itemData.description,
            category: itemData.category,
            subcategory: itemData.subcategory,
            brand: itemData.brand,
            model: itemData.model,
            images: itemData.images,
            sharingType: itemData.sharingType,
            condition: itemData.condition,
            availability: 'Available',
            status: 'active',
            approvalStatus: 'APPROVED',
            location: {
              city: itemData.city,
              locality: itemData.locality,
              district: itemData.district,
              state: itemData.state,
              approximateAddress: itemData.approximateAddress
            },
            locationCoordinates: {
              type: 'Point',
              coordinates: [itemData.lng, itemData.lat]
            },
            owner: mongoOwnerDoc._id
          },
          { upsert: true, new: true }
        );
      } catch (mItemErr) {
        console.warn('Mongo Item seed notice:', mItemErr.message);
      }
    }

    itemsSeededCount++;
    console.log(`[+] Seeded Item in ${itemData.city}: "${itemData.title}" (${itemData.locality})`);
  }

  console.log(`\nSuccessfully seeded ${itemsSeededCount} items into database!`);
  process.exit(0);
}

seedItems().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
