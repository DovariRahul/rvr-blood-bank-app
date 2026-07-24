import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import adminService from '../../services/admin.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function ApprovedRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await adminService.getActiveRequests();
      // Filter out pending verification status
      const verified = (res.data.requests || []).filter((r) => r.status !== 'pending_verification');
      setRequests(verified);
    } catch (err) {
      Alert.alert('Error', 'Failed to load approved requests.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.patientName}>{item.patientName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.bloodGroupNeeded}</Text>
        </View>
      </View>
      <Text style={styles.details}>🏥 Hospital: {item.hospitalName}</Text>
      <Text style={styles.details}>📍 City: {item.hospitalCity}, {item.hospitalState}</Text>
      <Text style={styles.details}>Status: {item.status.toUpperCase()}</Text>
    </View>
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
          <Text style={styles.emptyText}>No verified active requests found.</Text>
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
    backgroundColor: Colors.success,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  details: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
