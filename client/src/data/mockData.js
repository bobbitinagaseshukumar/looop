/**
 * Realistic Mock Data Engine for Looop
 * Structured for seamless replacement with REST API responses in future phases
 */

export const mockCategories = [
  { id: 'books', name: 'Books & Literature', icon: 'BookOpen', count: 0 },
  { id: 'electronics', name: 'Electronics & Gadgets', icon: 'Laptop', count: 0 },
  { id: 'clothes', name: 'Clothes & Apparel', icon: 'Shirt', count: 0 },
  { id: 'furniture', name: 'Furniture & Living', icon: 'Armchair', count: 0 },
  { id: 'games', name: 'Games & Hobbies', icon: 'Gamepad2', count: 0 },
  { id: 'sports', name: 'Sports & Fitness', icon: 'Trophy', count: 0 },
  { id: 'kitchen', name: 'Kitchen & Dining', icon: 'Utensils', count: 0 },
  { id: 'education', name: 'Education & Study', icon: 'GraduationCap', count: 0 },
  { id: 'tools', name: 'Tools & DIY', icon: 'Wrench', count: 0 }
];

export const mockUsers = {
  currentUser: {
    id: 'usr-101',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    location: 'Indiranagar, Bengaluru',
    memberSince: 'March 2024',
    trustScore: 96,
    totalRatings: 4.9,
    reviewCount: 28,
    successfulShares: 19,
    itemsGiven: 12,
    itemsBorrowed: 4,
    itemsExchanged: 3,
    badges: [
      { id: 'first_share', name: 'First Share', description: 'Shared first item on Looop', icon: 'Sparkles', color: '#10b981' },
      { id: 'community_helper', name: 'Community Helper', description: 'Helped 10+ people in community', icon: 'Heart', color: '#3b82f6' },
      { id: 'super_sharer', name: 'Super Sharer', description: 'Maintained 95%+ trust score', icon: 'Award', color: '#f59e0b' },
      { id: 'knowledge_sharer', name: 'Knowledge Sharer', description: 'Shared 5+ educational resources', icon: 'BookOpen', color: '#8b5cf6' }
    ]
  },
  adminUser: {
    id: 'adm-001',
    name: 'Priya Patel (Admin)',
    email: 'admin@looop.community',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    location: 'Looop Operations Center'
  }
};

export const mockItems = [];

export const mockWantedItems = [
  {
    id: 'wnt-01',
    title: 'Scientific Calculator for Semester Exams',
    description: 'Need a scientific calculator (Casio 991ES or similar) for upcoming electrical engineering finals. Will return in excellent condition within 2 weeks.',
    category: 'education',
    location: 'Indiranagar, Bengaluru',
    postedBy: {
      id: 'usr-101',
      name: 'Aarav Sharma',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    status: 'OPEN',
    createdAt: '2026-09-10T11:00:00Z',
    matchedItemId: 'item-01',
    matchScore: 94,
    matchedItemTitle: 'Casio FX-991ES Plus Scientific Calculator'
  },
  {
    id: 'wnt-02',
    title: 'Mechanical Keyboard (Tenkeyless) for Coding Practice',
    description: 'Looking to borrow or exchange for study setup. Open to Blue/Brown switches.',
    category: 'electronics',
    location: 'Koramangala, Bengaluru',
    postedBy: {
      id: 'usr-110',
      name: 'Varun Hegde',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    },
    status: 'OPEN',
    createdAt: '2026-09-08T15:30:00Z',
    matchedItemId: 'item-05',
    matchScore: 82,
    matchedItemTitle: 'Anker Soundcore 2 Portable Bluetooth Speaker'
  },
  {
    id: 'wnt-03',
    title: 'Basic Tool Kit / Screwdriver Set',
    description: 'Need basic tools to assemble an IKEA bookshelf over the weekend.',
    category: 'tools',
    location: 'HSR Layout, Bengaluru',
    postedBy: {
      id: 'usr-111',
      name: 'Sneha Kapur',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
    },
    status: 'OPEN',
    createdAt: '2026-09-09T09:45:00Z',
    matchedItemId: 'item-08',
    matchScore: 89,
    matchedItemTitle: 'Bosch Professional Cordless Impact Drill & Bit Set'
  }
];

export const mockRequests = {
  incoming: [
    {
      id: 'req-in-01',
      itemId: 'item-05',
      itemTitle: 'Anker Soundcore 2 Portable Bluetooth Speaker',
      sharingType: 'exchange',
      requester: {
        id: 'usr-112',
        name: 'Tanvi Nair',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
        trustScore: 97,
        rating: 4.9
      },
      message: 'Hi Aarav! I saw your speaker listing. I have a Keychron K2 mechanical keyboard (Brown switches, pristine condition) that I would love to exchange if you are interested!',
      date: '2026-09-11T14:20:00Z',
      status: 'PENDING'
    },
    {
      id: 'req-in-02',
      itemId: 'item-05',
      itemTitle: 'Anker Soundcore 2 Portable Bluetooth Speaker',
      sharingType: 'exchange',
      requester: {
        id: 'usr-113',
        name: 'Aditya Kulkarni',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
        trustScore: 88,
        rating: 4.6
      },
      message: 'Hey, would you be interested in exchanging for a Sony studio headphone set?',
      date: '2026-09-10T19:10:00Z',
      status: 'PENDING'
    }
  ],
  sent: [
    {
      id: 'req-sent-01',
      itemId: 'item-01',
      itemTitle: 'Casio FX-991ES Plus Scientific Calculator',
      sharingType: 'borrow',
      owner: {
        id: 'usr-102',
        name: 'Rohan Verma',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        trustScore: 98
      },
      message: 'Hi Rohan, I saw your calculator listing. I have my final semester engineering math exam next Tuesday and would be grateful to borrow it for 5 days. I live in Indiranagar, close to Koramangala.',
      date: '2026-09-10T12:30:00Z',
      status: 'ACCEPTED'
    },
    {
      id: 'req-sent-02',
      itemId: 'item-02',
      itemTitle: 'University Physics & Calculus 14th Edition Set',
      sharingType: 'give_away',
      owner: {
        id: 'usr-103',
        name: 'Ananya Deshmukh',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        trustScore: 95
      },
      message: 'Hello Ananya, I would love to pick up this book set for my younger cousin who just joined mechanical engineering.',
      date: '2026-09-09T16:00:00Z',
      status: 'COMPLETED'
    }
  ]
};

export const mockConversations = [
  {
    id: 'conv-01',
    participant: {
      id: 'usr-102',
      name: 'Rohan Verma',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      online: true,
      lastSeen: 'Active now'
    },
    itemContext: {
      id: 'item-01',
      title: 'Casio FX-991ES Plus Calculator',
      status: 'ACCEPTED'
    },
    lastMessage: 'Sounds great Aarav! Let us meet tomorrow at 5 PM near Sony World Signal.',
    lastMessageTime: '10 mins ago',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-01',
        senderId: 'usr-101',
        text: 'Hi Rohan! Thanks for accepting my request for the calculator.',
        time: 'Yesterday 4:30 PM',
        isOwn: true
      },
      {
        id: 'msg-02',
        senderId: 'usr-102',
        text: 'Glad to help! Where would you prefer to pick it up?',
        time: 'Yesterday 4:35 PM',
        isOwn: false
      },
      {
        id: 'msg-03',
        senderId: 'usr-101',
        text: 'Could we do Koramangala 4th block or near Sony World Signal?',
        time: 'Yesterday 4:40 PM',
        isOwn: true
      },
      {
        id: 'msg-04',
        senderId: 'usr-102',
        text: 'Sounds great Aarav! Let us meet tomorrow at 5 PM near Sony World Signal.',
        time: '10 mins ago',
        isOwn: false
      }
    ]
  },
  {
    id: 'conv-02',
    participant: {
      id: 'usr-112',
      name: 'Tanvi Nair',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      online: false,
      lastSeen: '1 hour ago'
    },
    itemContext: {
      id: 'item-05',
      title: 'Anker Bluetooth Speaker (Exchange)',
      status: 'PENDING'
    },
    lastMessage: 'I can send you photos of the Keychron keyboard whenever you are ready.',
    lastMessageTime: '2 hours ago',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-10',
        senderId: 'usr-112',
        text: 'Hi Aarav, sent a request to exchange your Anker speaker with my Keychron mechanical keyboard.',
        time: '2 hours ago',
        isOwn: false
      },
      {
        id: 'msg-11',
        senderId: 'usr-112',
        text: 'I can send you photos of the Keychron keyboard whenever you are ready.',
        time: '2 hours ago',
        isOwn: false
      }
    ]
  }
];

export const mockNotifications = [
  {
    id: 'notif-01',
    type: 'request',
    title: 'New Exchange Request',
    message: 'Tanvi Nair requested to exchange your Anker Soundcore Bluetooth Speaker.',
    time: '2 hours ago',
    unread: true,
    link: '/customer/requests'
  },
  {
    id: 'notif-02',
    type: 'match',
    title: 'Smart Match Found (94%)',
    message: 'Your wanted item "Scientific Calculator" matches Rohan Verma\'s Casio FX-991ES listing nearby.',
    time: 'Yesterday',
    unread: true,
    link: '/customer/wanted'
  },
  {
    id: 'notif-03',
    type: 'review',
    title: 'New 5-Star Review Received',
    message: 'Ananya Deshmukh left you a 5-star review: "Aarav was punctual and wonderful to connect with!"',
    time: '2 days ago',
    unread: false,
    link: '/customer/profile'
  },
  {
    id: 'notif-04',
    type: 'system',
    title: 'New Badge Unlocked: Community Helper',
    message: 'Congratulations! You have completed 10+ shares in the Looop community.',
    time: '3 days ago',
    unread: false,
    link: '/customer/profile'
  }
];

export const mockAdminStats = {
  totalUsers: 1420,
  activeUsers: 890,
  totalItems: 3120,
  availableItems: 1845,
  completedShares: 1275,
  pendingReports: 4,
  openWantedRequests: 168,
  recentActivity: [
    { id: 'act-1', event: 'Completed Handover', user: 'Rohan V. → Aarav S.', item: 'Casio Calculator', time: '12 mins ago', type: 'success' },
    { id: 'act-2', event: 'New Listing Added', user: 'Meera Sen', item: 'LED Desk Lamp', time: '45 mins ago', type: 'info' },
    { id: 'act-3', event: 'Report Submitted', user: 'Pooja K.', item: 'Reported duplicate listing', time: '2 hours ago', type: 'warning' },
    { id: 'act-4', event: 'User Verified', user: 'Vikram Joshi', item: 'Email & Community Trust Verified', time: '3 hours ago', type: 'info' }
  ],
  usersList: [
    { id: 'u-1', name: 'Aarav Sharma', email: 'aarav.sharma@example.com', role: 'USER', trust: 96, status: 'Active', itemsCount: 3, joined: 'March 2024' },
    { id: 'u-2', name: 'Rohan Verma', email: 'rohan.v@example.com', role: 'USER', trust: 98, status: 'Active', itemsCount: 7, joined: 'January 2024' },
    { id: 'u-3', name: 'Deepak Rao', email: 'deepak.spam@mail.com', role: 'USER', trust: 42, status: 'Suspended', itemsCount: 0, joined: 'August 2026' },
    { id: 'u-4', name: 'Ananya Deshmukh', email: 'ananya.d@example.com', role: 'USER', trust: 95, status: 'Active', itemsCount: 5, joined: 'February 2024' },
    { id: 'u-5', name: 'Kunal Singhania', email: 'kunal.s@example.com', role: 'USER', trust: 30, status: 'Blocked', itemsCount: 1, joined: 'June 2026' }
  ],
  reportsList: [
    { id: 'rep-1', reason: 'Misleading description', item: 'Vintage Radio', reporter: 'Pooja K.', status: 'PENDING', date: '2026-09-11' },
    { id: 'rep-2', reason: 'Unresponsive after accepting borrow', item: 'Guitar Amp', reporter: 'Karthik R.', status: 'INVESTIGATING', date: '2026-09-10' },
    { id: 'rep-3', reason: 'Prohibited item (Commercial sales)', item: 'Bulk wholesale socks', reporter: 'Sunil K.', status: 'RESOLVED', date: '2026-09-08' }
  ]
};

export const mockCommunityImpact = {
  itemsReused: '0',
  peopleHelped: '0',
  booksShared: '0',
  electronicsShared: '0',
  clothesShared: '0',
  co2SavedKg: '0 kg'
};

export const mockTransactions = [
  {
    id: 'tx-01',
    itemId: 'item-01',
    itemTitle: 'Casio FX-991ES Plus Scientific Calculator',
    sharingType: 'borrow',
    owner: {
      id: 'usr-102',
      name: 'Rohan Verma',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      trustScore: 98
    },
    receiver: {
      id: 'usr-101',
      name: 'Aarav Sharma',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    status: 'SCHEDULED',
    scheduledDate: 'Tomorrow at 5:00 PM',
    location: 'Near Sony World Signal, Koramangala 4th Block',
    handoverCode: 'LP-8429',
    returnDueDate: 'Oct 15, 2026',
    ownerConfirmed: true,
    receiverConfirmed: false
  },
  {
    id: 'tx-02',
    itemId: 'item-02',
    itemTitle: 'University Physics & Calculus 14th Edition Set',
    sharingType: 'give_away',
    owner: {
      id: 'usr-103',
      name: 'Ananya Deshmukh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      trustScore: 95
    },
    receiver: {
      id: 'usr-101',
      name: 'Aarav Sharma',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    status: 'COMPLETED',
    scheduledDate: 'Sept 9, 2026',
    location: 'HSR Layout Sector 2, near BDA Complex',
    handoverCode: 'LP-3104',
    ownerConfirmed: true,
    receiverConfirmed: true
  },
  {
    id: 'tx-03',
    itemId: 'item-05',
    itemTitle: 'Anker Soundcore 2 Portable Bluetooth Speaker',
    sharingType: 'exchange',
    owner: {
      id: 'usr-101',
      name: 'Aarav Sharma',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    receiver: {
      id: 'usr-112',
      name: 'Tanvi Nair',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      trustScore: 97
    },
    status: 'IN_COORDINATION',
    scheduledDate: 'Tentative this weekend',
    location: 'Indiranagar Metro Station Gate 2',
    handoverCode: 'LP-9921',
    exchangeItem: 'Keychron K2 Mechanical Keyboard',
    ownerConfirmed: false,
    receiverConfirmed: false
  },
  {
    id: 'tx-04',
    itemId: 'item-08',
    itemTitle: 'Bosch Cordless Impact Drill & Bit Set',
    sharingType: 'borrow',
    owner: {
      id: 'usr-108',
      name: 'Sunil Kumar',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      trustScore: 96
    },
    receiver: {
      id: 'usr-110',
      name: 'Varun Hegde',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    },
    status: 'COMPLETED',
    scheduledDate: 'Sept 4, 2026',
    location: 'JP Nagar Phase 3',
    handoverCode: 'LP-7712',
    ownerConfirmed: true,
    receiverConfirmed: true
  }
];

export const mockReviewsData = {
  received: [
    {
      id: 'rev-rec-1',
      author: {
        name: 'Rohan Verma',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        trustScore: 98
      },
      itemTitle: 'Casio FX-991ES Plus Calculator',
      sharingType: 'borrow',
      rating: 5,
      date: '3 days ago',
      comment: 'Aarav was punctual and returned the calculator in flawless condition. Reliable community member!'
    },
    {
      id: 'rev-rec-2',
      author: {
        name: 'Ananya Deshmukh',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        trustScore: 95
      },
      itemTitle: 'Engineering Physics & Calculus Set',
      sharingType: 'give_away',
      rating: 5,
      date: '1 week ago',
      comment: 'Very polite, picked up the book promptly. Glad to see these books continue helping students.'
    },
    {
      id: 'rev-rec-3',
      author: {
        name: 'Sunil Kumar',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
        trustScore: 96
      },
      itemTitle: 'Cordless Impact Drill Set',
      sharingType: 'borrow',
      rating: 4.8,
      date: '2 weeks ago',
      comment: 'Smooth handover, clean drill bits returned on time.'
    }
  ],
  submitted: [
    {
      id: 'rev-sub-1',
      recipient: {
        name: 'Ananya Deshmukh',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
      },
      itemTitle: 'Engineering Physics & Calculus Set',
      sharingType: 'give_away',
      rating: 5,
      date: '1 week ago',
      comment: 'Ananya was generous and the books were packed neatly. My cousin is already studying from them!'
    },
    {
      id: 'rev-sub-2',
      recipient: {
        name: 'Sunil Kumar',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
      },
      itemTitle: 'Bosch Cordless Drill',
      sharingType: 'borrow',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Sunil was helpful in demonstrating the chuck settings. High-quality tool that saved my weekend IKEA assembly.'
    }
  ]
};

export const mockAnalyticsData = {
  monthlyShares: [
    { month: 'Jan', shares: 82 },
    { month: 'Feb', shares: 115 },
    { month: 'Mar', shares: 140 },
    { month: 'Apr', shares: 165 },
    { month: 'May', shares: 198 },
    { month: 'Jun', shares: 245 },
    { month: 'Jul', shares: 310 },
    { month: 'Aug', shares: 380 },
    { month: 'Sep', shares: 425 }
  ],
  categoryBreakdown: [
    { category: 'Education & Study', count: 420, percent: 33 },
    { category: 'Electronics & Tech', count: 310, percent: 24 },
    { category: 'Books & Literature', count: 280, percent: 22 },
    { category: 'Sports & Fitness', count: 145, percent: 11 },
    { category: 'Tools & DIY', count: 120, percent: 10 }
  ],
  neighborhoodHotspots: [
    { area: 'Indiranagar', shares: 342, activeUsers: 218 },
    { area: 'Koramangala', shares: 298, activeUsers: 194 },
    { area: 'HSR Layout', shares: 246, activeUsers: 162 },
    { area: 'BTM Layout', shares: 210, activeUsers: 140 },
    { area: 'Whitefield', shares: 179, activeUsers: 116 }
  ]
};

export const mockSavedItemIds = ['item-01', 'item-04', 'item-07'];
