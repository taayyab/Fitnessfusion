import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { getMealPlan, MEAL_RULES } from '../data/mealPlans';
import { calculateMacros } from '../utils/bmiCalculator';
import ScreenWrapper from '../components/ScreenWrapper';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_ICONS = {
  Breakfast: 'free-breakfast',
  Lunch: 'lunch-dining',
  Snack: 'cookie',
  Dinner: 'dinner-dining',
};

const MEAL_COLORS = {
  Breakfast: '#FF9800',
  Lunch: '#4CAF50',
  Snack: '#2196F3',
  Dinner: '#9C27B0',
};

const MealPlanScreen = () => {
  const { profile } = useAuth();
  const today = new Date();
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);
  const [expandedMeal, setExpandedMeal] = useState(null);

  if (!profile) return null;

  const mealData = getMealPlan(profile.goal);
  const dayPlan = mealData.plan[selectedDay];
  const rules = MEAL_RULES[profile.goal] || MEAL_RULES['Maintenance'];
  const macros = calculateMacros(profile.daily_calories, profile.goal);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Meal Plan</Text>
          <View style={styles.goalBadge}>
            <MaterialIcons name="restaurant" size={14} color={COLORS.red} />
            <Text style={styles.goalText}>{profile.goal}</Text>
          </View>
        </View>

        {/* Daily Calorie Target */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieMain}>
            <Text style={styles.calorieLabel}>Daily Target</Text>
            <Text style={styles.calorieValue}>{profile.daily_calories}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
          <View style={styles.macroBar}>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: COLORS.red }]} />
              <Text style={styles.macroName}>Protein</Text>
              <Text style={styles.macroValue}>{macros.protein}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.macroName}>Carbs</Text>
              <Text style={styles.macroValue}>{macros.carbs}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: COLORS.info }]} />
              <Text style={styles.macroName}>Fat</Text>
              <Text style={styles.macroValue}>{macros.fat}g</Text>
            </View>
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

        {/* Day Summary */}
        <View style={styles.daySummary}>
          <Text style={styles.dayTitle}>{dayPlan.day}</Text>
          <View style={styles.daySummaryStats}>
            <Text style={styles.daySummaryCal}>{dayPlan.totalCalories} kcal</Text>
            <Text style={styles.daySummaryProtein}>{dayPlan.totalProtein}g protein</Text>
          </View>
        </View>

        {/* Meals */}
        <View style={styles.mealList}>
          {dayPlan.meals.map((meal, index) => {
            const isExpanded = expandedMeal === index;
            const mealColor = MEAL_COLORS[meal.type] || COLORS.red;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.mealCard, isExpanded && styles.mealCardExpanded]}
                onPress={() => setExpandedMeal(isExpanded ? null : index)}
                activeOpacity={0.8}
              >
                <View style={styles.mealHeader}>
                  <View style={[styles.mealIcon, { backgroundColor: mealColor + '20' }]}>
                    <MaterialIcons
                      name={MEAL_ICONS[meal.type] || 'restaurant'}
                      size={22}
                      color={mealColor}
                    />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealType, { color: mealColor }]}>{meal.type}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                  </View>
                  <View style={styles.mealCalBadge}>
                    <Text style={styles.mealCalText}>{meal.calories}</Text>
                    <Text style={styles.mealCalUnit}>kcal</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.mealExpanded}>
                    {meal.alt && (
                      <View style={styles.altOption}>
                        <MaterialIcons name="swap-horiz" size={16} color={COLORS.textMuted} />
                        <Text style={styles.altText}>Alt: {meal.alt}</Text>
                      </View>
                    )}
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: COLORS.red }]}>
                          {meal.protein}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Protein</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: COLORS.warning }]}>
                          {meal.carbs}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Carbs</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: COLORS.info }]}>
                          {meal.fat}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Fat</Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rules Card */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <MaterialIcons name="rule" size={20} color={COLORS.red} />
            <Text style={styles.rulesTitle}>Daily Guidelines</Text>
          </View>
          {rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <View style={styles.ruleBullet} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Weekly Protein Summary */}
        <View style={styles.weeklySummary}>
          <Text style={styles.weeklyTitle}>Weekly Range</Text>
          <View style={styles.weeklyStats}>
            <View style={styles.weeklyStatItem}>
              <Text style={styles.weeklyStatLabel}>Daily Calories</Text>
              <Text style={styles.weeklyStatValue}>{mealData.dailyRange}</Text>
            </View>
            <View style={styles.weeklyStatItem}>
              <Text style={styles.weeklyStatLabel}>Daily Protein</Text>
              <Text style={styles.weeklyStatValue}>{mealData.proteinRange}g</Text>
            </View>
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
    marginBottom: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  goalBadge: {
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
  goalText: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  calorieCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  calorieMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
    gap: 4,
  },
  calorieLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
    marginRight: 8,
  },
  calorieValue: {
    color: COLORS.red,
    fontSize: 36,
    ...FONTS.bold,
  },
  calorieUnit: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    ...FONTS.regular,
  },
  macroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 14,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroName: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  macroValue: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  daySelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
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
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  daySummaryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  daySummaryCal: {
    color: COLORS.red,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  daySummaryProtein: {
    color: COLORS.info,
    fontSize: SIZES.sm,
    ...FONTS.bold,
  },
  mealList: {
    gap: 10,
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealCardExpanded: {
    borderColor: COLORS.red + '40',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealName: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    marginTop: 2,
  },
  mealCalBadge: {
    alignItems: 'center',
  },
  mealCalText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  mealCalUnit: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.regular,
  },
  mealExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  altOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 12,
    marginBottom: 12,
  },
  altText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    flex: 1,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  nutritionLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginTop: 4,
  },
  rulesCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rulesTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.red,
  },
  ruleText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
  },
  weeklySummary: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weeklyTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    ...FONTS.bold,
    marginBottom: 12,
  },
  weeklyStats: {
    flexDirection: 'row',
    gap: 12,
  },
  weeklyStatItem: {
    flex: 1,
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusSm,
    padding: 14,
    alignItems: 'center',
  },
  weeklyStatLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    ...FONTS.medium,
    marginBottom: 4,
  },
  weeklyStatValue: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
});

export default MealPlanScreen;
