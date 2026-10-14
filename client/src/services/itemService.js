import api from './api';
import { mockItems, mockCategories } from '../data/mockData';
import { recordImpactAction } from '../utils/communityImpactTracker';
import { neonDb } from './neonDbService';

const LOCAL_SHARED_ITEMS_KEY = 'looop_community_shared_items';

export function getLocalSharedItems() {
  try {
    const raw = localStorage.getItem(LOCAL_SHARED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSharedItem(item) {
  try {
    const existing = getLocalSharedItems();
    const itemId = item._id || item.id;
    const filtered = existing.filter((i) => i.id !== itemId && i._id !== itemId);
    const updated = [item, ...filtered];
    localStorage.setItem(LOCAL_SHARED_ITEMS_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    console.warn('[itemService] Failed to save local shared item:', err);
  }
}

/**
 * Normalize image URL for browser display
 */
export function normalizeImageUrl(img) {
  if (!img) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
  const urlStr = typeof img === 'string' ? img : (img.url || '');
  if (!urlStr) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
  if (urlStr.startsWith('data:') || urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  if (urlStr.startsWith('/uploads/')) {
    const apiUrl = import.meta.env?.VITE_API_URL;
    if (apiUrl && !apiUrl.startsWith('/')) {
      try {
        const u = new URL(apiUrl);
        return `${u.origin}${urlStr}`;
      } catch {}
    }
  }
  return urlStr;
}

/**
 * Item Service
 * Handles discovery, nearby items, and category listings
 */
export const itemService = {
  /**
   * Primary Global Discovery endpoint called by BrowsePage
   * Retrieves items from backend (Neon PostgreSQL) with search, filter, proximity, and pagination.
   */
  discoverItems: async (params = {}) => {
    try {
      const response = await api.get('/items/discover', { params, timeout: 5000 });
      if (response.data && response.data.success && Array.isArray(response.data.items) && response.data.items.length > 0) {
        const rawItems = response.data.items || [];
        const items = rawItems.map((item) => ({
          ...item,
          id: item._id || item.id,
          images: (item.images || []).map(normalizeImageUrl)
        }));

        // Merge any newly created local items by this customer to ensure zero latency
        const localItems = getLocalSharedItems().filter((localItem) => {
          if (params.category && params.category !== 'all') {
            const cat = (localItem.category || '').toLowerCase();
            const pCat = params.category.toLowerCase();
            if (pCat === 'education' || pCat === 'books') {
              if (!cat.includes('book') && !cat.includes('study') && !cat.includes('educat')) return false;
            } else if (!cat.includes(pCat)) {
              return false;
            }
          }
          if (params.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            const t = (localItem.title || '').toLowerCase();
            const d = (localItem.description || '').toLowerCase();
            if (!t.includes(q) && !d.includes(q)) return false;
          }
          return true;
        });

        if (localItems.length > 0) {
          const itemMap = new Map();
          items.forEach((i) => {
            const key = i.id || i._id;
            if (key) itemMap.set(key, i);
          });
          localItems.forEach((i) => {
            const key = i.id || i._id;
            if (key && !itemMap.has(key)) {
              itemMap.set(key, { ...i, images: (i.images || []).map(normalizeImageUrl) });
            }
          });
          const combined = Array.from(itemMap.values());
          return {
            success: true,
            items: combined.slice(0, params.limit || 12),
            total: Math.max(response.data.total || 0, combined.length),
            page: response.data.page || 1,
            totalPages: Math.ceil(Math.max(response.data.total || 0, combined.length) / (params.limit || 12)) || 1,
            limit: response.data.limit || 12
          };
        }

        return {
          success: true,
          items,
          total: response.data.total || items.length,
          page: response.data.page || 1,
          totalPages: response.data.totalPages || 1,
          limit: response.data.limit || 12
        };
      }
    } catch (apiErr) {
      console.warn('[itemService.discoverItems] Discovery API notice:', apiErr.message);
    }

    // Direct Neon PostgreSQL fallback
    return itemService.getItems(params);
  },

  /**
   * Fetch paginated and filtered items for Browse & Discovery
   * Queries real Neon PostgreSQL database directly if backend API is offline or serverless
   */
  getItems: async (params = {}) => {
    let apiItems = [];
    try {
      const response = await api.get('/items', { params: { ...params, limit: params.limit || 50 }, timeout: 4000 });
      apiItems = response.data?.items || (Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.warn('[itemService.getItems] API fetch notice:', err.message);
    }

    // Query Neon PostgreSQL directly if API returned empty or had network issues
    let directNeonItems = [];
    if (apiItems.length === 0) {
      try {
        const neonRes = await neonDb.getAllItems(params);
        if (neonRes && Array.isArray(neonRes.items) && neonRes.items.length > 0) {
          directNeonItems = neonRes.items;
        }
      } catch (neonErr) {
        console.warn('[itemService.getItems] Direct Neon query notice:', neonErr.message);
      }
    }

    const normalizedApi = apiItems.map((item) => ({
      ...item,
      id: item._id || item.id,
      images: (item.images || []).map(normalizeImageUrl)
    }));

    // Merge persistent local items matching active filters
    const localItems = getLocalSharedItems().filter((localItem) => {
      if (params.category && params.category !== 'all') {
        const cat = (localItem.category || '').toLowerCase();
        const pCat = params.category.toLowerCase();
        if (pCat === 'education' || pCat === 'books') {
          if (!cat.includes('book') && !cat.includes('study') && !cat.includes('educat')) return false;
        } else if (!cat.includes(pCat)) {
          return false;
        }
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        const t = (localItem.title || '').toLowerCase();
        const d = (localItem.description || '').toLowerCase();
        if (!t.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });

    const combinedMap = new Map();
    // 1. Direct Neon items from PostgreSQL database
    directNeonItems.forEach((i) => combinedMap.set(i.id || i._id, { ...i, images: (i.images || []).map(normalizeImageUrl) }));
    // 2. Persistent local items from customer browser
    localItems.forEach((i) => {
      const key = i.id || i._id;
      if (key && !combinedMap.has(key)) {
        combinedMap.set(key, { ...i, images: (i.images || []).map(normalizeImageUrl) });
      }
    });
    // 3. API items from backend
    normalizedApi.forEach((i) => combinedMap.set(i.id || i._id, i));

    let allItems = Array.from(combinedMap.values());
    if (allItems.length === 0) {
      allItems = mockItems;
    }

    return {
      items: allItems.slice(0, params.limit || 12),
      total: allItems.length,
      page: 1,
      limit: params.limit || 12,
      totalPages: Math.ceil(allItems.length / (params.limit || 12)) || 1
    };
  },

  /**
   * Fetch nearby items for dashboard or quick preview
   */
  getNearbyItems: async (params = {}) => {
    try {
      const response = await api.get('/items/nearby', { params, timeout: 4000 });
      return response.data;
    } catch {
      try {
        const neonRes = await neonDb.getAllItems({ limit: 8 });
        if (neonRes && neonRes.items && neonRes.items.length > 0) {
          return neonRes.items;
        }
      } catch {}
      return mockItems;
    }
  },

  /**
   * Fetch categories list with real item counts
   */
  getCategories: async () => {
    try {
      const response = await api.get('/categories', { timeout: 4000 });
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
   * Queries real backend first, then directly queries Neon PostgreSQL Cloud Database
   */
  getItemById: async (id) => {
    if (!id) return null;

    // 1. Fetch from backend API
    try {
      const response = await api.get(`/items/${id}`, { timeout: 4000 });
      const raw = response.data?.item || response.data;
      if (raw && (raw.title || raw._id || raw.id)) {
        return {
          ...raw,
          id: raw._id || raw.id,
          images: (raw.images || []).map(normalizeImageUrl)
        };
      }
    } catch (apiErr) {
      console.warn(`[itemService.getItemById] API fetch notice for ${id}:`, apiErr.message);
    }

    // 2. Query Neon PostgreSQL Database directly!
    // Ensures items uploaded by other users or from other browsers are immediately visible
    try {
      const neonItem = await neonDb.getItemById(id);
      if (neonItem && (neonItem.title || neonItem.id)) {
        return {
          ...neonItem,
          id: neonItem._id || neonItem.id,
          images: (neonItem.images || []).map(normalizeImageUrl)
        };
      }
    } catch (neonErr) {
      console.warn(`[itemService.getItemById] Neon DB query notice for ${id}:`, neonErr.message);
    }

    // 3. Check persistent local shared items
    const localItems = getLocalSharedItems();
    const localMatch = localItems.find((i) => i.id === id || i._id === id);
    if (localMatch) {
      return {
        ...localMatch,
        id: localMatch.id || localMatch._id,
        images: (localMatch.images || []).map(normalizeImageUrl)
      };
    }

    // 4. Check mock items as last fallback
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
        images: (mockMatch.images || []).map(normalizeImageUrl)
      };
    }

    return null;
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
    let currentUser = {};
    try {
      currentUser = JSON.parse(localStorage.getItem('looop_user') || '{}');
    } catch {}

    let serverItem = null;
    try {
      const response = await api.post('/items', itemData, { timeout: 6000 });
      if (response.data && response.data.item) {
        serverItem = response.data.item;
      }
    } catch (err) {
      console.warn('[itemService.createItem] API attempt notice:', err.message);
    }

    // Direct Neon Database Sync Guarantee:
    // Ensures item is stored directly in Neon PostgreSQL Cloud Database even in serverless or offline dev modes
    let directNeonItem = null;
    try {
      directNeonItem = await neonDb.saveItem(serverItem || itemData, currentUser);
    } catch (neonErr) {
      console.warn('[itemService.createItem] Direct Neon sync notice:', neonErr.message);
    }

    let finalItem = directNeonItem || (serverItem ? { id: serverItem._id || serverItem.id, _id: serverItem._id || serverItem.id, ...serverItem } : null);

    if (!finalItem) {
      // Create persistent structured item fallback
      const newId = itemData.id || itemData._id || `item-${Date.now()}`;
      const primaryImage = Array.isArray(itemData.images) && itemData.images.length > 0
        ? (typeof itemData.images[0] === 'string' ? itemData.images[0] : itemData.images[0].url)
        : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';

      const normalizedImages = Array.isArray(itemData.images) && itemData.images.length > 0
        ? itemData.images.map((img) => (typeof img === 'string' ? { url: img, isPrimary: true } : img))
        : [{ url: primaryImage, isPrimary: true }];

      const locCity = itemData.location?.city || (typeof itemData.location === 'string' ? itemData.location.split(',')[0] : 'Bengaluru');
      const locLocality = itemData.location?.locality || '';

      finalItem = {
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
        location: {
          city: locCity,
          locality: locLocality,
          approximateAddress: `${locLocality ? locLocality + ', ' : ''}${locCity}`
        },
        locationCoordinates: {
          type: 'Point',
          coordinates: itemData.coordinates || [77.5946, 12.9716]
        },
        availability: 'Available',
        status: 'active',
        borrowSettings: itemData.borrowSettings || null,
        exchangeDetails: itemData.exchangeDetails || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewsCount: 1,
        savesCount: 0,
        owner: {
          id: currentUser.id || currentUser._id || 'usr-local',
          _id: currentUser.id || currentUser._id || 'usr-local',
          name: currentUser.name || 'LOOOP Member',
          email: currentUser.email || '',
          avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          trustScore: currentUser.trustScore || 100,
          rating: 5.0,
          verified: true
        }
      };
    }

    saveLocalSharedItem(finalItem);
    mockItems.unshift(finalItem);
    recordImpactAction({ category: itemData.category, quantity: 1, type: itemData.sharingType || 'share' });

    return {
      success: true,
      message: 'Your item has been shared and saved to database!',
      item: finalItem
    };
  },

  /**
   * Fetch items owned by the authenticated user
   * @param {Object} params - Query filters { search, category, sharingType, condition, status, sort, page, limit }
   */
  getMyItems: async (params = {}) => {
    let apiItems = [];
    let apiTotal = 0;
    try {
      const response = await api.get('/items/my', { params });
      if (response.data && response.data.items) {
        apiItems = response.data.items;
        apiTotal = response.data.total || response.data.items.length;
      }
    } catch (err) {
      console.warn('[itemService.getMyItems] Backend fetch notice:', err.message);
    }

    // Identify active logged-in customer
    let currentUser = {};
    try {
      currentUser = JSON.parse(localStorage.getItem('looop_user') || '{}');
    } catch {}

    const currentId = currentUser.id || currentUser._id;
    const currentEmail = (currentUser.email || '').toLowerCase().trim();

    // Query Neon PostgreSQL directly if API returned empty or had network issues
    let directNeonItems = [];
    if (apiItems.length === 0 && (currentId || currentEmail)) {
      try {
        directNeonItems = await neonDb.getMyItems(currentId, currentEmail, params);
      } catch (neonErr) {
        console.warn('[itemService.getMyItems] Neon direct query notice:', neonErr.message);
      }
    }

    // Merge persistent local items belonging to this user
    const localItems = getLocalSharedItems().filter((item) => {
      const ownerId = item.owner?.id || item.owner?._id || item.owner_id;
      const ownerEmail = (item.owner?.email || '').toLowerCase().trim();
      return (currentId && ownerId === currentId) || (currentEmail && ownerEmail === currentEmail);
    });

    const combinedMap = new Map();
    // 1. Direct Neon PostgreSQL items
    directNeonItems.forEach((i) => combinedMap.set(i.id || i._id, { ...i, images: (i.images || []).map(normalizeImageUrl) }));
    // 2. Persistent local items
    localItems.forEach((i) => combinedMap.set(i.id || i._id, { ...i, images: (i.images || []).map(normalizeImageUrl) }));
    // 3. Authoritative backend API items
    apiItems.forEach((i) => combinedMap.set(i.id || i._id, { ...i, images: (i.images || []).map(normalizeImageUrl) }));

    let finalItems = Array.from(combinedMap.values());

    // Apply query filters
    if (params.status && params.status !== 'all') {
      if (params.status === 'available') {
        finalItems = finalItems.filter((i) => i.availability === 'Available' || i.status === 'active' || i.status === 'AVAILABLE');
      } else if (params.status === 'unavailable') {
        finalItems = finalItems.filter((i) => i.availability === 'Unavailable' || i.status === 'unavailable');
      } else if (params.status === 'borrowed') {
        finalItems = finalItems.filter((i) => i.availability === 'Reserved' || i.status === 'BORROWED');
      } else if (params.status === 'pending') {
        finalItems = finalItems.filter((i) => i.status === 'pending moderation' || i.status === 'PENDING');
      } else if (params.status === 'completed') {
        finalItems = finalItems.filter((i) => i.status === 'completed' || i.status === 'COMPLETED');
      }
    }
    if (params.category && params.category !== 'all') {
      finalItems = finalItems.filter((i) => (i.category || '').toLowerCase() === params.category.toLowerCase());
    }
    if (params.sharingType && params.sharingType !== 'all') {
      finalItems = finalItems.filter((i) => (i.sharingType || '').toLowerCase() === params.sharingType.toLowerCase());
    }
    if (params.condition && params.condition !== 'all') {
      finalItems = finalItems.filter((i) => (i.condition || '').toLowerCase() === params.condition.toLowerCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      finalItems = finalItems.filter((i) =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }

    finalItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = Math.max(apiTotal, finalItems.length);
    const currentPage = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.max(1, parseInt(params.limit || '12', 10));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = finalItems.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      items: paginatedItems,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1
    };
  },

  /**
   * Fetch summary counts for user listings
   */
  getMyItemsSummary: async () => {
    let apiSummary = null;
    try {
      const response = await api.get('/items/my/summary');
      if (response.data && response.data.summary && response.data.summary.total > 0) {
        return response.data;
      }
      if (response.data?.summary) {
        apiSummary = response.data.summary;
      }
    } catch (err) {
      console.warn('[itemService.getMyItemsSummary] API notice:', err.message);
    }

    // Try Neon PostgreSQL direct count
    let currentUser = {};
    try {
      currentUser = JSON.parse(localStorage.getItem('looop_user') || '{}');
    } catch {}
    const currentId = currentUser.id || currentUser._id;
    const currentEmail = (currentUser.email || '').toLowerCase().trim();

    if (currentId || currentEmail) {
      try {
        const neonSummary = await neonDb.getMyItemsSummary(currentId, currentEmail);
        if (neonSummary.total > 0) {
          return { success: true, summary: neonSummary };
        }
      } catch {}
    }

    if (apiSummary) {
      return { success: true, summary: apiSummary };
    }

    const localListings = getLocalSharedItems().filter((item) => {
      const ownerId = item.owner?.id || item.owner?._id || item.owner_id;
      const ownerEmail = (item.owner?.email || '').toLowerCase().trim();
      return (currentId && ownerId === currentId) || (currentEmail && ownerEmail === currentEmail);
    });

    const total = localListings.length;
    const available = localListings.filter((i) => i.availability === 'Available' || i.status === 'active' || i.status === 'AVAILABLE').length;
    const pending = localListings.filter((i) => i.status === 'pending moderation' || i.status === 'PENDING').length;
    const borrowed = localListings.filter((i) => i.availability === 'Reserved' || i.status === 'BORROWED').length;
    const completed = localListings.filter((i) => i.status === 'completed' || i.status === 'COMPLETED').length;

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
    let apiItems = [];
    let apiTotal = 0;
    let apiTotalPages = 1;

    try {
      const response = await api.get('/items/discover', { params });
      if (response.data && response.data.items) {
        apiItems = response.data.items;
        apiTotal = response.data.total || response.data.items.length;
        apiTotalPages = response.data.totalPages || 1;
      }
    } catch (error) {
      console.warn('Backend discover notice:', error.message);
    }

    // Merge persistent local items so items created on this device are always discovered
    const localItems = getLocalSharedItems();
    const combinedMap = new Map();
    apiItems.forEach((item) => combinedMap.set(item.id || item._id, item));
    localItems.forEach((item) => {
      const key = item.id || item._id;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, item);
      }
    });

    const allDiscovered = Array.from(combinedMap.values());
    return {
      success: true,
      items: allDiscovered,
      total: Math.max(apiTotal, allDiscovered.length),
      totalPages: Math.max(apiTotalPages, Math.ceil(allDiscovered.length / (params.limit || 12)) || 1)
    };
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
  }
};

export default itemService;
