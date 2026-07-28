import api from './api';

/**
 * Blood request service — wraps request API endpoints.
 */
const requestService = {
  async createRequest(data) {
    const res = await api.post('/requests', data);
    return res.data;
  },

  async getRequests(params = {}) {
    const res = await api.get('/requests', { params });
    return res.data;
  },

  async getRequest(id) {
    const res = await api.get(`/requests/${id}`);
    return res.data;
  },

  async cancelRequest(id) {
    const res = await api.patch(`/requests/${id}/cancel`);
    return res.data;
  },

  async deleteRequest(id) {
    const res = await api.delete(`/requests/${id}`);
    return res.data;
  },

  async updateStatus(id, status) {
    const res = await api.patch(`/requests/${id}/status`, { status });
    return res.data;
  },
};

export default requestService;
