import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerUser } from '../../store/slices/authSlice';
import Colors from '../../constants/colors';
import ToastBanner from '../../components/ToastBanner';
import { BLOOD_GROUPS } from '../../constants/bloodGroups';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../utils/alert';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [wantTo, setWantTo] = useState('request'); // 'request' or 'donor'
  
  // Blood group custom picker state
  const [showPicker, setShowPicker] = useState(false);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      // ✅ Clear all form fields before navigating away
      setFullName('');
      setEmail('');
      setPhone('');
      setBloodGroup('');
      setPassword('');
      setConfirmPassword('');
      setWantTo('request');
      setShowPicker(false);
      setShowPassword(false);

      if (user.role === 'donor') {
        router.replace('/(donor)/home');
      } else {
        router.replace('/(requester)/home');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleRegister = () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    dispatch(
      registerUser({
        fullName,
        email,
        phone,
        bloodGroup: bloodGroup || null,
        password,
        role: wantTo === 'donor' ? 'donor' : 'requester',
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.contentWrapper}>
          <ToastBanner />
          
          {/* Top Drop Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBg}>
              <Ionicons name="water" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join RVR Blood Bank and start saving lives</Text>
          </View>

          <View style={styles.form}>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Full Name */}
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Phone Number */}
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Blood Group */}
          <Text style={styles.label}>
            Blood Group <Text style={styles.optional}>(optional — helps notify you for matching requests)</Text>
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPicker(!showPicker)}>
            <View style={styles.pickerLeft}>
              <Ionicons name="water-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.pickerText, !bloodGroup && styles.pickerPlaceholder]}>
                {bloodGroup ? `Group: ${bloodGroup}` : 'Select blood group (optional)'}
              </Text>
            </View>
            <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Expanded Blood Group Selection list */}
          {showPicker && (
            <View style={styles.pickerDropdown}>
              {BLOOD_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.pickerItem,
                    bloodGroup === group && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setBloodGroup(group);
                    setShowPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, bloodGroup === group && styles.pickerItemTextActive]}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setBloodGroup('');
                  setShowPicker(false);
                }}
              >
                <Text style={styles.pickerItemTextCancel}>Clear selection</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Password & Confirm Password Row */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 characters"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>
          </View>

          {/* I Want To (Role Selection) */}
          <Text style={styles.label}>
            I want to <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                wantTo === 'request' ? styles.roleCardActiveRequest : styles.roleCardInactive,
              ]}
              onPress={() => setWantTo('request')}
            >
              <Ionicons
                name="water"
                size={22}
                color={wantTo === 'request' ? Colors.error : Colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.roleCardText,
                  wantTo === 'request' ? styles.roleTextActiveRequest : styles.roleTextInactive,
                ]}
              >
                Request Blood
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                wantTo === 'donor' ? styles.roleCardActiveDonor : styles.roleCardInactive,
              ]}
              onPress={() => setWantTo('donor')}
            >
              <Ionicons
                name="person"
                size={22}
                color={wantTo === 'donor' ? Colors.primary : Colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.roleCardText,
                  wantTo === 'donor' ? styles.roleTextActiveDonor : styles.roleTextInactive,
                ]}
              >
                Donate Blood
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Redirect to Sign In */}
          <View style={styles.redirectContainer}>
            <Text style={styles.redirectText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.redirectLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  logoIconBg: {
    backgroundColor: Colors.primary,
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  errorText: {
    color: Colors.error,
    backgroundColor: Colors.errorSoft,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    color: '#333333',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  required: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  optional: {
    color: '#868E96',
    fontWeight: 'normal',
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#CED4DA',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 18,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderColor: '#CED4DA',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 18,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  pickerDropdown: {
    backgroundColor: '#fff',
    borderColor: '#CED4DA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
    marginTop: -10,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(255, 111, 0, 0.08)',
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  pickerItemTextCancel: {
    color: Colors.error,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCol: {
    width: '48%',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  roleCardInactive: {
    backgroundColor: '#fff',
    borderColor: '#CED4DA',
  },
  roleCardActiveRequest: {
    backgroundColor: Colors.errorSoft,
    borderColor: Colors.error,
  },
  roleCardActiveDonor: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  roleCardText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleTextInactive: {
    color: Colors.textSecondary,
  },
  roleTextActiveRequest: {
    color: Colors.error,
  },
  roleTextActiveDonor: {
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  redirectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  redirectText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  redirectLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
