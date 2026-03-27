import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { getBMICategoryColor } from '../utils/bmiCalculator';
import StatCard from '../components/StatCard';
import { getWorkoutPlan } from '../data/workoutPlans';
import { getMealPlan } from '../data/mealPlans';
import ScreenWrapper from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const [todayMarked, setTodayMarked] = useState(false);
  const [marking, setMarking] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    checkTodayAttendance();
  }, []);

  const checkTodayAttendance = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', profile.id)
      .eq('date', todayStr)
      .maybeSingle();
    setTodayMarked(!!data);
  };

  const markAttendance = async () => {
    if (!profile) return;
    setMarking(true);
    try {
      await supabase.from('attendance').upsert({
        user_id: profile.id,
        date: todayStr,
        status: 'present',
        check_in_time: new Date().toISOString(),
      });
      setTodayMarked(true);
    } catch (e) {
      console.error(e);
    } finally {
      setMarking(false);
    }
  };

  if (!profile) return null;

  const bmiColor = getBMICategoryColor(profile.bmi_category);
  const workoutData = getWorkoutPlan(profile.bmi_category);
  const mealData = getMealPlan(profile.goal);

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayWorkout = workoutData.plan[dayIndex];
  const todayMeal = mealData.plan[dayIndex];

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name}>{profile.full_name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {profile.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={{ width: 44, height: 44, borderRadius: 12 }} />
            ) : (
              <MaterialIcons name="person" size={24} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Check-In */}
        <TouchableOpacity
          style={[styles.checkInCard, todayMarked && styles.checkInCardDone]}
          onPress={!todayMarked ? markAttendance : undefined}
          activeOpacity={todayMarked ? 1 : 0.8}
          disabled={marking}
        >
          <MaterialIcons
            name={todayMarked ? 'check-circle' : 'login'}
            size={28}
            color={todayMarked ? COLORS.success : COLORS.red}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.checkInTitle}>
              {todayMarked ? 'Checked In Today' : 'Mark Attendance'}
            </Text>
            <Text style={styles.checkInSub}>
              {todayMarked ? 'Great job showing up!' : 'Tap to check in for today'}
            </Text>
          </View>
          {marking && <ActivityIndicator size="small" color={COLORS.red} />}
          {!todayMarked && !marking && (
            <MaterialIcons name="chevron-right" size={24} color={COLORS.red} />
          )}
        </TouchableOpacity>

        {/* BMI Summary */}
        <View style={styles.bmiCard}>
          <View style={styles.bmiTop}>
            <View>
              <Text style={styles.bmiLabel}>Current BMI</Text>
              <Text style={[styles.bmiValue, { color: bmiColor }]}>{profile.bmi}</Text>
            </View>
            <View style={[styles.categoryChip, { backgroundColor: bmiColor + '20' }]}>
              <View style={[styles.categoryDot, { backgroundColor: bmiColor }]} />
              <Text style={[styles.categoryText, { color: bmiColor }]}>
                {profile.bmi_category}
              </Text>
            </View>
          </View>
          <View style={styles.bmiBarContainer}>
            <View style={styles.bmiBar}>
              <View style={[styles.bmiIndicator, {
                left: `${Math.min(Math.max((profile.bmi / 40) * 100, 5), 95)}%`,
              }]} />
            </View>
            <View style={styles.bmiLabels}>
              <Text style={styles.bmiRangeText}>18.5</Text>
              <Text style={styles.bmiRangeText}>25</Text>
              <Text style={styles.bmiRangeText}>30</Text>
            </View>
          </View>
          <View style={styles.goalBadge}>
            <MaterialIcons name="flag" size={16} color={COLORS.red} />
            <Text style={styles.goalText}>Goal: {profile.goal}</Text>
            <Text style={styles.goalCalories}>{profile.daily_calories} kcal/day</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="monitor-weight"
            label="Weight"
            value={profile.weight}
            unit="kg"
            color={COLORS.red}
          />
          <View style={{ width: 12 }} />
          <StatCard
            icon="height"
            label="Height"
            value={profile.height}
            unit="cm"
            color={COLORS.info}
          />
        </View>

        {/* Today's Workout Preview */}
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate('Workouts')}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.red + '20' }]}>
                <MaterialIcons name="fitness-center" size={20} color={COLORS.red} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Today's Workout</Text>
                <Text style={styles.sectionSubtitle}>{todayWorkout.focus}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </View>
          <View style={styles.previewRow}>
            <View style={styles.previewItem}>
              <MaterialIcons name="timer" size={16} color={COLORS.textSecondary} />
              <Text style={styles.previewText}>{todayWorkout.duration}</Text>
            </View>
            <View style={styles.previewItem}>
              <MaterialIcons name="format-list-numbered" size={16} color={COLORS.textSecondary} />
              <Text style={styles.previewText}>{todayWorkout.exercises.length} exercises</Text>
            </View>
            <View style={styles.previewItem}>
              <MaterialIcons name="calendar-today" size={16} color={COLORS.textSecondary} />
              <Text style={styles.previewText}>{todayWorkout.day}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Today's Meal Preview */}
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate('Meals')}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <MaterialIcons name="restaurant" size={20} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Today's Meals</Text>
                <Text style={styles.sectionSubtitle}>{todayMeal.totalCalories} kcal planned</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </View>
          <View style={styles.mealPreview}>
            {todayMeal.meals.map((meal, index) => (
              <View key={index} style={styles.mealPreviewItem}>
                <Text style={styles.mealType}>{meal.type}</Text>
                <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Workout Type Info */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color={COLORS.info} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Your Plan: {workoutData.type}</Text>
            <Text style={styles.infoDescription}>{workoutData.description}</Text>
          </View>
        </View>

        {/* Contact Admin / Owner */}
        {/* Contact Admin / Owner */}
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <MaterialIcons name="admin-panel-settings" size={20} color={COLORS.primary} />
            <Text style={styles.contactTitle}>Owner / Admin</Text>
          </View>
          <Text style={styles.contactNumber}>+92 306 1362175</Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => Linking.openURL('https://wa.me/923061362175')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="chat" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL('tel:+923061362175')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
  },
  name: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.red + '40',
    gap: 14,
  },
  checkInCardDone: {
    borderColor: COLORS.success + '40',
  },
  checkInTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  checkInSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  bmiCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  bmiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bmiLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bmiValue: {
    fontSize: 36,
    ...FONTS.bold,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  bmiBarContainer: {
    marginBottom: 16,
  },
  bmiBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardLight,
    position: 'relative',
    overflow: 'visible',
  },
  bmiIndicator: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  bmiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '20%',
    marginTop: 8,
  },
  bmiRangeText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.regular,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    gap: 8,
  },
  goalText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    flex: 1,
  },
  goalCalories: {
    color: COLORS.red,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 16,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  mealPreview: {
    gap: 8,
  },
  mealPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
  },
  mealType: {
    color: COLORS.red,
    fontSize: SIZES.xs,
    ...FONTS.bold,
    width: 70,
    textTransform: 'uppercase',
  },
  mealName: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    flex: 1,
  },
  mealCalories: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '10',
    borderRadius: SIZES.radius,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  infoDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  contactNumber: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    marginLeft: 28,
    marginBottom: 12,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  contactBtnText: {
    color: '#fff',
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
});

export default DashboardScreen;
