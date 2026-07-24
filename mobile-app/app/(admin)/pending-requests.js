import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import adminService from '../../services/admin.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function PendingRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const res = await adminService.getPendingVerification();
      setRequests(res.data.requests || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load requests pending verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id, action) => {
    let reason = null;
    if (action === 'reject') {
      // In real production, open a text modal to collect reason. Here we use prompt or standard message.
      reason = 'Medical proof document not readable or invalid.';
    }

    Alert.alert(
      'Verify Request',
      `Are you sure you want to ${action} this blood request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminService.verifyRequest(id, action, reason);
              Alert.alert('Success', `Blood request ${action}ed successfully.`);
              setRequests((prev) => prev.filter((item) => item._id !== id));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Verification update failed.');
            }
          },
        },
      ]
    );
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
      <Text style={styles.details}>👤 Requested by: {item.requesterId?.fullName || 'User'}</Text>
      
      {item.medicalProofUrl ? (
        <View style={styles.proofContainer}>
          <Text style={styles.proofLabel}>Prescription Doc:</Text>
          <Text style={styles.proofUrl} numberOfLines={1}>{item.medicalProofUrl}</Text>
        </View>
      ) : (
        <Text style={styles.noProof}>⚠️ No medical proof attached!</Text>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleVerify(item._id, 'reject')}>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleVerify(item._id, 'approve')}>
          <Text style={styles.approveText}>Verify & Approve</Text>
        </TouchableOpacity>
      </View>
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
          onRefresh={loadPendingRequests}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No blood requests currently pending verification.</Text>
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
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: Colors.primary,
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
  proofContainer: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
  },
  proofLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  proofUrl: {
    color: Colors.info,
    fontSize: 12,
    flex: 1,
  },
  noProof: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  rejectBtn: {
    width: '46%',
    padding: 12,
    borderRadius: 8,
    borderColor: Colors.error,
    borderWidth: 1,
    alignItems: 'center',
  },
  rejectText: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  approveBtn: {
    width: '46%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  approveText: {
    color: '#fff',
    fontWeight: 'bold',
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
