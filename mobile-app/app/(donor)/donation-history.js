import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import donorService from '../../services/donor.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function DonationHistoryScreen() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await donorService.getMyProfile();
      setHistory(res.data.response_history || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.hospitalName}>{item.hospital_name}</Text>
        <View style={[styles.badge, item.response === 'accepted' ? styles.accepted : styles.declined]}>
          <Text style={styles.badgeText}>{item.response.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.detail}>🩸 Blood Group: {item.blood_group_needed}</Text>
      <Text style={styles.detail}>📍 City: {item.hospital_city}</Text>
      <Text style={styles.timeText}>Responded: {new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : history.length > 0 ? (
        <FlatList
          data={history}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={loadHistory}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No donation response history found.</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hospitalName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
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
  accepted: { backgroundColor: Colors.success },
  declined: { backgroundColor: Colors.error },
  detail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  timeText: {
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
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
