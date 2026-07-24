import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchRequests } from '../../store/slices/requestSlice';
import adminService from '../../services/admin.service';
import Colors from '../../constants/colors';
import ToastBanner from '../../components/ToastBanner';

export default function RequesterHomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;
  const { user } = useAppSelector((state) => state.auth);
  const { requests, isLoading } = useAppSelector((state) => state.requests);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    dispatch(fetchRequests({ limit: 5 }));
    loadPublicStats();
  }, [dispatch]);

  const loadPublicStats = async () => {
    try {
      const res = await adminService.getPublicStats();
      setStats(res.data);
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        <ToastBanner />
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.nameText}>{user?.fullName || 'Requester'}</Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(requester)/request-blood')}
        >
          <Text style={styles.ctaEmoji}>🚨</Text>
          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>Request Emergency Blood</Text>
            <Text style={styles.ctaSubtitle}>Submit verified request to find matching donors</Text>
          </View>
        </TouchableOpacity>

        {/* Public Stats */}
        <Text style={styles.sectionTitle}>Platform Impact</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats?.total_donors || '...'}</Text>
            <Text style={styles.statLabel}>Active Donors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats?.lives_saved || '...'}</Text>
            <Text style={styles.statLabel}>Lives Saved</Text>
          </View>
        </View>

        {/* Active Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Recent Requests</Text>
          <TouchableOpacity onPress={() => router.push('/(requester)/history')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : requests && requests.length > 0 ? (
          <View style={isTabletOrWeb ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : null}>
            {requests.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.requestCard, isTabletOrWeb && { width: '49%', marginBottom: 16 }]}
                onPress={() => router.push(`/(requester)/track-request/${item._id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <View style={[styles.badge, styles[`urgency_${item.urgency}`]]}>
                    <Text style={styles.badgeText}>{item.urgency.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.detailsText}>🩸 Needs: {item.bloodGroupNeeded} • {item.unitsNeeded} units</Text>
                <Text style={styles.detailsText}>🏥 {item.hospitalName}</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status: </Text>
                  <Text style={[styles.statusVal, { color: Colors.primary }]}>{item.status.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't made any requests yet.</Text>
          </View>
        )}
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
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  nameText: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  ctaButton: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  ctaEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
  },
  statNum: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  urgency_critical: { backgroundColor: Colors.critical },
  urgency_urgent: { backgroundColor: Colors.urgent },
  urgency_standard: { backgroundColor: Colors.standard },
  detailsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  statusLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  statusVal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});
