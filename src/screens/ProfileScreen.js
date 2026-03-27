import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { uploadProfileImage } from '../utils/notifications';
import { showAlert } from '../components/ThemedAlert';
import {
  getBMICategoryColor,
  calculateMacros,
  calculateBMI,
  getBMICategory,
  calculateDailyCalories,
} from '../utils/bmiCalculator';
import GradientButton from '../components/GradientButton';
import ScreenWrapper from '../components/ScreenWrapper';

const ProfileScreen = () => {
  const { profile, signOut, user, updateProfile, fetchProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [showPicOptions, setShowPicOptions] = useState(false);

  const handleChangeProfilePic = () => {
    setShowPicOptions(true);
  };

  const pickFromGallery = async () => {
    setShowPicOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert.error('Permission Required', 'Gallery access is needed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) uploadNewPic(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    setShowPicOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert.error('Permission Required', 'Camera access is needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) uploadNewPic(result.assets[0].uri);
  };

  const uploadNewPic = async (uri) => {
    setUploadingPic(true);
    try {
      await uploadProfileImage(user.id, uri);
      await fetchProfile(user.id);
      showAlert.success('Success', 'Profile picture updated!');
    } catch (error) {
      showAlert.error('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingPic(false);
    }
  };

  if (!profile) return null;

  const macros = calculateMacros(profile.daily_calories, profile.goal);
  const bmiColor = getBMICategoryColor(profile.bmi_category);

  const handleUpdateWeight = async () => {
    const weightNum = parseFloat(newWeight);
    if (!weightNum || weightNum < 30 || weightNum > 250) {
      showAlert.error('Error', 'Please enter a valid weight (30-250 kg)');
      return;
    }

    setUpdating(true);
    try {
      const newBmi = calculateBMI(weightNum, profile.height);
      const newCategory = getBMICategory(newBmi);
      const calorieData = calculateDailyCalories(
        weightNum, profile.height, profile.age, profile.gender, newCategory
      );

      await updateProfile({
        weight: weightNum,
        bmi: newBmi,
        bmi_category: newCategory,
        daily_calories: calorieData.calories,
        goal: calorieData.goal,
      });

      setShowWeightModal(false);
      setNewWeight('');
      showAlert.success(
        'Weight Updated',
        `Weight: ${weightNum} kg\nBMI: ${newBmi} (${newCategory})\nCalories: ${calorieData.calories} kcal/day`
      );
    } catch (error) {
      showAlert.error('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = () => {
    showAlert.confirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        setLoggingOut(true);
        try {
          await signOut();
        } catch (error) {
          showAlert.error('Error', error.message);
        } finally {
          setLoggingOut(false);
        }
      }
    );
  };

  const InfoRow = ({ icon, label, value, valueColor }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialIcons name={icon} size={20} color={COLORS.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Profile</Text>

        {/* User Card */}
        <View style={styles.userCard}>
          <TouchableOpacity onPress={handleChangeProfilePic} style={styles.avatarWrapper} disabled={uploadingPic}>
            {profile.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={40} color={COLORS.red} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingPic ? (
                <ActivityIndicator size={12} color={COLORS.white} />
              ) : (
                <MaterialIcons name="camera-alt" size={14} color={COLORS.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{profile.full_name || 'Athlete'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile.role?.toUpperCase() || 'MEMBER'}</Text>
          </View>
        </View>

        {/* BMI Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Analysis</Text>
          <View style={styles.bmiDisplay}>
            <View style={styles.bmiCircle}>
              <Text style={[styles.bmiNumber, { color: bmiColor }]}>{profile.bmi}</Text>
              <Text style={styles.bmiLabel}>BMI</Text>
            </View>
            <View style={[styles.bmiCategoryBadge, { backgroundColor: bmiColor + '20' }]}>
              <Text style={[styles.bmiCategoryText, { color: bmiColor }]}>
                {profile.bmi_category}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="cake" label="Age" value={`${profile.age} years`} />
            <InfoRow icon="wc" label="Gender" value={profile.gender?.charAt(0).toUpperCase() + profile.gender?.slice(1)} />
            <InfoRow icon="height" label="Height" value={`${profile.height} cm`} />
            <TouchableOpacity onPress={() => { setNewWeight(String(profile.weight)); setShowWeightModal(true); }}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <MaterialIcons name="monitor-weight" size={20} color={COLORS.textMuted} />
                  <Text style={styles.infoLabel}>Weight</Text>
                </View>
                <View style={styles.editableValue}>
                  <Text style={[styles.infoValue, { color: COLORS.red }]}>{profile.weight} kg</Text>
                  <MaterialIcons name="edit" size={14} color={COLORS.red} />
                </View>
              </View>
            </TouchableOpacity>
            {profile.whatsapp && <InfoRow icon="phone" label="WhatsApp" value={profile.whatsapp} />}
            {profile.cnic && <InfoRow icon="credit-card" label="CNIC" value={profile.cnic} />}
            {profile.blood_group && <InfoRow icon="water-drop" label="Blood Group" value={profile.blood_group} valueColor={COLORS.red} />}
            {profile.profession && <InfoRow icon="work" label="Profession" value={profile.profession} />}
            {profile.joining_date && <InfoRow icon="calendar-today" label="Joined" value={new Date(profile.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />}
          </View>
        </View>

        {/* Fitness Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Plan</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="flag" label="Goal" value={profile.goal} valueColor={COLORS.red} />
            <InfoRow icon="local-fire-department" label="Daily Calories" value={`${profile.daily_calories} kcal`} valueColor={COLORS.red} />
            <InfoRow icon="egg" label="Protein" value={`${macros.protein}g`} />
            <InfoRow icon="grain" label="Carbs" value={`${macros.carbs}g`} />
            <InfoRow icon="water-drop" label="Fat" value={`${macros.fat}g`} />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <MaterialIcons name="fitness-center" size={24} color={COLORS.red} />
              <Text style={styles.quickStatValue}>7</Text>
              <Text style={styles.quickStatLabel}>Workouts/Week</Text>
            </View>
            <View style={styles.quickStatItem}>
              <MaterialIcons name="restaurant" size={24} color={COLORS.warning} />
              <Text style={styles.quickStatValue}>4</Text>
              <Text style={styles.quickStatLabel}>Meals/Day</Text>
            </View>
            <View style={styles.quickStatItem}>
              <MaterialIcons name="local-fire-department" size={24} color={COLORS.redLight} />
              <Text style={styles.quickStatValue}>{profile.daily_calories}</Text>
              <Text style={styles.quickStatLabel}>Cal Target</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <GradientButton
          title="SIGN OUT"
          onPress={handleSignOut}
          loading={loggingOut}
          variant="outline"
          style={styles.signOutButton}
          icon={<MaterialIcons name="logout" size={20} color={COLORS.red} />}
        />

        <Text style={styles.version}>Fitness Fusion v1.0.0</Text>
      </ScrollView>

      {/* Profile Picture Options Modal */}
      <Modal visible={showPicOptions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.picOptionsOverlay}
          activeOpacity={1}
          onPress={() => setShowPicOptions(false)}
        >
          <View style={styles.picOptionsCard}>
            <Text style={styles.picOptionsTitle}>Change Profile Picture</Text>
            <TouchableOpacity style={styles.picOption} onPress={pickFromCamera}>
              <View style={[styles.picOptionIcon, { backgroundColor: COLORS.red + '15' }]}>
                <MaterialIcons name="camera-alt" size={22} color={COLORS.red} />
              </View>
              <Text style={styles.picOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.picOption} onPress={pickFromGallery}>
              <View style={[styles.picOptionIcon, { backgroundColor: COLORS.info + '15' }]}>
                <MaterialIcons name="photo-library" size={22} color={COLORS.info} />
              </View>
              <Text style={styles.picOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.picCancelBtn}
              onPress={() => setShowPicOptions(false)}
            >
              <Text style={styles.picCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Update Weight Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Weight</Text>
              <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.currentWeightRow}>
              <Text style={styles.currentWeightLabel}>Current</Text>
              <Text style={styles.currentWeightValue}>{profile.weight} kg</Text>
              <Text style={styles.currentWeightBmi}>BMI: {profile.bmi}</Text>
            </View>

            <Text style={styles.modalInputLabel}>NEW WEIGHT (KG)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 72"
              placeholderTextColor={COLORS.textMuted}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="numeric"
              autoFocus
            />

            <Text style={styles.modalHint}>
              Your BMI, calorie target, and fitness goal will be recalculated automatically.
            </Text>

            <GradientButton
              title="UPDATE WEIGHT"
              onPress={handleUpdateWeight}
              loading={updating}
              style={styles.modalButton}
              icon={<MaterialIcons name="sync" size={18} color={COLORS.white} />}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.red + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.red + '30',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.red + '30',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  userName: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
  },
  userEmail: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: COLORS.red + '20',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  roleText: {
    color: COLORS.red,
    fontSize: SIZES.xs,
    ...FONTS.bold,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginBottom: 12,
  },
  bmiDisplay: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bmiCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bmiNumber: {
    fontSize: 32,
    ...FONTS.bold,
  },
  bmiLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  bmiCategoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bmiCategoryText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatValue: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
    marginTop: 8,
  },
  quickStatLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Profile picture options modal
  picOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  picOptionsCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  picOptionsTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 20,
  },
  picOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  picOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picOptionText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.semiBold,
  },
  picCancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
  },
  picCancelText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  // Weight modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  currentWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 14,
    marginBottom: 20,
  },
  currentWeightLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  currentWeightValue: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  currentWeightBmi: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginLeft: 'auto',
  },
  modalInputLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.white,
    fontSize: SIZES.xl,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalHint: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalButton: {
    marginTop: 4,
  },
  signOutButton: {
    marginTop: 8,
  },
  version: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;
