import axios from 'axios';
import storage from '../utils/storage';
import Config from '../constants/config';

/**
 * Axios instance with JWT interceptors.
 * Automatically attaches access token and handles 401 refresh.
 */
const api = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// ── Request interceptor: attach JWT token ──
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(Config.ACCESS_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get access token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 → refresh token ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Format validation errors into a friendly combined message
    if (error.response?.status === 400 && Array.isArray(error.response?.data?.errors)) {
      const messages = error.response.data.errors.map(e => e.message || e.msg).filter(Boolean);
      if (messages.length > 0) {
        error.response.data.message = messages.join('\n');
      }
    }

    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getItem(Config.REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          // No refresh token — user must login again
          await clearTokens();
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const res = await axios.post(`${Config.API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = res.data.data;

        // Store new tokens
        await storage.setItem(Config.ACCESS_TOKEN_KEY, access_token);
        await storage.setItem(Config.REFRESH_TOKEN_KEY, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear tokens and force re-login
        await clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Clear stored tokens (logout).
 */
async function clearTokens() {
  try {
    await storage.deleteItem(Config.ACCESS_TOKEN_KEY);
    await storage.deleteItem(Config.REFRESH_TOKEN_KEY);
    await storage.deleteItem(Config.USER_DATA_KEY);
  } catch (error) {
    console.warn('Failed to clear tokens:', error);
  }
}

export { clearTokens };
export default api;
