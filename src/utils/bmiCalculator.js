/**
 * BMI Calculator and health categorization utilities
 */

export const calculateBMI = (weightKg, heightCm) => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
};

export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const getBMICategoryColor = (category) => {
  switch (category) {
    case 'Underweight': return '#2196F3';
    case 'Normal': return '#4CAF50';
    case 'Overweight': return '#FF9800';
    case 'Obese': return '#FF3B3B';
    default: return '#FFFFFF';
  }
};

export const calculateDailyCalories = (weight, height, age, gender, bmiCategory) => {
  // Mifflin-St Jeor Equation for BMR
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier (moderate activity assumed)
  const activityMultiplier = 1.55;
  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust based on goal derived from BMI category
  const goal = getGoalFromCategory(bmiCategory);
  switch (goal) {
    case 'fat_loss':
      return { calories: Math.round(tdee - 500), goal: 'Fat Loss', tdee };
    case 'muscle_gain':
      return { calories: Math.round(tdee + 300), goal: 'Muscle Gain', tdee };
    case 'maintenance':
    default:
      return { calories: tdee, goal: 'Maintenance', tdee };
  }
};

export const getGoalFromCategory = (bmiCategory) => {
  switch (bmiCategory) {
    case 'Overweight':
    case 'Obese':
      return 'fat_loss';
    case 'Underweight':
      return 'muscle_gain';
    case 'Normal':
    default:
      return 'maintenance';
  }
};

export const calculateMacros = (calories, goal) => {
  let proteinPct, carbsPct, fatPct;

  switch (goal) {
    case 'Fat Loss':
      proteinPct = 0.35;
      carbsPct = 0.35;
      fatPct = 0.30;
      break;
    case 'Muscle Gain':
      proteinPct = 0.30;
      carbsPct = 0.45;
      fatPct = 0.25;
      break;
    case 'Maintenance':
    default:
      proteinPct = 0.30;
      carbsPct = 0.40;
      fatPct = 0.30;
      break;
  }

  return {
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
  };
};
