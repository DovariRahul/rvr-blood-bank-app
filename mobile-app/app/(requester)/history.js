import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import requestService from '../../services/request.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function HistoryScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await requestService.getRequests();
      setRequests(res.data.requests);
    } catch (err) {
      Alert.alert('Error', 'Failed to load request history.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(requester)/track-request/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.patientName}>{item.patientName}</Text>
        <View style={[styles.badge, styles[`status_${item.status}`]]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.detailsText}>🩸 Group Needed: {item.bloodGroupNeeded} • {item.unitsNeeded} Units</Text>
      <Text style={styles.detailsText}>🏥 {item.hospitalName}</Text>
      <Text style={styles.dateText}>Requested on: {new Date(item.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : requests.length > 0 ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={loadRequests}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No blood requests found.</Text>
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
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  card: {
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
  status_pending: { backgroundColor: Colors.warning },
  status_pending_verification: { backgroundColor: Colors.warning },
  status_matching: { backgroundColor: Colors.info },
  status_matched: { backgroundColor: Colors.success },
  status_fulfilled: { backgroundColor: Colors.success },
  status_cancelled: { backgroundColor: Colors.textMuted },
  status_expired: { backgroundColor: Colors.error },
  detailsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
