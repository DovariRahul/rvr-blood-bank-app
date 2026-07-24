import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotifications, fetchUnreadCount, markOneRead } from '../../store/slices/notificationSlice';
import { setToastMessage } from '../../store/slices/authSlice';
import notificationService from '../../services/notification.service';
import donorService from '../../services/donor.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

const URGENCY_COLOR = {
  critical: Colors.error,
  urgent: Colors.primary,
  standard: Colors.success,
};

export default function DonorNotificationsScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  // ── Subscribe to Redux store so foreground FCM dispatches auto-update UI ──
  const { notifications: allNotifications, isLoading } = useAppSelector(
    (state) => state.notifications
  );
  // Donors only see blood_request notifications
  const notifications = (allNotifications || []).filter((n) => n.type === 'blood_request');

  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      await dispatch(fetchNotifications()).unwrap();
    } catch (err) {
      Alert.alert('Error', 'Failed to load notifications.');
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      dispatch(markOneRead(id));
      await notificationService.markAsRead(id);
    } catch (_) {
      dispatch(fetchNotifications());
    }
  };

  const handleRespond = async (requestId, notifId, response) => {
    if (respondingId) return;
    try {
      setRespondingId(requestId);
      await donorService.respondToRequest(requestId, response);
      // Mark the in-app notification as read after responding
      await notificationService.markAsRead(notifId);

      if (response === 'accepted') {
        dispatch(setToastMessage('Thank you! You have accepted the blood request.'));
        router.push('/(donor)/home');
      } else {
        dispatch(setToastMessage('Blood request declined.'));
        // Re-fetch from Redux to remove the declined notification from the list
        dispatch(fetchNotifications());
        dispatch(fetchUnreadCount());
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to respond to request.');
    } finally {
      setRespondingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const details = item.bloodRequestDetails || {};
    const urgencyColor = URGENCY_COLOR[details.urgency] || Colors.primary;
    const hasRequestId = !!item.requestId;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.card,
          { borderLeftColor: urgencyColor },
          !item.isRead && styles.cardUnread,
        ]}
        onPress={() => !item.isRead && handleMarkRead(item._id)}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
              <Text style={styles.urgencyText}>
                {details.urgency ? details.urgency.toUpperCase() : 'REQUEST'}
              </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <View style={[styles.bloodGroupBadge]}>
            <Text style={styles.bloodGroupText}>{details.bloodGroup || '?'}</Text>
          </View>
        </View>

        {/* Patient & Hospital */}
        {details.patientName ? (
          <Text style={styles.patientName}>Patient: {details.patientName}</Text>
        ) : null}

        {details.hospitalName ? (
          <>
            <Text style={styles.sectionTitle}>🏥 Hospital</Text>
            <Text style={styles.detailText}>{details.hospitalName}</Text>
            {details.hospitalAddress ? (
              <Text style={styles.detailText}>{details.hospitalAddress}</Text>
            ) : null}
            {details.hospitalCity ? (
              <Text style={styles.detailText}>
                {details.hospitalCity}
                {details.hospitalState ? `, ${details.hospitalState}` : ''}
                {details.hospitalPincode ? ` - ${details.hospitalPincode}` : ''}
              </Text>
            ) : null}
          </>
        ) : null}

        {details.contactName || details.contactPhone ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>📞 Contact</Text>
            {details.contactName ? (
              <Text style={styles.detailText}>{details.contactName}</Text>
            ) : null}
            {details.contactPhone ? (
              <Text style={styles.detailText}>{details.contactPhone}</Text>
            ) : null}
          </>
        ) : null}

        {details.additionalNotes ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>📝 Notes</Text>
            <Text style={styles.notesText}>"{details.additionalNotes}"</Text>
          </>
        ) : null}

        {/* Timestamp */}
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>

        {/* Action Buttons — only if we have a request ID to respond to */}
        {hasRequestId && !item.isRead ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleRespond(item.requestId, item._id, 'declined')}
              disabled={!!respondingId}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: urgencyColor }]}
              onPress={() => handleRespond(item.requestId, item._id, 'accepted')}
              disabled={!!respondingId}
            >
              {respondingId === item.requestId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptText}>Accept & Help 🩸</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : item.isRead ? (
          <Text style={styles.respondedText}>✓ Responded</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🩸</Text>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySubtitle}>
            You will receive alerts here when someone with a matching blood group needs your help.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    marginTop: 60,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardUnread: {
    backgroundColor: Colors.primarySoft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginLeft: 4,
  },
  bloodGroupBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bloodGroupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  patientName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 3,
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 4,
    marginBottom: 2,
  },
  notesText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  timeText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderColor: Colors.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  acceptBtn: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  respondedText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
