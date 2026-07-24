import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser, setUser } from '../../store/slices/authSlice';
import authService from '../../services/auth.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await dispatch(logoutUser());
          router.replace('/');
        },
      },
    ]);
  };

  const handleRegisterAsDonor = () => {
    router.push('/(donor)/availability');
  };

  const handleCancelEdit = () => {
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setBloodGroup(user?.bloodGroup || '');
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Full Name and Phone Number are required.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authService.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        bloodGroup: bloodGroup.trim().toUpperCase() || null,
      });

      dispatch(setUser(res.data.user));
      Alert.alert('Success', 'Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(isEditing ? fullName : user?.fullName)?.charAt(0) || 'U'}
          </Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full Name"
            placeholderTextColor={Colors.textMuted}
          />
        ) : (
          <Text style={styles.name}>{user?.fullName}</Text>
        )}
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.valueEmail}>{user?.email}</Text>

          <Text style={styles.label}>Phone Number</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91XXXXXXXXXX"
              placeholderTextColor={Colors.textMuted}
            />
          ) : (
            <Text style={styles.value}>{user?.phone}</Text>
          )}

          <Text style={styles.label}>Blood Group</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. O+"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
          ) : (
            <Text style={styles.value}>{user?.bloodGroup || 'Not Provided'}</Text>
          )}
        </View>
      </View>

      {/* Edit Actions */}
      {isEditing ? (
        <View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} disabled={isSaving}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Role Upgrade Action */}
          {user?.role === 'requester' && (
            <TouchableOpacity style={styles.donorUpgradeBtn} onPress={handleRegisterAsDonor}>
              <Text style={styles.upgradeBtnText}>❤️ Register as a Blood Donor</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  nameInput: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    borderBottomColor: Colors.primary,
    borderBottomWidth: 1.5,
    width: '80%',
    textAlign: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  role: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  valueEmail: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
    opacity: 0.8,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  donorUpgradeBtn: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  upgradeBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  editBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    borderColor: Colors.textMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutBtnText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
