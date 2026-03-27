import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { getWorkoutPlan } from '../data/workoutPlans';
import ScreenWrapper from '../components/ScreenWrapper';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WorkoutScreen = () => {
  const { profile } = useAuth();
  const today = new Date();
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);

  if (!profile) return null;

  const workoutData = getWorkoutPlan(profile.bmi_category);
  const dayPlan = workoutData.plan[selectedDay];

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Workout Plan</Text>
          <View style={styles.typeBadge}>
            <MaterialIcons name="fitness-center" size={14} color={COLORS.red} />
            <Text style={styles.typeText}>{workoutData.type}</Text>
          </View>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelector}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDay === index && styles.dayButtonActive,
                currentDayIndex === index && selectedDay !== index && styles.dayButtonToday,
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDay === index && styles.dayTextActive,
                ]}
              >
                {day}
              </Text>
              {currentDayIndex === index && (
                <View style={[styles.todayDot, selectedDay === index && styles.todayDotActive]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Day Info */}
        <View style={styles.dayInfoCard}>
          <View style={styles.dayInfoLeft}>
            <Text style={styles.dayName}>{dayPlan.day}</Text>
            <Text style={styles.focusText}>{dayPlan.focus}</Text>
          </View>
          <View style={styles.durationBadge}>
            <MaterialIcons name="timer" size={16} color={COLORS.red} />
            <Text style={styles.durationText}>{dayPlan.duration}</Text>
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.exerciseList}>
          {dayPlan.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseIndex}>
                <Text style={styles.exerciseIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseDetails}>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Sets</Text>
                    <Text style={styles.detailValue}>{exercise.sets}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Reps</Text>
                    <Text style={styles.detailValue}>{exercise.reps}</Text>
                  </View>
                  {exercise.rest !== '-' && (
                    <View style={styles.detailChip}>
                      <Text style={styles.detailLabel}>Rest</Text>
                      <Text style={styles.detailValue}>{exercise.rest}</Text>
                    </View>
                  )}
                </View>
              </View>
              <MaterialIcons name={exercise.icon} size={24} color={COLORS.red + '60'} />
            </View>
          ))}
        </View>

        {/* Plan Description */}
        <View style={styles.descCard}>
          <MaterialIcons name="lightbulb-outline" size={20} color={COLORS.warning} />
          <Text style={styles.descText}>{workoutData.description}</Text>
        </View>

        {/* Weekly Overview */}
        <Text style={styles.weeklyTitle}>Weekly Overview</Text>
        <View style={styles.weeklyGrid}>
          {workoutData.plan.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.weeklyCard,
                selectedDay === index && styles.weeklyCardActive,
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text style={styles.weeklyDay}>{DAYS[index]}</Text>
              <Text style={styles.weeklyFocus} numberOfLines={2}>{day.focus}</Text>
              <Text style={styles.weeklyDuration}>{day.duration}</Text>
            </TouchableOpacity>
          ))}
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
    marginBottom: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: COLORS.red + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  daySelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dayButton: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  dayButtonToday: {
    borderColor: COLORS.red + '50',
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  dayTextActive: {
    color: COLORS.white,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.red,
    marginTop: 4,
  },
  todayDotActive: {
    backgroundColor: COLORS.white,
  },
  dayInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayInfoLeft: {},
  dayName: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  focusText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginTop: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.red + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: COLORS.red,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  exerciseList: {
    gap: 10,
    marginBottom: 20,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.red + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    color: COLORS.red,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.semiBold,
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.medium,
  },
  detailValue: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  descCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '10',
    borderRadius: SIZES.radius,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.warning + '20',
  },
  descText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    lineHeight: 20,
  },
  weeklyTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginBottom: 12,
  },
  weeklyGrid: {
    gap: 8,
  },
  weeklyCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weeklyCardActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red + '10',
  },
  weeklyDay: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
    width: 36,
  },
  weeklyFocus: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.medium,
    flex: 1,
  },
  weeklyDuration: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
});

export default WorkoutScreen;
