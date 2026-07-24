import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import store from '../store/store';
import { fetchCurrentUser } from '../store/slices/authSlice';
import { fetchNotifications, fetchUnreadCount } from '../store/slices/notificationSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import Colors from '../constants/colors';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notification.service';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,  // replaces deprecated shouldShowAlert — controls banner pop-up
    shouldShowList: true,    // replaces deprecated shouldShowAlert — controls notification tray entry
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Prevent splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

  // Track if we were previously authenticated (to detect logout)
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Once user authentication check is finished, hide splash screen
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // ── Central Auth Guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return; // Wait until auth check completes

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && user) {
      // Logged in — if on auth screen, redirect to role dashboard
      if (inAuthGroup) {
        if (user.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else if (user.role === 'donor') {
          router.replace('/(donor)/home');
        } else {
          router.replace('/(requester)/home');
        }
      }
      wasAuthenticated.current = true;
    } else if (!isAuthenticated && wasAuthenticated.current) {
      // Just logged out — redirect to public landing page
      wasAuthenticated.current = false;
      router.replace('/');
    }
  }, [isAuthenticated, user, isLoading, segments]);

  // ── Push Notification Registration & Listeners ─────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user) {
      // Request permissions and register token with backend
      notificationService.registerForPushNotifications();

      // Listen to incoming notifications when the app is in the foreground
      const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[FCM] Notification received in foreground:', notification);
        // Immediately refresh the notification list and unread badge
        // so the Notifications tab updates without a manual pull-to-refresh.
        dispatch(fetchNotifications());
        dispatch(fetchUnreadCount());
      });

      // Listen to notification interactions (clicks)
      const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('FCM Notification clicked:', response);
        const data = response.notification.request.content.data;
        if (data) {
          if (user.role === 'admin') {
            router.push('/(admin)/dashboard');
          } else if (user.role === 'donor') {
            // Donors view alerts/requests inside notifications tab
            router.push('/(donor)/notifications');
          } else {
            // Rejected requests: go to notifications tab so user reads the reason + patient details.
            // Approved/donor-accepted requests: go directly to the track-request screen.
            if (data.type === 'request_rejected') {
              router.push('/(requester)/notifications');
            } else if (data.requestId) {
              router.push(`/(requester)/track-request/${data.requestId}`);
            } else {
              router.push('/(requester)/notifications');
            }
          }
        }
      });

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [isAuthenticated, user]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(requester)" options={{ headerShown: false }} />
        <Stack.Screen name="(donor)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
