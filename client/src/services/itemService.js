import api from './api';
import { mockItems, mockCategories } from '../data/mockData';
import { recordImpactAction } from '../utils/communityImpactTracker';
import { neonDb } from './neonDbService';

/**
 * Item Service
 * Handles discovery, nearby items, and category listings
 */
export const itemService = {
  /**
   * Fetch paginated and filtered items for Browse & Discovery
   * Combines backend database items with catalog items to ensure all community and requested items are shown.
   * @param {Object} params - { search, category, sharingType, condition, distance, availability, sort, page, limit }
   */
  getItems: async (params = {}) => {
    const {
      search = '',
      category = 'all',
      sharingType = 'all',
      condition = 'all',
      distance = 'all',
      availability = 'available',
      sort = 'newest',
      page = 1,
      limit = 12
    } = params;

    let allItems = [];

    try {
      const response = await api.get('/items', { params: { limit: 100 } });
      const apiItems = response.data?.items || (Array.isArray(response.data) ? response.data : []);

      const normalizedApi = apiItems.map((item) => ({
        ...item,
        id: item._id || item.id,
        images: (item.images || []).map((img) => (typeof img === 'string' ? img : img.url || ''))
      }));

      // Use strictly real backend database items
      allItems = normalizedApi;
    } catch {
      allItems = [...mockItems];
    }

    let filtered = [...allItems];

    // 1. Keyword search (title, description, category, location)
    if (search && search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const inTitle = item.title?.toLowerCase().includes(query);
        const inDesc = item.description?.toLowerCase().includes(query);
        const inCat = item.category?.toLowerCase().includes(query);
        const locStr = typeof item.location === 'string'
          ? item.location
          : (item.location?.city || item.location?.locality || item.city || item.locality || '');
        const inLoc = locStr.toLowerCase().includes(query);
        return inTitle || inDesc || inCat || inLoc;
      });
    }

    // 2. Category filter
    if (category && category !== 'all') {
      filtered = filtered.filter((item) => {
        if (category === 'clothing') return item.category === 'clothes' || item.category === 'clothing';
        if (category === 'home') return item.category === 'kitchen' || item.category === 'home';
        return item.category === category;
      });
    }

    // 3. Sharing Type filter
    if (sharingType && sharingType !== 'all') {
      filtered = filtered.filter((item) => {
        if (sharingType === 'free') return item.sharingType === 'give_away';
        return item.sharingType === sharingType;
      });
    }

    // 4. Condition filter
    if (condition && condition !== 'all') {
      filtered = filtered.filter((item) => item.condition === condition);
    }

    // 5. Distance filter
    if (distance && distance !== 'all') {
      const maxKm = parseFloat(distance);
      if (!isNaN(maxKm)) {
        filtered = filtered.filter((item) => {
          const match = item.location?.match(/~?([0-9.]+)\s*km/);
          if (match && match[1]) {
            const itemKm = parseFloat(match[1]);
            return itemKm <= maxKm;
          }
          return true;
        });
      }
    }

    // 6. Availability filter
    if (availability === 'available') {
      filtered = filtered.filter((item) => item.status === 'AVAILABLE' || item.availability === 'Available' || !item.status);
    }

    // 7. Sorting
    filtered.sort((a, b) => {
      if (sort === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sort === 'nearest') {
        const kmA = parseFloat(a.location?.match(/~?([0-9.]+)\s*km/)?.[1] || '99');
        const kmB = parseFloat(b.location?.match(/~?([0-9.]+)\s*km/)?.[1] || '99');
        return kmA - kmB;
      }
      if (sort === 'recently_updated') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      }
      if (sort === 'most_relevant') {
        return (b.savesCount || 0) - (a.savesCount || 0);
      }
      return 0;
    });

    // 8. Pagination calculation
    const total = filtered.length;
    const currentPage = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: paginatedItems,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  },

  /**
   * Fetch nearby items for dashboard or quick preview
   */
  getNearbyItems: async (params = {}) => {
    try {
      const response = await api.get('/items/nearby', { params });
      return response.data;
    } catch {
      return mockItems;
    }
  },

  /**
   * Fetch categories list with real item counts
   */
  getCategories: async () => {
    try {
      const response = await api.get('/categories');
      if (response?.data?.categoryCounts) {
        return response.data;
      }
      return response.data;
    } catch {
      try {
        const counts = await neonDb.getCategoryCounts();
        return {
          success: true,
          categoryCounts: counts,
          categories: mockCategories.map((c) => ({ ...c, count: counts[c.id] || 0 }))
        };
      } catch {
        return {
          success: true,
          categoryCounts: {},
          categories: mockCategories.map((c) => ({ ...c, count: 0 }))
        };
      }
    }
  },

  /**
   * Fetch single item by ID
   */
  getItemById: async (id) => {
    // 1. Check mock items first (by id, _id, slug, or slugified title)
    const cleanId = String(id || '').toLowerCase().trim();
    const mockMatch = mockItems.find(
      (i) =>
        i.id === id ||
        i._id === id ||
        (i.slug && i.slug.toLowerCase() === cleanId) ||
        (i.title && i.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === cleanId)
    );
    if (mockMatch) {
      return {
        ...mockMatch,
        id: mockMatch.id,
        images: (mockMatch.images || []).map((img) => (typeof img === 'string' ? img : img.url || ''))
      };
    }

    // 2. Fetch from backend API
    try {
      const response = await api.get(`/items/${id}`);
      const raw = response.data?.item || response.data;
      if (raw && (raw.title || raw._id || raw.id)) {
        return {
          ...raw,
          id: raw._id || raw.id,
          images: (raw.images || []).map((img) => (typeof img === 'string' ? img : img.url || ''))
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch similar / related items matching category, subcategory, brand, condition, or sharing type
   * Prioritizes AVAILABLE items over reserved/reused ones
   */
  getSimilarItems: async (id, params = {}) => {
    try {
      const endpoint = id ? `/items/${id}/similar` : '/items/similar';
      const response = await api.get(endpoint, { params });
      return response.data?.items || (Array.isArray(response.data) ? response.data : []);
    } catch {
      let filtered = mockItems.filter((i) => i.id !== id && i._id !== id);
      if (params.category) {
        const catList = filtered.filter((i) => i.category === params.category);
        if (catList.length > 0) filtered = catList;
      }
      filtered.sort((a, b) => {
        const availA = a.availability === 'Available' || a.status === 'AVAILABLE' ? 1 : 0;
        const availB = b.availability === 'Available' || b.status === 'AVAILABLE' ? 1 : 0;
        return availB - availA;
      });
      return filtered.slice(0, params.limit || 8);
    }
  },

  /**
   * Fetch related items in the same category (alias for getSimilarItems)
   */
  getRelatedItems: async (id, category) => {
    return itemService.getSimilarItems(id, { category, limit: 6 });
  },

  /**
   * Save / bookmark an item
   */
  saveItem: async (id) => {
    try {
      const response = await api.post(`/items/${id}/save`);
      return response.data;
    } catch {
      return { success: true, saved: true };
    }
  },

  /**
   * Publish / create a new community item listing
   * @param {Object} itemData - Item listing payload
   */
  createItem: async (itemData) => {
    try {
      const response = await api.post('/items', itemData);
      if (response.data && response.data.item) {
        // Also keep in-memory mockItems synchronized for instant local discovery
        const serverItem = response.data.item;
        const normalized = {
          id: serverItem._id || serverItem.id,
          ...serverItem
        };
        mockItems.unshift(normalized);
        recordImpactAction({ category: itemData.category, quantity: 1, type: itemData.sharingType || 'share' });
        return response.data;
      }
      recordImpactAction({ category: itemData.category, quantity: 1, type: itemData.sharingType || 'share' });
      return response.data;
    } catch (err) {
      // In development fallback, create real structured item object
      const newId = `item-${Date.now()}`;
      const primaryImage = Array.isArray(itemData.images) && itemData.images.length > 0
        ? (typeof itemData.images[0] === 'string' ? itemData.images[0] : itemData.images[0].url)
        : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';

      const normalizedImages = Array.isArray(itemData.images) && itemData.images.length > 0
        ? itemData.images.map((img) => (typeof img === 'string' ? img : img.url))
        : [primaryImage];

      const newItem = {
        id: newId,
        _id: newId,
        title: itemData.title,
        description: itemData.description,
        category: itemData.category,
        subcategory: itemData.subcategory || 'General',
        brand: itemData.brand || '',
        model: itemData.model || '',
        sharingType: itemData.sharingType || 'give_away',
        condition: itemData.condition || 'good',
        images: normalizedImages,
        location: typeof itemData.location === 'string'
          ? itemData.location
          : `${itemData.location?.locality ? itemData.location.locality + ', ' : ''}${itemData.location?.city || 'Bengaluru'}`,
        availability: 'Available now',
        status: 'AVAILABLE',
        borrowSettings: itemData.borrowSettings || null,
        exchangeDetails: itemData.exchangeDetails || null,
        createdAt: new Date().toISOString(),
        viewsCount: 1,
        savesCount: 0,
        owner: {
          id: 'usr-101',
          name: 'Aarav Sharma',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          trustScore: 98,
          rating: 4.9,
          reviewsCount: 32,
          responseRate: '15 mins',
          verified: true
        }
      };

      mockItems.unshift(newItem);
      recordImpactAction({ category: itemData.category, quantity: 1, type: itemData.sharingType || 'share' });

      return {
        success: true,
        message: 'Your item is now shared with the community.',
        item: newItem
      };
    }
  },

  /**
   * Fetch items owned by the authenticated user
   * @param {Object} params - Query filters { search, category, sharingType, condition, status, sort, page, limit }
   */
  getMyItems: async (params = {}) => {
    try {
      const response = await api.get('/items/my', { params });
      return response.data;
    } catch {
      // Robust development fallback matching user's listings in mock data
      const {
        search = '',
        category = 'all',
        sharingType = 'all',
        condition = 'all',
        status = 'all',
        sort = 'newest',
        page = 1,
        limit = 12
      } = params;

      // Filter to items created by current user or demo user
      let userListings = mockItems.filter(
        (i) => !i.owner?.id || i.owner.id === 'usr-101' || i.id?.startsWith('item-')
      );

      // Exclude removed items unless status === 'removed'
      if (status !== 'removed') {
        userListings = userListings.filter((i) => i.status !== 'removed' && i.status !== 'REMOVED');
      }

      // 1. Status Filter
      if (status && status !== 'all') {
        if (status === 'available') {
          userListings = userListings.filter((i) => i.availability === 'Available' || i.status === 'AVAILABLE' || i.availability === 'Available now');
        } else if (status === 'unavailable') {
          userListings = userListings.filter((i) => i.availability === 'Unavailable' || i.status === 'UNAVAILABLE');
        } else if (status === 'pending') {
          userListings = userListings.filter((i) => i.status === 'PENDING' || i.status === 'pending moderation');
        } else if (status === 'borrowed') {
          userListings = userListings.filter((i) => i.availability === 'Reserved' || i.status === 'BORROWED');
        } else if (status === 'completed') {
          userListings = userListings.filter((i) => i.status === 'COMPLETED' || i.status === 'completed');
        }
      }

      // 2. Keyword Search
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        userListings = userListings.filter((i) =>
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.subcategory?.toLowerCase().includes(q)
        );
      }

      // 3. Category Filter
      if (category && category !== 'all') {
        userListings = userListings.filter((i) => i.category === category);
      }

      // 4. Sharing Type Filter
      if (sharingType && sharingType !== 'all') {
        userListings = userListings.filter((i) => i.sharingType === sharingType);
      }

      // 5. Condition Filter
      if (condition && condition !== 'all') {
        userListings = userListings.filter((i) => i.condition === condition);
      }

      // 6. Sorting
      userListings.sort((a, b) => {
        if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (sort === 'alphabetical') return (a.title || '').localeCompare(b.title || '');
        return 0;
      });

      const total = userListings.length;
      const currentPage = Math.max(1, parseInt(page, 10));
      const pageSize = Math.max(1, parseInt(limit, 10));
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedItems = userListings.slice(startIndex, startIndex + pageSize);

      return {
        success: true,
        items: paginatedItems,
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      };
    }
  },

  /**
   * Fetch summary counts for user listings
   */
  getMyItemsSummary: async () => {
    try {
      const response = await api.get('/items/my/summary');
      return response.data;
    } catch {
      const userListings = mockItems.filter(
        (i) => (!i.owner?.id || i.owner.id === 'usr-101' || i.id?.startsWith('item-')) && i.status !== 'removed'
      );
      const total = userListings.length;
      const available = userListings.filter((i) => i.availability === 'Available' || i.status === 'AVAILABLE' || i.availability === 'Available now').length;
      const pending = userListings.filter((i) => i.status === 'PENDING').length;
      const borrowed = userListings.filter((i) => i.availability === 'Reserved' || i.status === 'BORROWED').length;
      const completed = userListings.filter((i) => i.status === 'COMPLETED').length;

      return {
        success: true,
        summary: {
          total,
          available,
          pending,
          borrowed,
          completed
        }
      };
    }
  },

  /**
   * Toggle item availability
   */
  updateItemAvailability: async (id, availability) => {
    try {
      const response = await api.patch(`/items/${id}/availability`, { availability });
      return response.data;
    } catch {
      const item = mockItems.find((i) => i.id === id || i._id === id);
      if (item) {
        item.availability = availability;
        item.status = availability === 'Available' ? 'AVAILABLE' : 'UNAVAILABLE';
      }
      return { success: true, item: { id, availability } };
    }
  },

  /**
   * Soft-delete / remove item from active community discovery
   */
  deleteItem: async (id) => {
    try {
      const response = await api.delete(`/items/${id}`);
      return response.data;
    } catch {
      const itemIndex = mockItems.findIndex((i) => i.id === id || i._id === id);
      if (itemIndex !== -1) {
        mockItems[itemIndex].status = 'removed';
        mockItems[itemIndex].availability = 'Unavailable';
      }
      return { success: true, message: 'Item removed from active discovery.' };
    }
  },

  /**
   * Save item to user bookmarks
   */
  saveItem: async (id) => {
    try {
      const response = await api.post(`/items/${id}/save`);
      return response.data;
    } catch {
      return { success: true, saved: true };
    }
  },

  /**
   * Remove item from user bookmarks
   */
  unsaveItem: async (id) => {
    try {
      const response = await api.delete(`/items/${id}/save`);
      return response.data;
    } catch {
      return { success: true, saved: false };
    }
  },

  /**
   * Check if item is saved
   */
  getSavedStatus: async (id) => {
    try {
      const response = await api.get(`/items/${id}/save-status`);
      return response.data;
    } catch {
      return { success: true, saved: false };
    }
  },

  /**
   * Real backend-powered discovery with geospatial radius and multi-attribute filters
   */
  discoverItems: async (params = {}) => {
    try {
      const response = await api.get('/items/discover', { params });
      return response.data;
    } catch (error) {
      console.error('Error discovering items:', error);
      return { success: false, items: [], total: 0, totalPages: 1 };
    }
  },

  /**
   * Retrieve active community wanted requests matching this item
   */
  getItemMatches: async (itemId, params = {}) => {
    try {
      const response = await api.get(`/items/${itemId}/matches`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching item matches:', error);
      return { success: false, matches: [], count: 0 };
    }
  },

  /**
   * Fetch nearby items (alias for getItems with geographic prioritization)
   */
  getNearbyItems: async (params = {}) => {
    return itemService.getItems(params);
  }
};

export default itemService;
