import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import adminService from '../../services/admin.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function DonorManagementScreen() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await adminService.getUsers({ role: 'donor' });
      setUsers(res.data.users || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load donors list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = !currentStatus;
    Alert.alert(
      'Toggle Account Status',
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} this user account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminService.updateUser(userId, { is_active: nextStatus });
              Alert.alert('Success', 'User status updated successfully.');
              setUsers((prev) =>
                prev.map((u) => (u._id === userId ? { ...u, isActive: nextStatus } : u))
              );
            } catch (err) {
              Alert.alert('Error', 'Failed to update user status.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'D'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Account Status:</Text>
        <Text style={[styles.statusVal, { color: item.isActive ? Colors.success : Colors.error }]}>
          {item.isActive ? 'ACTIVE' : 'DEACTIVATED'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, item.isActive ? styles.btnDeactivate : styles.btnActivate]}
        onPress={() => handleToggleStatus(item._id, item.isActive)}
      >
        <Text style={styles.actionBtnText}>
          {item.isActive ? 'Deactivate Account' : 'Activate Account'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : users.length > 0 ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={loadUsers}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No donors registered in the system yet.</Text>
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
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  userPhone: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 14,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  statusVal: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  actionBtn: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeactivate: {
    backgroundColor: Colors.errorSoft,
    borderColor: Colors.error,
    borderWidth: 1,
  },
  btnActivate: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success,
    borderWidth: 1,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
