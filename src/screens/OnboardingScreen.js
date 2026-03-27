import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import { uploadProfileImage } from '../utils/notifications';
import { showAlert } from '../components/ThemedAlert';
import {
  calculateBMI,
  getBMICategory,
  getBMICategoryColor,
  calculateDailyCalories,
  calculateMacros,
} from '../utils/bmiCalculator';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { updateProfile, user } = useAuth();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert.error('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert.error('Permission Required', 'Please allow access to your camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleCalculate = () => {
    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (!ageNum || !heightNum || !weightNum || !gender) {
      showAlert.error('Error', 'Please fill in all fields');
      return;
    }
    if (ageNum < 10 || ageNum > 100) {
      showAlert.error('Error', 'Please enter a valid age (10-100)');
      return;
    }
    if (heightNum < 100 || heightNum > 250) {
      showAlert.error('Error', 'Please enter height in cm (100-250)');
      return;
    }
    if (weightNum < 30 || weightNum > 250) {
      showAlert.error('Error', 'Please enter weight in kg (30-250)');
      return;
    }

    const bmi = calculateBMI(weightNum, heightNum);
    const category = getBMICategory(bmi);
    const calorieData = calculateDailyCalories(weightNum, heightNum, ageNum, gender, category);
    const macros = calculateMacros(calorieData.calories, calorieData.goal);

    setResult({ bmi, category, ...calorieData, macros });
    setStep(3);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Upload profile picture if selected
      let pictureUrl = null;
      if (profileImage && user) {
        setUploadingImage(true);
        try {
          pictureUrl = await uploadProfileImage(user.id, profileImage);
        } catch (imgErr) {
          console.warn('Image upload failed, continuing:', imgErr);
        }
        setUploadingImage(false);
      }

      const updates = {
        age: parseInt(age),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: result.bmi,
        bmi_category: result.category,
        daily_calories: result.calories,
        goal: result.goal,
      };
      if (pictureUrl) updates.profile_picture = pictureUrl;

      const saved = await updateProfile(updates);
      console.log('Profile saved:', JSON.stringify(saved));
    } catch (error) {
      console.error('Save profile error:', error);
      showAlert.error('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <Text style={styles.stepTitle}>Basic Info</Text>
      </View>
      <Text style={styles.stepDescription}>
        Tell us about yourself so we can create your personalized plan
      </Text>

      {/* Profile Picture */}
      <Text style={styles.label}>PROFILE PICTURE</Text>
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="camera-alt" size={32} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <MaterialIcons name="edit" size={14} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
          <MaterialIcons name="photo-camera" size={18} color={COLORS.red} />
          <Text style={styles.cameraBtnText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      <InputField
        label="Age"
        value={age}
        onChangeText={setAge}
        placeholder="Enter your age"
        keyboardType="numeric"
        icon="cake"
      />

      <Text style={styles.label}>GENDER</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.genderActive]}
          onPress={() => setGender('male')}
        >
          <MaterialIcons
            name="male"
            size={28}
            color={gender === 'male' ? COLORS.white : COLORS.textMuted}
          />
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.genderActive]}
          onPress={() => setGender('female')}
        >
          <MaterialIcons
            name="female"
            size={28}
            color={gender === 'female' ? COLORS.white : COLORS.textMuted}
          />
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
            Female
          </Text>
        </TouchableOpacity>
      </View>

      <GradientButton
        title="NEXT"
        onPress={() => {
          if (!age || !gender) {
            showAlert.error('Error', 'Please enter your age and select gender');
            return;
          }
          setStep(2);
        }}
        style={styles.nextButton}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backStep}>
          <MaterialIcons name="arrow-back" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <Text style={styles.stepTitle}>Body Stats</Text>
      </View>
      <Text style={styles.stepDescription}>
        We'll calculate your BMI and create a personalized plan
      </Text>

      <InputField
        label="Height (cm)"
        value={height}
        onChangeText={setHeight}
        placeholder="e.g. 175"
        keyboardType="numeric"
        icon="height"
      />

      <InputField
        label="Weight (kg)"
        value={weight}
        onChangeText={setWeight}
        placeholder="e.g. 70"
        keyboardType="numeric"
        icon="monitor-weight"
      />

      <GradientButton
        title="CALCULATE MY PLAN"
        onPress={handleCalculate}
        style={styles.nextButton}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.resultHeader}>
        <MaterialIcons name="check-circle" size={48} color={COLORS.success} />
        <Text style={styles.resultTitle}>Your Personalized Plan</Text>
        <Text style={styles.resultSubtitle}>Based on your body analysis</Text>
      </View>

      <View style={styles.bmiCard}>
        <Text style={styles.bmiLabel}>Your BMI</Text>
        <Text style={[styles.bmiValue, { color: getBMICategoryColor(result.category) }]}>
          {result.bmi}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: getBMICategoryColor(result.category) + '20' }]}>
          <Text style={[styles.categoryText, { color: getBMICategoryColor(result.category) }]}>
            {result.category}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <MaterialIcons name="local-fire-department" size={24} color={COLORS.red} />
          <Text style={styles.statValue}>{result.calories}</Text>
          <Text style={styles.statLabel}>Daily Calories</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="flag" size={24} color={COLORS.info} />
          <Text style={styles.statValue}>{result.goal}</Text>
          <Text style={styles.statLabel}>Your Goal</Text>
        </View>
      </View>

      <View style={styles.macroCard}>
        <Text style={styles.macroTitle}>Daily Macros</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: COLORS.red }]}>{result.macros.protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: COLORS.warning }]}>{result.macros.carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: COLORS.info }]}>{result.macros.fat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      <GradientButton
        title="START MY JOURNEY"
        onPress={handleSaveProfile}
        loading={loading}
        style={styles.nextButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Image
            source={require('../../assets/fitness-fusion.jpg')}
            style={styles.topBarLogo}
            resizeMode="contain"
          />
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 3</Text>
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </View>
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
  topBar: {
    alignItems: 'center',
    marginBottom: 32,
  },
  topBarLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  avatarPicker: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.red,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cameraBtnText: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.red,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginTop: 8,
  },
  stepContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backStep: {
    marginRight: 12,
    padding: 4,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  stepTitle: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  stepDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 8,
    letterSpacing: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genderActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red + '20',
  },
  genderText: {
    color: COLORS.textMuted,
    fontSize: SIZES.base,
    ...FONTS.semiBold,
  },
  genderTextActive: {
    color: COLORS.white,
  },
  nextButton: {
    marginTop: 16,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
    marginTop: 12,
  },
  resultSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginTop: 4,
  },
  bmiCard: {
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radius,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bmiLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bmiValue: {
    fontSize: 48,
    ...FONTS.bold,
    marginVertical: 8,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radius,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginTop: 8,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
  },
  macroCard: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radius,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    marginBottom: 16,
    textAlign: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
  },
});

export default OnboardingScreen;
