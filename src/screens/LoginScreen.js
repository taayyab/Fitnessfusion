import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import { showAlert } from '../components/ThemedAlert';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert.error('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      showAlert.error('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
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
          <Image
            source={require('../../assets/fitness-fusion.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>FITNESS FUSION</Text>
          <Text style={styles.subtitle}>Your smart fitness companion</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue your journey</Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            icon="email"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            icon="lock"
          />

          <GradientButton
            title="SIGN IN"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupHighlight}>Sign Up</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    color: COLORS.white,
    fontSize: SIZES.xxxl,
    ...FONTS.bold,
    letterSpacing: 3,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginTop: 4,
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
  loginButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    marginHorizontal: 12,
    ...FONTS.medium,
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
  },
  signupHighlight: {
    color: COLORS.red,
    ...FONTS.bold,
  },
});

export default LoginScreen;
