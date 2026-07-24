import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Linking,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotifications, fetchUnreadCount, markOneRead, markAllRead } from '../../store/slices/notificationSlice';
import notificationService from '../../services/notification.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

// ── Type metadata ──────────────────────────────────────────────────────────────
const TYPE_META = {
  blood_request: {
    icon: 'water',
    color: Colors.primary,
    label: 'Blood Request',
  },
  request_verified: {
    icon: 'checkmark-circle',
    color: Colors.success,
    label: 'Verified',
  },
  request_rejected: {
    icon: 'close-circle',
    color: Colors.error,
    label: 'Rejected',
  },
  donor_accepted: {
    icon: 'heart',
    color: Colors.info,
    label: 'Donor Found',
  },
  general: {
    icon: 'notifications',
    color: Colors.textMuted,
    label: 'Update',
  },
};

// ── Urgency colour map ─────────────────────────────────────────────────────────
const URGENCY_COLOR = {
  critical: '#D32F2F',
  high: '#F57C00',
  medium: '#1976D2',
  low: '#388E3C',
};

// ── Relative time helper ───────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Patient details sub-card ───────────────────────────────────────────────────
function PatientDetailsPanel({ details, type }) {
  if (!details) return null;

  const urgencyKey = (details.urgency || '').toLowerCase();
  const urgencyColor = URGENCY_COLOR[urgencyKey] || Colors.textMuted;
  const isRejected = type === 'request_rejected';

  const handleCall = () => {
    if (details.contactPhone) {
      Linking.openURL(`tel:${details.contactPhone}`);
    }
  };

  return (
    <View style={[styles.detailsPanel, isRejected && styles.detailsPanelRejected]}>
      {/* Panel title */}
      <View style={styles.detailsHeader}>
        <Ionicons
          name={isRejected ? 'document-text-outline' : 'document-text'}
          size={13}
          color={isRejected ? Colors.error : Colors.primary}
        />
        <Text style={[styles.detailsHeaderText, isRejected && { color: Colors.error }]}>
          {isRejected ? 'Request Details' : 'Patient Details'}
        </Text>
      </View>

      {/* Blood group + urgency row */}
      <View style={styles.detailsBadgeRow}>
        <View style={styles.bloodGroupBadge}>
          <Ionicons name="water" size={11} color="#fff" />
          <Text style={styles.bloodGroupText}>{details.bloodGroup || '—'}</Text>
        </View>
        {details.urgency && (
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '18', borderColor: urgencyColor + '40' }]}>
            <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>
              {details.urgency.charAt(0).toUpperCase() + details.urgency.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Patient name */}
      {details.patientName && (
        <View style={styles.detailsRow}>
          <Ionicons name="person-outline" size={13} color={Colors.textMuted} style={styles.detailsIcon} />
          <View style={styles.detailsTextGroup}>
            <Text style={styles.detailsLabel}>Patient</Text>
            <Text style={styles.detailsValue}>{details.patientName}</Text>
          </View>
        </View>
      )}

      {/* Hospital */}
      {details.hospitalName && (
        <View style={styles.detailsRow}>
          <Ionicons name="business-outline" size={13} color={Colors.textMuted} style={styles.detailsIcon} />
          <View style={styles.detailsTextGroup}>
            <Text style={styles.detailsLabel}>Hospital</Text>
            <Text style={styles.detailsValue}>
              {details.hospitalName}
              {details.hospitalCity ? `, ${details.hospitalCity}` : ''}
              {details.hospitalState ? `, ${details.hospitalState}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Address */}
      {details.hospitalAddress && (
        <View style={styles.detailsRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} style={styles.detailsIcon} />
          <View style={styles.detailsTextGroup}>
            <Text style={styles.detailsLabel}>Address</Text>
            <Text style={styles.detailsValue}>
              {details.hospitalAddress}
              {details.hospitalPincode ? ` – ${details.hospitalPincode}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Contact */}
      {details.contactName && (
        <TouchableOpacity style={[styles.detailsRow, styles.detailsRowTappable]} onPress={handleCall} activeOpacity={0.7}>
          <Ionicons name="call-outline" size={13} color={Colors.primary} style={styles.detailsIcon} />
          <View style={styles.detailsTextGroup}>
            <Text style={styles.detailsLabel}>Contact</Text>
            <Text style={[styles.detailsValue, styles.detailsValueLink]}>
              {details.contactName}
              {details.contactPhone ? `  ·  ${details.contactPhone}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={12} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Additional notes */}
      {details.additionalNotes && (
        <View style={[styles.detailsRow, styles.detailsNotesRow]}>
          <Ionicons name="reader-outline" size={13} color={Colors.textMuted} style={styles.detailsIcon} />
          <View style={styles.detailsTextGroup}>
            <Text style={styles.detailsLabel}>Notes</Text>
            <Text style={styles.detailsValue}>{details.additionalNotes}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Individual notification card ───────────────────────────────────────────────
function NotificationCard({ item, onMarkRead, onPress }) {
  const meta = TYPE_META[item.type] || TYPE_META.general;
  const hasDetails = !!item.bloodRequestDetails;

  // Cards with details start expanded for verified; collapsed for rejected/others
  const [expanded, setExpanded] = useState(item.type === 'request_verified' && hasDetails);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => onPress(item)}
    >
      {/* Left accent strip */}
      {!item.isRead && <View style={[styles.accentStrip, { backgroundColor: meta.color }]} />}

      <View style={styles.cardInner}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.typeBadge, { backgroundColor: meta.color + '18' }]}>
              <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={styles.timeText}>{relativeTime(item.createdAt)}</Text>
          </View>

          <Text style={[styles.message, !item.isRead && styles.messageUnread]} numberOfLines={expanded ? undefined : 3}>
            {item.message}
          </Text>

          {/* ── Patient details panel ── */}
          {hasDetails && (
            <>
              <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => setExpanded((v) => !v)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={expanded ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                  size={14}
                  color={meta.color}
                />
                <Text style={[styles.expandBtnText, { color: meta.color }]}>
                  {expanded ? 'Hide details' : 'View patient details'}
                </Text>
              </TouchableOpacity>

              {expanded && (
                <PatientDetailsPanel details={item.bloodRequestDetails} type={item.type} />
              )}
            </>
          )}

          {!item.isRead && (
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={() => onMarkRead(item._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark-done" size={14} color={Colors.textMuted} />
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread dot */}
        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // ── Subscribe to Redux store so foreground FCM dispatches auto-update UI ──
  const { notifications, isLoading } = useAppSelector((state) => state.notifications);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (showSpinner = true) => {
    try {
      await dispatch(fetchNotifications()).unwrap();
    } catch (err) {
      Alert.alert('Error', 'Failed to load notifications. Pull down to try again.');
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Refresh every time the tab comes into focus (like WhatsApp)
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkRead = async (id) => {
    try {
      // Optimistic local update for instant visual feedback
      dispatch(markOneRead(id));
      await notificationService.markAsRead(id);
    } catch (_) {
      // Revert by re-fetching if the server call fails
      dispatch(fetchNotifications());
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      // Optimistic local update
      dispatch(markAllRead());
      await notificationService.markAllAsRead();
    } catch (_) {
      Alert.alert('Error', 'Could not mark all as read.');
      dispatch(fetchNotifications());
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = (item) => {
    // Mark as read
    if (!item.isRead) handleMarkRead(item._id);
    // Navigate based on notification type
    if (item.type === 'request_verified' || item.type === 'donor_accepted') {
      // Go to request tracking screen if we have a requestId
      if (item.requestId) {
        router.push(`/(requester)/track-request/${item.requestId}`);
      }
    } else if (item.type === 'request_rejected') {
      // Rejected — nothing to track, stay on notifications so user can read the reason
      // (no navigation needed; card is already open)
    }
    // blood_request / general — no specific navigation
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Header right: Mark All Read ──────────────────────────────────────────────
  const renderHeader = () =>
    unreadCount > 0 ? (
      <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} disabled={markingAll}>
        {markingAll ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <>
            <Ionicons name="checkmark-done-outline" size={16} color={Colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </>
        )}
      </TouchableOpacity>
    ) : null;

  const renderItem = ({ item }) => (
    <NotificationCard item={item} onMarkRead={handleMarkRead} onPress={handlePress} />
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      {notifications.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </Text>
          {renderHeader()}
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? styles.emptyFlex : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see updates here when your blood request is verified, rejected, or when a
              donor accepts to help.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // ── Summary bar ──────────────────────────────────────────────────────────────
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  list: {
    padding: 12,
    paddingBottom: 32,
  },
  emptyFlex: {
    flex: 1,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#FFFBF7',
    borderColor: Colors.primaryLight,
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  messageUnread: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },

  // ── Expand toggle ────────────────────────────────────────────────────────────
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Patient details panel ────────────────────────────────────────────────────
  detailsPanel: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    gap: 8,
  },
  detailsPanelRejected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  detailsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  bloodGroupText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailsRowTappable: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  detailsNotesRow: {
    marginTop: 2,
  },
  detailsIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  detailsTextGroup: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  detailsValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 18,
  },
  detailsValueLink: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ── Mark read button ─────────────────────────────────────────────────────────
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  markReadText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
