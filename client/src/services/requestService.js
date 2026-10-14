import api from './api';

/**
 * Request Service
 * Handles requests for available items (giveaway, borrow, exchange)
 * and offers submitted to help with wanted items.
 * Connects directly to real backend endpoints.
 */
export const requestService = {
  /**
   * Create a new request for an available item or an offer on a wanted item
   * @param {Object} data - { itemId, wantedItemId, type, message, expectedReturnDate, offeredItemId }
   * @returns {Promise<Object>}
   */
  createRequest: async (data) => {
    const response = await api.post('/requests', data);
    return response.data;
  },

  /**
   * Fetch all requests initiated by the current authenticated user
   * @returns {Promise<Object>}
   */
  getMyRequests: async () => {
    const response = await api.get('/requests/my');
    return response.data;
  },

  /**
   * Fetch all requests/offers received by the current user on their items or wanted posts
   * @returns {Promise<Object>}
   */
  getReceivedRequests: async () => {
    const response = await api.get('/requests/received');
    return response.data;
  },

  /**
   * Fetch a single request by its ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  getRequestById: async (id) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
  },

  /**
   * Accept an incoming request (only item/wanted owner can accept)
   * @param {string} id
   * @returns {Promise<Object>}
   */
  acceptRequest: async (id) => {
    const response = await api.patch(`/requests/${id}/accept`);
    return response.data;
  },

  /**
   * Decline an incoming request (only item/wanted owner can decline)
   * @param {string} id
   * @returns {Promise<Object>}
   */
  declineRequest: async (id) => {
    const response = await api.patch(`/requests/${id}/decline`);
    return response.data;
  },

  /**
   * Cancel an outgoing pending request (only requester can cancel)
   * @param {string} id
   * @returns {Promise<Object>}
   */
  cancelRequest: async (id) => {
    const response = await api.patch(`/requests/${id}/cancel`);
    return response.data;
  },

  /**
   * Mark item as taken, complete handover, and wipe chat history from database
   * @param {string} id
   * @returns {Promise<Object>}
   */
  markItemTaken: async (id) => {
    const response = await api.patch(`/requests/${id}/taken`);
    return response.data;
  },

  /**
   * Fetch recent requests for dashboard preview
   */
  getRecentRequests: async () => {
    return requestService.getMyRequests();
  }
};

export default requestService;
