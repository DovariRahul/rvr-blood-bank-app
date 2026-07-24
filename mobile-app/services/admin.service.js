import api from './api';

/**
 * Admin service — wraps admin API endpoints.
 */
const adminService = {
  async getAnalytics() {
    const res = await api.get('/admin/analytics');
    return res.data;
  },

  async getActiveRequests() {
    const res = await api.get('/admin/requests/active');
    return res.data;
  },

  async getPendingVerification() {
    const res = await api.get('/admin/requests/pending-verification');
    return res.data;
  },

  async verifyRequest(requestId, action, rejectionReason = null) {
    const res = await api.patch(`/admin/requests/${requestId}/verify`, {
      action,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  async getUsers(params = {}) {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  async getUserById(userId) {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },

  async updateUser(userId, data) {
    const res = await api.patch(`/admin/users/${userId}`, data);
    return res.data;
  },

  async getAuditLog(params = {}) {
    const res = await api.get('/admin/audit-log', { params });
    return res.data;
  },

  async getPublicStats() {
    const res = await api.get('/stats/public');
    return res.data;
  },
};

export default adminService;
