import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../store/hooks';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import donorService from '../../services/donor.service';
import Colors from '../../constants/colors';
import { BLOOD_GROUPS, GENDER_OPTIONS, INDIAN_STATES } from '../../constants/bloodGroups';
import Alert from '../../utils/alert';

export default function AvailabilityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [profileExists, setProfileExists] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [gender, setGender] = useState('male');
  const [weight, setWeight] = useState('');
  const [dob, setDob] = useState('');
  const [lastDonation, setLastDonation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [conditions, setConditions] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await donorService.getMyProfile();
      const p = res.data.donor;
      if (p) {
        setProfileExists(true);
        setProfileId(p._id || p.id);
        setBloodGroup(p.bloodGroup);
        setGender(p.gender);
        setWeight(p.weightKg?.toString() || '');
        setDob(p.dateOfBirth?.split('T')[0] || '');
        setLastDonation(p.lastDonationDate?.split('T')[0] || '');
        setAddress(p.address?.line || '');
        setCity(p.address?.city || '');
        setState(p.address?.state || 'Andhra Pradesh');
        setPincode(p.address?.pincode || '');
        setConditions(p.medicalConditions || '');
      }
    } catch (err) {
      console.log('No profile exists yet.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBloodGroup('A+');
    setGender('male');
    setWeight('');
    setDob('');
    setLastDonation('');
    setAddress('');
    setCity('');
    setState('Andhra Pradesh');
    setPincode('');
    setConditions('');
  };

  const handleSave = async () => {
    if (!dob || !weight || !address || !city || !pincode) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    const payload = {
      date_of_birth: dob,
      gender,
      blood_group: bloodGroup,
      weight_kg: parseFloat(weight),
      last_donation_date: lastDonation || null,
      address_line: address,
      city,
      state,
      pincode,
      medical_conditions: conditions || null,
    };

    try {
      if (profileExists) {
        await donorService.updateProfile(profileId, payload);
        // ✅ 1. Clear fields first
        resetForm();
        // ✅ 2. Show success message
        Alert.alert('Success', 'Profile updated successfully.', [
          { text: 'OK', onPress: () => router.replace('/(donor)/home') },
        ]);
      } else {
        await donorService.registerDonor(payload);
        // Refresh auth state so role becomes 'donor' in Redux
        await dispatch(fetchCurrentUser());
        // ✅ 1. Clear fields first
        resetForm();
        // ✅ 2. Show success then navigate
        Alert.alert('Success', 'You are now registered as an active donor!', [
          { text: 'OK', onPress: () => router.replace('/(donor)/home') },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{profileExists ? 'Update Donor Profile' : 'Register as Donor'}</Text>

      <Text style={styles.label}>Blood Group</Text>
      <View style={styles.groupContainer}>
        {BLOOD_GROUPS.map((group) => (
          <TouchableOpacity
            key={group}
            style={[styles.groupItem, bloodGroup === group && styles.groupItemActive]}
            onPress={() => setBloodGroup(group)}
          >
            <Text style={[styles.groupText, bloodGroup === group && styles.groupTextActive]}>{group}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
      <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="e.g. 1995-08-12" placeholderTextColor={Colors.textMuted} />

      <Text style={styles.label}>Weight (kg) *</Text>
      <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="Must be at least 50 kg" placeholderTextColor={Colors.textMuted} />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.genderItem, gender === g.value && styles.genderItemActive]}
            onPress={() => setGender(g.value)}
          >
            <Text style={[styles.genderText, gender === g.value && styles.genderTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Last Donation Date (Optional)</Text>
      <TextInput style={styles.input} value={lastDonation} onChangeText={setLastDonation} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />

      <Text style={styles.label}>Address Line *</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street/building info" placeholderTextColor={Colors.textMuted} />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.label}>City *</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City name" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Pincode *</Text>
          <TextInput style={styles.input} value={pincode} onChangeText={setPincode} keyboardType="number-pad" placeholder="6-digit ZIP code" placeholderTextColor={Colors.textMuted} />
        </View>
      </View>

      <Text style={styles.label}>Medical Conditions (Optional)</Text>
      <TextInput style={styles.input} value={conditions} onChangeText={setConditions} placeholder="List any allergies or medical conditions" placeholderTextColor={Colors.textMuted} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
        <Text style={styles.saveBtnText}>{profileExists ? 'Update Profile' : 'Register Now'}</Text>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  groupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  groupItem: {
    width: '22%',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  groupItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groupText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  groupTextActive: {
    color: '#fff',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderItem: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  genderTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
