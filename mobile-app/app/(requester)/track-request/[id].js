import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import requestService from '../../../services/request.service';
import Colors from '../../../constants/colors';
import Alert from '../../../utils/alert';

export default function TrackRequestScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      const res = await requestService.getRequest(id);
      setRequest(res.data.request);
    } catch (err) {
      Alert.alert('Error', 'Failed to load request details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this blood request? This cannot be undone.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await requestService.cancelRequest(id);
              Alert.alert('Cancelled', 'Your blood request has been cancelled.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(requester)/history'),
                },
              ]);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel request.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to permanently delete this blood request? This will remove it from history and notify matching users. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await requestService.deleteRequest(id);
              Alert.alert('Deleted', 'Your blood request has been deleted.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(requester)/history'),
                },
              ]);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete request.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };


  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Request not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <Text style={[styles.statusValue, { color: Colors.primary }]}>
          {request.status.toUpperCase()}
        </Text>
        <Text style={styles.notifiedText}>
          Donors Notified: {request.donorsNotified || 0} • Accepted: {request.donorsAccepted || 0}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Patient Info</Text>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Patient Name</Text>
        <Text style={styles.value}>{request.patientName}</Text>

        <Text style={styles.label}>Blood Group Needed</Text>
        <Text style={styles.value}>{request.bloodGroupNeeded}</Text>

        <Text style={styles.label}>Units Needed</Text>
        <Text style={styles.value}>{request.unitsNeeded} Units</Text>

        <Text style={styles.label}>Urgency</Text>
        <Text style={styles.value}>{request.urgency.toUpperCase()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Hospital details</Text>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Hospital</Text>
        <Text style={styles.value}>{request.hospitalName}</Text>

        <Text style={styles.label}>Address</Text>
        <Text style={styles.value}>{request.hospitalAddress}</Text>

        <Text style={styles.label}>City</Text>
        <Text style={styles.value}>{request.hospitalCity}</Text>
      </View>

      {/* Accepted Donors List (Masked for Privacy) */}
      <Text style={styles.sectionTitle}>Accepted Donors</Text>
      {request.accepted_donors && request.accepted_donors.length > 0 ? (
        request.accepted_donors.map((donor, idx) => (
          <View key={idx} style={styles.donorRow}>
            <Text style={styles.donorEmoji}>🩸</Text>
            <View style={styles.donorInfo}>
              <Text style={styles.donorName}>{donor.first_name} (Group: {donor.blood_group})</Text>
              <Text style={styles.acceptTime}>Accepted: {new Date(donor.accepted_at).toLocaleTimeString()}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyDonorCard}>
          <Text style={styles.emptyDonorText}>Waiting for donors to accept...</Text>
        </View>
      )}

      {/* Actions */}
      {['pending', 'matching', 'matched', 'pending_verification'].includes(request.status) && (
        <TouchableOpacity 
          style={[styles.cancelBtn, isCancelling && { opacity: 0.6 }]} 
          onPress={handleCancel}
          disabled={isCancelling || isDeleting}
        >
          {isCancelling ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.deleteBtn, isDeleting && { opacity: 0.6 }]} 
        onPress={handleDelete}
        disabled={isCancelling || isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator color={Colors.error} />
        ) : (
          <Text style={styles.deleteBtnText}>Delete Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  notifiedText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderColor: Colors.border,
    borderWidth: 1,
    marginBottom: 20,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 14,
  },
  donorRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  donorEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptTime: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyDonorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
    marginBottom: 30,
  },
  emptyDonorText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  cancelBtn: {
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: Colors.error,
  },
});
