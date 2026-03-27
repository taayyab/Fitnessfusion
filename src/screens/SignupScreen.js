import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import { showAlert } from '../components/ThemedAlert';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SignupScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cnic, setCnic] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('');
  const [profession, setProfession] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showAlert.error('Error', 'Please fill in name, email and password');
      return;
    }
    if (password !== confirmPassword) {
      showAlert.error('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      showAlert.error('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), {
        whatsapp: whatsapp.trim(),
        cnic: cnic.trim(),
        joining_date: joiningDate.toISOString().split('T')[0],
        blood_group: bloodGroup,
        profession: profession.trim(),
      });
      showAlert.success(
        'Account Created!',
        'Your account has been created successfully. You can now sign in.',
        () => navigation.navigate('Login')
      );
    } catch (error) {
      showAlert.error('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setJoiningDate(selectedDate);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Join the Grind</Text>
          <Text style={styles.formSubtitle}>Start your fitness transformation today</Text>

          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            icon="person"
          />

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            icon="email"
          />

          <InputField
            label="WhatsApp Number"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="e.g. 03001234567"
            keyboardType="phone-pad"
            icon="phone"
          />

          <InputField
            label="CNIC"
            value={cnic}
            onChangeText={setCnic}
            placeholder="e.g. 12345-1234567-1"
            keyboardType="default"
            icon="credit-card"
          />

          {/* Joining Date Picker */}
          <Text style={styles.label}>JOINING DATE</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color={COLORS.textMuted} />
            <Text style={styles.dateText}>
              {joiningDate.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={joiningDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              themeVariant="dark"
            />
          )}

          {/* Blood Group Selector */}
          <Text style={styles.label}>BLOOD GROUP</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg}
                style={[styles.bloodGroupBtn, bloodGroup === bg && styles.bloodGroupActive]}
                onPress={() => setBloodGroup(bg)}
              >
                <Text style={[styles.bloodGroupText, bloodGroup === bg && styles.bloodGroupTextActive]}>
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField
            label="Profession"
            value={profession}
            onChangeText={setProfession}
            placeholder="e.g. Software Engineer"
            icon="work"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            icon="lock"
          />

          <InputField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            icon="lock-outline"
          />

          <GradientButton
            title="CREATE ACCOUNT"
            onPress={handleSignup}
            loading={loading}
            style={styles.signupButton}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  form: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    marginBottom: 4,
  },
  formSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginBottom: 24,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 8,
    letterSpacing: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight || '#222222',
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    marginBottom: 16,
  },
  dateText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.regular,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bloodGroupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.cardLight || '#222222',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bloodGroupActive: {
    backgroundColor: COLORS.red + '20',
    borderColor: COLORS.red,
  },
  bloodGroupText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  bloodGroupTextActive: {
    color: COLORS.red,
  },
  signupButton: {
    marginTop: 8,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
  },
  loginHighlight: {
    color: COLORS.red,
    ...FONTS.bold,
  },
});

export default SignupScreen;
