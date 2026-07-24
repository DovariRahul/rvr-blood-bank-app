import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { setToastMessage } from '../../store/slices/authSlice';
import donorService from '../../services/donor.service';
import requestService from '../../services/request.service';
import Colors from '../../constants/colors';
import ToastBanner from '../../components/ToastBanner';
import Alert from '../../utils/alert';

export default function DonorHomeScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;
  const [profile, setProfile] = useState(null);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDonorData();
  }, []);

  const loadDonorData = async () => {
    try {
      const profileRes = await donorService.getMyProfile();
      setProfile(profileRes.data.donor);

      // Fetch active matching blood requests
      const requestsRes = await requestService.getRequests({ status: 'matching' });
      setNearbyRequests(requestsRes.data.requests || []);
    } catch (err) {
      console.warn('Failed to load donor profile:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (val) => {
    if (!profile) return;
    try {
      await donorService.toggleAvailability(profile._id || profile.id, val);
      setProfile((prev) => ({ ...prev, isAvailable: val }));
      dispatch(setToastMessage({
        message: val ? 'You are now marked as available!' : 'You are now marked as unavailable.',
        type: val ? 'success' : 'error'
      }));
    } catch (err) {
      dispatch(setToastMessage({
        message: 'Failed to toggle availability status.',
        type: 'error'
      }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        <ToastBanner />
        
        {/* Row for headers when on tablet/web */}
        <View style={isTabletOrWeb ? { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 } : null}>
          {/* Availability Header */}
          <View style={[styles.statusHeader, isTabletOrWeb && { width: '49%', marginBottom: 0 }]}>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Available for SOS Requests?</Text>
              <Text style={styles.statusSubtitle}>
                {profile?.isAvailable
                  ? 'Active: You will receive real-time push alerts'
                  : 'Inactive: You will not receive alerts'}
              </Text>
            </View>
            <Switch
              value={profile?.isAvailable || false}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#767577', true: Colors.primarySoft }}
              thumbColor={profile?.isAvailable ? Colors.primary : '#f4f3f4'}
            />
          </View>

          {/* Eligible Badge */}
          <View style={[styles.eligibilityCard, profile?.is_eligible ? styles.eligibleCard : styles.ineligibleCard, isTabletOrWeb && { width: '49%', marginBottom: 0 }]}>
            <Text style={styles.eligibilityEmoji}>{profile?.is_eligible ? '🎉' : '⏳'}</Text>
            <View style={styles.eligibilityText}>
              <Text style={styles.eligibilityTitle}>
                {profile?.is_eligible ? 'You are eligible to donate!' : 'Not Eligible Yet'}
              </Text>
              <Text style={styles.eligibilitySubtitle}>
                {profile?.is_eligible
                  ? 'Thank you for your willingness to save lives.'
                  : `Next eligible in: ${profile?.days_until_eligible || '...'} days`}
              </Text>
            </View>
          </View>
        </View>

        {/* Nearby Active SOS requests */}
        <Text style={styles.sectionTitle}>Nearby SOS Blood Requests</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : nearbyRequests.length > 0 ? (
          <View style={styles.requestsGrid}>
            {nearbyRequests.map((item) => (
              <View key={item._id} style={[styles.requestCard, isTabletOrWeb && { width: '49%', marginBottom: 16 }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <View style={[styles.badge, styles[`urgency_${item.urgency}`]]}>
                    <Text style={styles.badgeText}>{item.urgency.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.detailsText}>🩸 Group Needed: {item.bloodGroupNeeded} • {item.unitsNeeded} units</Text>
                <Text style={styles.detailsText}>🏥 {item.hospitalName}</Text>
                <Text style={styles.detailsText}>📍 {item.hospitalCity}, {item.hospitalState}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emergency requests currently active.</Text>
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
  requestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderColor: Colors.border,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  eligibilityCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
  },
  eligibleCard: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success,
  },
  ineligibleCard: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warning,
  },
  eligibilityEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  eligibilityText: {
    flex: 1,
  },
  eligibilityTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  eligibilitySubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});
