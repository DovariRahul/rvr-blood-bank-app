import React, { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import Colors from '../../constants/colors';
import notificationService from '../../services/notification.service';

export default function DonorLayout() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshBadge = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.unread_count ?? 0);
    } catch (_) {}
  };

  useEffect(() => {
    // Fetch badge on mount
    refreshBadge();
    // Refresh badge whenever a new FCM notification arrives in foreground
    const sub = Notifications.addNotificationReceivedListener(() => refreshBadge());
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTitle: '',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.push('/')}
            activeOpacity={0.7}
            style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.primary }}>
              🩸 RVR BLOOD BANK
            </Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Nearby Requests',
          tabBarLabel: 'SOS Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'My Availability',
          tabBarLabel: 'Availability',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'SOS Alerts',
          tabBarLabel: 'Alerts',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.error,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="donation-history"
        options={{
          title: 'Donation History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Donor Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
