import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import Colors from '../../constants/colors';

export default function AdminLayout() {
  const router = useRouter();

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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pending-requests"
        options={{
          title: 'Pending Verify',
          tabBarLabel: 'Verify',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="donor-management"
        options={{
          title: 'Donors',
          tabBarLabel: 'Donors',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'System Reports',
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" color={color} size={size} />
          ),
        }}
      />
      {/* Hide approved and rejected tabs from navigation tab bar */}
      <Tabs.Screen
        name="approved-requests"
        options={{
          href: null,
          title: 'Approved Requests',
        }}
      />
      <Tabs.Screen
        name="rejected-requests"
        options={{
          href: null,
          title: 'Rejected Requests',
        }}
      />
    </Tabs>
  );
}
