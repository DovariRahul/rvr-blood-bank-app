import api from './api';

/**
 * Donor service — wraps donor API endpoints.
 */
const donorService = {
  async registerDonor(data) {
    const res = await api.post('/donors/register', data);
    return res.data;
  },

  async getMyProfile() {
    const res = await api.get('/donors/profile');
    return res.data;
  },

  async updateProfile(donorId, data) {
    const res = await api.put(`/donors/${donorId}`, data);
    return res.data;
  },

  async toggleAvailability(donorId, isAvailable) {
    const res = await api.patch(`/donors/${donorId}/availability`, {
      is_available: isAvailable,
    });
    return res.data;
  },

  async respondToRequest(requestId, response) {
    const res = await api.post(`/donors/respond/${requestId}`, { response });
    return res.data;
  },

  async getDonors(params = {}) {
    const res = await api.get('/donors', { params });
    return res.data;
  },

  async deleteAccount(password) {
    const res = await api.delete('/donors/account', { data: { password } });
    return res.data;
  },
};

export default donorService;
