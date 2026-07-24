import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser, setToastMessage, setUser } from '../../store/slices/authSlice';
import donorService from '../../services/donor.service';
import authService from '../../services/auth.service';
import Colors from '../../constants/colors';
import Alert from '../../utils/alert';

export default function DonorProfileScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [weight, setWeight] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await donorService.getMyProfile();
      setProfile(res.data.donor);
    } catch (err) {
      console.warn('Failed to load profile:', err.message);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || user?.fullName || '');
      setPhone(profile.phone || user?.phone || '');
      setWeight(profile.weightKg?.toString() || '');
      setAddressLine(profile.address?.line || '');
      setCity(profile.address?.city || '');
      setState(profile.address?.state || '');
      setPincode(profile.address?.pincode || '');
    }
  }, [profile]);

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

  const handleCancelEdit = () => {
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    if (profile) {
      setWeight(profile.weightKg?.toString() || '');
      setAddressLine(profile.address?.line || '');
      setCity(profile.address?.city || '');
      setState(profile.address?.state || '');
      setPincode(profile.address?.pincode || '');
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    const missingFields = [];
    if (!fullName.trim()) missingFields.push('Full Name');
    if (!phone.trim()) missingFields.push('Phone Number');
    if (!weight.trim()) missingFields.push('Weight');
    if (!addressLine.trim()) missingFields.push('Address Line');
    if (!city.trim()) missingFields.push('City');
    if (!state.trim()) missingFields.push('State');
    if (!pincode.trim()) missingFields.push('Pincode');

    if (missingFields.length > 0) {
      Alert.alert('Error', `Please fill in all required fields:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update standard User properties
      const userRes = await authService.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      dispatch(setUser(userRes.data.user));

      // 2. Update Donor properties
      if (profile && profile._id) {
        const donorRes = await donorService.updateProfile(profile._id, {
          weight_kg: parseFloat(weight),
          address_line: addressLine.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        });
        setProfile(donorRes.data.donor);
      }

      Alert.alert('Success', 'Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Donor Account',
      'This will remove your donor status and revert your account to a requester account. Enter your password to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            if (!password) {
              Alert.alert('Error', 'Password is required to delete donor account.');
              return;
            }
            try {
               await donorService.deleteAccount(password);
               dispatch(setToastMessage({ message: `Donor account deleted successfully.`, type: 'error' }));
               await dispatch(logoutUser());
               router.replace('/');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Verification failed.');
            }
          },
        },
      ]
    );
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
        <Text style={styles.role}>DONOR Profile (Group: {profile?.bloodGroup || '...'})</Text>
      </View>

      {/* Account Details */}
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
        </View>
      </View>

      {/* Physical parameters or setup warning */}
      {!profile ? (
        <View style={styles.incompleteCard}>
          <Text style={styles.incompleteEmoji}>⚠️</Text>
          <Text style={styles.incompleteTitle}>Donor Profile Setup Incomplete</Text>
          <Text style={styles.incompleteText}>
            You have not registered your physical donor parameters yet (weight, blood group details, gender, and address). Complete your setup to be active for SOS blood matching.
          </Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(donor)/availability')}
          >
            <Text style={styles.registerBtnText}>Complete Profile Setup</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Parameters</Text>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Weight (kg)</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="e.g. 70"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.value}>{profile?.weightKg} kg</Text>
            )}

            <Text style={styles.label}>Gender</Text>
            <Text style={styles.valueEmail}>{profile?.gender?.toUpperCase()}</Text>

            <Text style={styles.label}>Address Line</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Street Address"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.value}>{profile?.address?.line}</Text>
            )}

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>City</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={Colors.textMuted}
                  />
                ) : (
                  <Text style={styles.value}>{profile?.address?.city}</Text>
                )}
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Pincode</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="numeric"
                    placeholder="ZIP"
                    placeholderTextColor={Colors.textMuted}
                  />
                ) : (
                  <Text style={styles.value}>{profile?.address?.pincode}</Text>
                )}
              </View>
            </View>

            <Text style={styles.label}>State</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.value}>{profile?.address?.state}</Text>
            )}
          </View>
        </View>
      )}

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
          {profile && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          {/* Danger Zone */}
          {profile && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
              <View style={[styles.infoCard, { borderColor: Colors.error }]}>
                <Text style={styles.label}>Enter Password to Delete Donor Profile</Text>
                <TextInput
                  style={styles.editInput}
                  secureTextEntry
                  placeholder="Confirm password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
                  <Text style={styles.deleteBtnText}>Delete Donor Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  deleteBtn: {
    backgroundColor: Colors.errorSoft,
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.error,
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
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  incompleteCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  incompleteEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  incompleteTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  incompleteText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
