import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../../store/hooks';
import { setToastMessage } from '../../store/slices/authSlice';
import requestService from '../../services/request.service';
import Colors from '../../constants/colors';
import { URGENCY_LEVELS } from '../../constants/bloodGroups';
import Alert from '../../utils/alert';

export default function RequestBloodScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [units, setUnits] = useState('1');
  const [urgency, setUrgency] = useState('standard');
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [medicalProof, setMedicalProof] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Reset all fields to defaults ───────────────────────────────────────────
  const resetForm = useCallback(() => {
    setPatientName('');
    setBloodGroup('A+');
    setUnits('1');
    setUrgency('standard');
    setHospitalName('');
    setAddress('');
    setCity('');
    setState('Andhra Pradesh');
    setPincode('');
    setContactName('');
    setContactPhone('');
    setNotes('');
    setMedicalProof(null);
  }, []);

  // ✅ Auto-clear form EVERY TIME this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  // ─── Image picker ────────────────────────────────────────────────────────────
  const selectMedicalProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'We need access to your photos to upload medical proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedicalProof(result.assets[0].uri);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!patientName || !hospitalName || !address || !city || !pincode || !contactName || !contactPhone) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    // Capture patient name BEFORE reset clears it (for toast message)
    const submittedPatientName = patientName;

    try {
      const payload = {
        patient_name: patientName,
        blood_group_needed: bloodGroup,
        units_needed: parseInt(units, 10),
        urgency,
        hospital_name: hospitalName,
        hospital_address: address,
        hospital_city: city,
        hospital_state: state,
        hospital_pincode: pincode,
        contact_name: contactName,
        contact_phone: contactPhone,
        additional_notes: notes,
        medical_proof_url: medicalProof || null,
      };

      await requestService.createRequest(payload);

      // ✅ 1. Clear form immediately after DB save
      resetForm();

      // ✅ 2. Show green success toast
      dispatch(setToastMessage(`Blood request for "${submittedPatientName}" submitted!`));

      // ✅ 3. Navigate — replace so the form screen fully unmounts
      router.replace('/(requester)/home');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit blood request.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>Emergency Blood Request Form</Text>

      <Text style={styles.label}>Patient Name *</Text>
      <TextInput
        style={styles.input}
        value={patientName}
        onChangeText={setPatientName}
        placeholder="Full name of patient"
        placeholderTextColor={Colors.textMuted}
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Blood Group Needed</Text>
          <TextInput
            style={styles.input}
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g. A+"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Units Needed *</Text>
          <TextInput
            style={styles.input}
            value={units}
            onChangeText={setUnits}
            keyboardType="number-pad"
            placeholder="e.g. 2"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <Text style={styles.label}>Urgency Level</Text>
      <View style={styles.urgencyContainer}>
        {URGENCY_LEVELS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.urgencyItem, urgency === item.value && { backgroundColor: item.color }]}
            onPress={() => setUrgency(item.value)}
          >
            <Text style={[styles.urgencyText, { color: urgency === item.value ? '#fff' : Colors.textPrimary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Hospital Name *</Text>
      <TextInput
        style={styles.input}
        value={hospitalName}
        onChangeText={setHospitalName}
        placeholder="Hospital name"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={styles.label}>Hospital Address *</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Full hospital address"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={styles.label}>State *</Text>
      <TextInput
        style={styles.input}
        value={state}
        onChangeText={setState}
        placeholder="e.g. Andhra Pradesh"
        placeholderTextColor={Colors.textMuted}
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Vizag"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Pincode *</Text>
          <TextInput
            style={styles.input}
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            placeholder="6-digit ZIP code"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <Text style={styles.label}>Contact Name *</Text>
      <TextInput
        style={styles.input}
        value={contactName}
        onChangeText={setContactName}
        placeholder="Contact person name"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={styles.label}>Contact Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        placeholder="10-digit phone number"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={styles.label}>Additional Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholder="Any specific requirements or instructions"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={styles.label}>Medical Proof (Doctor prescription/admit note)</Text>
      <TouchableOpacity style={styles.proofBtn} onPress={selectMedicalProof}>
        <Text style={styles.proofBtnText}>
          {medicalProof ? '✅ Proof Selected (Tap to change)' : '📁 Choose File / Upload Image'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Submit Request</Text>
        }
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
  formTitle: {
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
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  urgencyItem: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '31%',
    borderColor: Colors.border,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  proofBtn: {
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  proofBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
