import axios from 'axios';

/**
 * Central Axios API Client for LOOOP
 * Configured with baseURL from VITE_API_URL, Bearer token injection, and error formatting
 */
/**
 * Robust URL sanitizer to prevent browser 'Failed to construct URL' crashes
 * Handles missing protocols, quotes, trailing slashes, and malformed inputs gracefully.
 */
export const sanitizeApiBaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '/api';
  let cleaned = rawUrl.trim().replace(/^['"]|['"]$/g, '').trim();
  if (!cleaned) return '/api';
  if (cleaned.startsWith('postgres://') || cleaned.startsWith('postgresql://')) {
    console.warn('[LOOOP Config] PostgreSQL URI was supplied to frontend VITE_API_URL. Falling back to /api');
    return '/api';
  }
  if (
    cleaned.includes('<') ||
    cleaned.includes('>') ||
    cleaned.includes('your-render') ||
    cleaned.includes('your-backend') ||
    cleaned.includes('example.com')
  ) {
    console.warn('[LOOOP Config] Placeholder hostname found in VITE_API_URL. Falling back to /api');
    return '/api';
  }
  if (cleaned.startsWith('/')) return cleaned.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) cleaned = 'https://' + cleaned;
  cleaned = cleaned.replace(/\/+$/, '');
  try {
    const parsed = new URL(cleaned);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = '/api';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch (err) {
    return '/api';
  }
};

const API_BASE_URL = sanitizeApiBaseUrl(import.meta.env?.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request Interceptor: inject stored JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('looop_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: normalize error messaging and handle session expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';

    if (error.response) {
      // Backend responded with status other than 2xx
      if (error.response.status === 401) {
        message = 'Your session has expired. Please log in again.';
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('looop_token') || '';
          const isDemoToken = token.startsWith('looop_demo_') || token.startsWith('mock_token_');
          if (!isDemoToken) {
            localStorage.removeItem('looop_token');
            localStorage.removeItem('looop_user');
            window.dispatchEvent(new CustomEvent('looop:session_expired'));
          }
        }
      } else {
        message = error.response.data?.message || error.response.data?.error || `Server responded with status ${error.response.status}`;
      }
    } else if (error.request) {
      // Request was made but no response received (server down or CORS issue)
      message = 'Cannot connect to LOOOP server. Please ensure the backend is running.';
    } else {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status || 0;
    enhancedError.data = error.response?.data || null;

    return Promise.reject(enhancedError);
  }
);

// In-flight GET request deduplication map to prevent parallel duplicate HTTP calls
const inFlightRequests = new Map();

// Lightweight client-side memory cache with TTL (for static/semi-static data like categories)
const apiCache = new Map();
const CACHEABLE_ROUTES = ['/categories', '/impact/summary'];
const DEFAULT_CACHE_TTL_MS = 60000; // 1 minute

export const clearApiCache = (pattern) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

export const api = {
  get: async (url, config = {}) => {
    const isCacheable = CACHEABLE_ROUTES.some((route) => url.startsWith(route)) && !config.params;
    const now = Date.now();

    if (isCacheable) {
      const cached = apiCache.get(url);
      if (cached && (now - cached.timestamp) < (config.cacheTtl || DEFAULT_CACHE_TTL_MS)) {
        return cached.data;
      }
    }

    // Deduplicate in-flight requests with identical URL and params
    const requestKey = `GET:${url}:${JSON.stringify(config.params || {})}`;
    if (inFlightRequests.has(requestKey)) {
      return inFlightRequests.get(requestKey);
    }

    const promise = apiClient.get(url, config)
      .then((res) => {
        if (isCacheable) {
          apiCache.set(url, { data: res, timestamp: Date.now() });
        }
        return res;
      })
      .finally(() => {
        inFlightRequests.delete(requestKey);
      });

    inFlightRequests.set(requestKey, promise);
    return promise;
  },

  post: async (url, data, config) => {
    clearApiCache();
    return apiClient.post(url, data, config);
  },

  put: async (url, data, config) => {
    clearApiCache();
    return apiClient.put(url, data, config);
  },

  patch: async (url, data, config) => {
    clearApiCache();
    return apiClient.patch(url, data, config);
  },

  delete: async (url, config) => {
    clearApiCache();
    return apiClient.delete(url, config);
  },

  checkHealth: () => apiClient.get('/health')
};

export default api;
