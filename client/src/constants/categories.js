import {
  BookOpen,
  Laptop,
  GraduationCap,
  Armchair,
  Shirt,
  Trophy,
  Wrench,
  Home,
  Watch,
  Bike,
  Package,
  Gift,
  HeartHandshake,
  Clock,
  Repeat
} from 'lucide-react';

/**
 * LOOOP Community Categories Configuration
 * Single source of truth for category filtering and discovery
 * Structured for direct alignment with MongoDB Category model
 */
export const CATEGORIES = [
  { id: 'books', name: 'Books', icon: BookOpen, count: 0, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'electronics', name: 'Electronics', icon: Laptop, count: 0, color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'education', name: 'Study Materials', icon: GraduationCap, count: 0, color: '#059669', bg: '#ecfdf5' },
  { id: 'furniture', name: 'Furniture', icon: Armchair, count: 0, color: '#ea580c', bg: '#fff7ed' },
  { id: 'clothing', name: 'Clothing', icon: Shirt, count: 0, color: '#db2777', bg: '#fdf2f8' },
  { id: 'sports', name: 'Sports', icon: Trophy, count: 0, color: '#16a34a', bg: '#f0fdf4' },
  { id: 'tools', name: 'Tools', icon: Wrench, count: 0, color: '#d97706', bg: '#fffbeb' },
  { id: 'home', name: 'Home Items', icon: Home, count: 0, color: '#4f46e5', bg: '#eef2ff' },
  { id: 'accessories', name: 'Accessories', icon: Watch, count: 0, color: '#0891b2', bg: '#ecfeff' },
  { id: 'mobility', name: 'Vehicles / Mobility', icon: Bike, count: 0, color: '#0d9488', bg: '#f0fdfa' },
  { id: 'other', name: 'Other', icon: Package, count: 0, color: '#64748b', bg: '#f8fafc' }
];

export const SUBCATEGORIES_MAP = {
  books: ['Engineering', 'School', 'Competitive Exams', 'Fiction', 'Non-Fiction', 'Other'],
  electronics: ['Headphones', 'Chargers', 'Keyboards', 'Computer Accessories', 'Audio & Speakers', 'Other'],
  education: ['Scientific Calculators', 'Course Notes', 'Lab Equipment', 'Stationery Bundles', 'Drawing Boards', 'Other'],
  furniture: ['Study Desks', 'Office Chairs', 'Bookshelves', 'Lamps & Lighting', 'Side Tables', 'Other'],
  clothing: ['Winter Jackets', 'Formal Attire', 'Casual Wear', 'Shoes & Footwear', 'Sportswear', 'Other'],
  sports: ['Gym & Dumbbells', 'Badminton & Tennis', 'Football & Basketball', 'Bicycle Gear', 'Yoga & Fitness', 'Other'],
  tools: ['Hand Tool Sets', 'Power Drills', 'Multimeters', 'Gardening Tools', 'Hardware Kits', 'Other'],
  home: ['Electric Kettles', 'Cookware', 'Storage Organizers', 'Bedding & Linen', 'Tableware', 'Other'],
  accessories: ['Backpacks & Laptop Bags', 'Watches', 'Eyewear & Cases', 'Travel Luggage', 'Other'],
  mobility: ['Bicycles', 'Skateboards', 'Helmets & Locks', 'Cycle Accessories', 'Other'],
  other: ['Board Games & Hobbies', 'Art Supplies', 'Musical Instruments', 'Miscellaneous', 'Other']
};

export const SHARING_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'free', label: 'Free / Give Away', description: 'Pass it on permanently for zero cost', icon: HeartHandshake, color: '#059669' },
  { id: 'give_away', label: 'Give Away', description: 'Free community giveaway', icon: Gift, color: '#10b981' },
  { id: 'borrow', label: 'Borrow', description: 'Use for a duration and return', icon: Clock, color: '#0284c7' },
  { id: 'exchange', label: 'Exchange', description: 'Trade for a useful item', icon: Repeat, color: '#b45309' },
  { id: 'low_cost', label: 'Low Cost', description: 'Low cost community share', icon: Package, color: '#7c3aed' }
];

export const CONDITIONS = [
  { id: 'all', label: 'Any Condition' },
  { id: 'new', label: 'New', description: 'Brand new, never opened or used' },
  { id: 'like_new', label: 'Like New', description: 'Opened or tested, zero flaws or signs of wear' },
  { id: 'good', label: 'Good', description: 'Used but fully functional with normal signs of use' },
  { id: 'fair', label: 'Fair', description: 'Fully functional, noticeable cosmetic wear or scratches' },
  { id: 'used', label: 'Used', description: 'Well used functional item' },
  { id: 'needs_repair', label: 'Needs Repair', description: 'Requires fixing, servicing, or useful for spare parts' }
];

export const DISTANCE_OPTIONS = [
  { id: 'all', label: 'Any Distance' },
  { id: '2', label: 'Within 2 km', km: 2 },
  { id: '5', label: 'Within 5 km', km: 5 },
  { id: '10', label: 'Within 10 km', km: 10 },
  { id: '25', label: 'Within 25 km', km: 25 },
  { id: '50', label: 'Within 50 km', km: 50 }
];

export const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available Now' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'recently_added', label: 'Recently Added' },
  { id: 'all', label: 'All Items' }
];

export const SORT_OPTIONS = [
  { id: 'relevant', label: 'Most Relevant' },
  { id: 'newest', label: 'Newest First' },
  { id: 'nearest', label: 'Nearest Location' },
  { id: 'available_first', label: 'Available First' },
  { id: 'recently_updated', label: 'Recently Updated' }
];

export default {
  CATEGORIES,
  SUBCATEGORIES_MAP,
  SHARING_TYPES,
  CONDITIONS,
  DISTANCE_OPTIONS,
  AVAILABILITY_OPTIONS,
  SORT_OPTIONS
};
