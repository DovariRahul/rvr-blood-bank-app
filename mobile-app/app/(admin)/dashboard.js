import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import adminService from '../../services/admin.service';
import Colors from '../../constants/colors';
import ToastBanner from '../../components/ToastBanner';
import Alert from '../../utils/alert';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await adminService.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load system analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await dispatch(logoutUser());
          router.replace('/');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        <ToastBanner />
        <View style={styles.header}>
          <Text style={styles.title}>System Overview</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Grid */}
        <View style={styles.grid}>
          <View style={[styles.card, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
            <Text style={styles.cardVal}>{analytics?.total_requests || 0}</Text>
            <Text style={styles.cardLabel}>Total requests</Text>
          </View>
          <View style={[styles.card, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
            <Text style={styles.cardVal}>{analytics?.active_requests || 0}</Text>
            <Text style={styles.cardLabel}>Active Matching</Text>
          </View>
          <View style={[styles.card, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
            <Text style={styles.cardVal}>{analytics?.total_donors || 0}</Text>
            <Text style={styles.cardLabel}>Registered Donors</Text>
          </View>
          <View style={[styles.card, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
            <Text style={styles.cardVal}>{analytics?.available_donors || 0}</Text>
            <Text style={styles.cardLabel}>Available Now</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Verification Actions</Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/(admin)/pending-requests')}
        >
          <Text style={styles.actionText}>📋 Review Pending Medical Proofs</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Performance Analytics</Text>
        <View style={styles.performanceCard}>
          <Text style={styles.performanceLabel}>Match Success Rate</Text>
          <Text style={[styles.performanceVal, { color: Colors.success }]}>
            {analytics?.match_success_rate || 0}%
          </Text>
          <Text style={styles.performanceDesc}>
            Percentage of blood requests successfully matched and fulfilled.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  cardVal: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 28,
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  performanceCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  performanceLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  performanceVal: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  performanceDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
});
