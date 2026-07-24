/**
 * App configuration constants.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolve the backend API base URL.
 *
 * Priority order:
 *  1. EXPO_PUBLIC_API_URL env var (written by dev.js / tunnel). Rejected if it
 *     is a tunnel URL but EXPO_PUBLIC_API_URL wasn't set (stale bake-in guard).
 *  2. Auto-detected LAN IP baked into the bundle by app.config.js (most reliable
 *     for physical devices on the same network as the dev machine).
 *  3. debuggerHost / linkingUri IP extraction (LAN IPs only — tunnel hosts are
 *     skipped because they don't expose port 5000).
 *  4. Platform-specific emulator defaults as last resort.
 */
const getApiBaseUrl = () => {
  // ── 1. Explicit env override (written by dev.js each time tunnel starts) ──
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    // Guard: reject placeholder / obviously wrong values
    if (!envUrl.includes('your-backend') && !envUrl.includes('example.com')) {
      return envUrl.trim();
    }
  }

  if (__DEV__) {
    // ── Web: use current hostname ─────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      return `http://${hostname}:5000/api`;
    }

    // ── 2. LAN IP auto-detected by app.config.js (most reliable for devices) ──
    const localIpAddress = Constants.expoConfig?.extra?.localIpAddress;
    if (localIpAddress && localIpAddress !== '127.0.0.1') {
      return `http://${localIpAddress}:5000/api`;
    }

    // ── 3. Extract IP from Expo's internal debug host fields ─────────────────
    //    Skip any tunnel host (exp.direct, ngrok, trycloudflare) — they do not
    //    expose port 5000, only the Expo bundle port.
    const isTunnelHost = (h) =>
      h.includes('exp.direct') ||
      h.includes('ngrok') ||
      h.includes('trycloudflare') ||
      h.includes('cloudflare');

    const debuggerHost =
      Constants.expoGoProjectConfig?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.expoConfig?.hostUri;

    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      if (ip && !isTunnelHost(ip)) {
        return `http://${ip}:5000/api`;
      }
    }

    const linkingUri = Constants.linkingUri;
    if (linkingUri) {
      try {
        const hostname = linkingUri.split('://')[1]?.split(':')[0];
        if (
          hostname &&
          hostname !== 'localhost' &&
          hostname !== '127.0.0.1' &&
          !isTunnelHost(hostname)
        ) {
          return `http://${hostname}:5000/api`;
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    // ── 4. Emulator / simulator fallbacks ────────────────────────────────────
    //    If we reach here with NO EXPO_PUBLIC_API_URL and NO valid LAN IP, it
    //    almost certainly means dev.js was not run or the .env is stale.
    //    Log a clear warning so the developer knows exactly what to do.
    console.warn(
      '[Config] ⚠️  Could not resolve a valid backend URL.\n' +
      '  • If using a physical device or tunnel, run `node dev.js` from the\n' +
      '    project root — it will write the correct URL to mobile-app/.env.\n' +
      '  • Then restart Expo with: npx expo start -c\n' +
      '  Falling back to emulator address — this WILL fail on a physical device.'
    );

    if (Platform.OS === 'ios') {
      return 'http://localhost:5000/api';
    }
    return 'http://10.0.2.2:5000/api'; // Android emulator only
  }

  return 'https://your-api.onrender.com/api';
};

const Config = {
  API_BASE_URL: getApiBaseUrl(),

  // Token storage keys
  ACCESS_TOKEN_KEY: 'lifelink_access_token',
  REFRESH_TOKEN_KEY: 'lifelink_refresh_token',
  USER_DATA_KEY: 'lifelink_user_data',

  // App metadata
  APP_NAME: 'RVR Blood Bank',
  APP_VERSION: '1.0.0',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Notification polling interval (ms)
  NOTIFICATION_POLL_INTERVAL: 30000, // 30 seconds
};

export default Config;
