import api, { clearTokens } from './api';
import storage from '../utils/storage';
import Config from '../constants/config';

/**
 * Authentication service — wraps auth API endpoints.
 */
const authService = {
  /**
   * Register a new user.
   */
  async register({ fullName, email, phone, password, bloodGroup, role }) {
    const res = await api.post('/auth/register', {
      full_name: fullName,
      email,
      phone,
      password,
      blood_group: bloodGroup,
      role,
    });

    // Store tokens
    await storage.setItem(Config.ACCESS_TOKEN_KEY, res.data.data.access_token);
    await storage.setItem(Config.REFRESH_TOKEN_KEY, res.data.data.refresh_token);
    await storage.setItem(Config.USER_DATA_KEY, JSON.stringify(res.data.data.user));

    return res.data;
  },

  /**
   * Login with email and password.
   */
  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password });

    await storage.setItem(Config.ACCESS_TOKEN_KEY, res.data.data.access_token);
    await storage.setItem(Config.REFRESH_TOKEN_KEY, res.data.data.refresh_token);
    await storage.setItem(Config.USER_DATA_KEY, JSON.stringify(res.data.data.user));

    return res.data;
  },

  /**
   * Get the current authenticated user.
   */
  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /**
   * Request a password reset.
   */
  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Update FCM token on the server.
   */
  async updateFcmToken(fcmToken) {
    const res = await api.patch('/auth/fcm-token', { fcm_token: fcmToken });
    return res.data;
  },

  /**
   * Logout — clear all stored tokens.
   */
  async logout() {
    await clearTokens();
  },

  /**
   * Check if user is logged in (has stored token).
   */
  async isLoggedIn() {
    const token = await storage.getItem(Config.ACCESS_TOKEN_KEY);
    return !!token;
  },

  /**
   * Update the user's basic profile.
   */
  async updateProfile(data) {
    const res = await api.put('/auth/profile', data);
    
    // Sync update to storage
    if (res.data?.success && res.data?.data?.user) {
      const updatedUser = res.data.data.user;
      const stored = await this.getStoredUser();
      if (stored) {
        const merged = { ...stored, ...updatedUser };
        await storage.setItem(Config.USER_DATA_KEY, JSON.stringify(merged));
      }
    }
    return res.data;
  },

  /**
   * Get stored user data.
   */
  async getStoredUser() {
    const userData = await storage.getItem(Config.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },
};

export default authService;
