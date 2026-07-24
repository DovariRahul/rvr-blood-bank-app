import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

/**
 * Notification service — wraps notification API endpoints.
 */
const notificationService = {
  async getNotifications() {
    const res = await api.get('/notifications');
    return res.data;
  },

  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(notificationId) {
    const res = await api.patch(`/notifications/${notificationId}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },

  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('[FCM] Push notifications require a physical device — skipping registration.');
      return null;
    }

    try {
      // ── Step 1: Request permission ────────────────────────────────────────
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('[FCM] Push notification permission denied by user.');
        return null;
      }

      // ── Step 2: Create Android channel BEFORE fetching the token ─────────
      // The channel must exist before any notification is delivered.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Blood Bank Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E53935',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          sound: 'default',
        });
        console.log('[FCM] Android notification channel "default" configured.');
      }

      // ── Step 3: Get the native device token ───────────────────────────────
      let token = null;
      if (Platform.OS === 'android') {
        // Native FCM token — required for direct server-to-device push via Firebase Admin SDK
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken?.data ?? null;
      } else {
        // Expo push token for iOS / other platforms
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
        token = expoPushToken?.data ?? null;
      }

      if (!token) {
        console.error('[FCM] Failed to retrieve device push token — token is null.');
        return null;
      }

      console.log('[FCM] Device Push Token obtained:', token);

      // ── Step 4: Register the token with the backend ───────────────────────
      await api.patch('/auth/fcm-token', { fcm_token: token });
      console.log('[FCM] Token registered with backend successfully.');

      return token;
    } catch (error) {
      console.error('[FCM] Error during push notification registration:', error?.message || error);
      return null;
    }
  },
};

export default notificationService;
