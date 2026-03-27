/**
 * Workout plans based on BMI category
 * Each plan has 7 days with exercises, sets, reps, and duration
 */

const OVERWEIGHT_OBESE_PLAN = [
  {
    day: 'Monday',
    focus: 'Cardio + Light Upper Body',
    duration: '45 min',
    exercises: [
      { name: 'Brisk Walking', sets: 1, reps: '20 min', rest: '-', icon: 'directions-walk' },
      { name: 'Wall Push-ups', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Seated Dumbbell Press', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Standing Arm Circles', sets: 2, reps: '15 each', rest: '30s', icon: 'accessibility' },
      { name: 'Cool Down Stretches', sets: 1, reps: '5 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Tuesday',
    focus: 'Low Impact Cardio',
    duration: '40 min',
    exercises: [
      { name: 'Cycling (Stationary)', sets: 1, reps: '25 min', rest: '-', icon: 'pedal-bike' },
      { name: 'Leg Raises (Seated)', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Calf Raises', sets: 3, reps: '15', rest: '30s', icon: 'fitness-center' },
      { name: 'Stretching', sets: 1, reps: '10 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Wednesday',
    focus: 'Rest / Active Recovery',
    duration: '30 min',
    exercises: [
      { name: 'Light Walking', sets: 1, reps: '20 min', rest: '-', icon: 'directions-walk' },
      { name: 'Full Body Stretching', sets: 1, reps: '10 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Thursday',
    focus: 'Cardio + Lower Body',
    duration: '45 min',
    exercises: [
      { name: 'Walking (Incline)', sets: 1, reps: '15 min', rest: '-', icon: 'directions-walk' },
      { name: 'Bodyweight Squats', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Glute Bridges', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Step-ups', sets: 3, reps: '10 each', rest: '60s', icon: 'fitness-center' },
      { name: 'Stretching', sets: 1, reps: '5 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Friday',
    focus: 'Cardio Focus',
    duration: '40 min',
    exercises: [
      { name: 'Brisk Walking', sets: 1, reps: '25 min', rest: '-', icon: 'directions-walk' },
      { name: 'Jumping Jacks (Low Impact)', sets: 3, reps: '15', rest: '45s', icon: 'accessibility' },
      { name: 'Mountain Climbers (Slow)', sets: 3, reps: '10', rest: '45s', icon: 'fitness-center' },
      { name: 'Cool Down', sets: 1, reps: '5 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Saturday',
    focus: 'Full Body Light',
    duration: '40 min',
    exercises: [
      { name: 'Cycling', sets: 1, reps: '15 min', rest: '-', icon: 'pedal-bike' },
      { name: 'Wall Push-ups', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Bodyweight Squats', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Plank (Knees)', sets: 3, reps: '20s', rest: '30s', icon: 'fitness-center' },
      { name: 'Stretching', sets: 1, reps: '5 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Sunday',
    focus: 'Rest Day',
    duration: '20 min',
    exercises: [
      { name: 'Light Walk / Stretching', sets: 1, reps: '20 min', rest: '-', icon: 'self-improvement' },
    ],
  },
];

const NORMAL_PLAN = [
  {
    day: 'Monday',
    focus: 'Chest + Triceps',
    duration: '55 min',
    exercises: [
      { name: 'Push-ups', sets: 4, reps: '15', rest: '60s', icon: 'fitness-center' },
      { name: 'Dumbbell Bench Press', sets: 4, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Incline Dumbbell Fly', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Tricep Dips', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Tricep Pushdowns', sets: 3, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Treadmill Run', sets: 1, reps: '10 min', rest: '-', icon: 'directions-run' },
    ],
  },
  {
    day: 'Tuesday',
    focus: 'Back + Biceps',
    duration: '55 min',
    exercises: [
      { name: 'Pull-ups / Lat Pulldown', sets: 4, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Bent Over Rows', sets: 4, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Dumbbell Curls', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Hammer Curls', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Cycling', sets: 1, reps: '10 min', rest: '-', icon: 'pedal-bike' },
    ],
  },
  {
    day: 'Wednesday',
    focus: 'Cardio + Core',
    duration: '45 min',
    exercises: [
      { name: 'Running', sets: 1, reps: '20 min', rest: '-', icon: 'directions-run' },
      { name: 'Plank', sets: 3, reps: '45s', rest: '30s', icon: 'fitness-center' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20', rest: '30s', icon: 'fitness-center' },
      { name: 'Russian Twists', sets: 3, reps: '20', rest: '30s', icon: 'fitness-center' },
      { name: 'Leg Raises', sets: 3, reps: '15', rest: '30s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Thursday',
    focus: 'Shoulders + Traps',
    duration: '50 min',
    exercises: [
      { name: 'Overhead Press', sets: 4, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Lateral Raises', sets: 4, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Front Raises', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Shrugs', sets: 3, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Jump Rope', sets: 1, reps: '10 min', rest: '-', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Friday',
    focus: 'Legs',
    duration: '55 min',
    exercises: [
      { name: 'Barbell Squats', sets: 4, reps: '12', rest: '90s', icon: 'fitness-center' },
      { name: 'Leg Press', sets: 4, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Romanian Deadlifts', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Leg Curls', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Calf Raises', sets: 4, reps: '15', rest: '30s', icon: 'fitness-center' },
      { name: 'Treadmill Walk', sets: 1, reps: '10 min', rest: '-', icon: 'directions-walk' },
    ],
  },
  {
    day: 'Saturday',
    focus: 'Full Body + HIIT',
    duration: '50 min',
    exercises: [
      { name: 'Burpees', sets: 4, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Dumbbell Lunges', sets: 3, reps: '12 each', rest: '60s', icon: 'fitness-center' },
      { name: 'Push-ups', sets: 3, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Kettlebell Swings', sets: 3, reps: '15', rest: '45s', icon: 'fitness-center' },
      { name: 'Box Jumps', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Cool Down', sets: 1, reps: '5 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Sunday',
    focus: 'Rest / Light Activity',
    duration: '30 min',
    exercises: [
      { name: 'Light Walk or Yoga', sets: 1, reps: '30 min', rest: '-', icon: 'self-improvement' },
    ],
  },
];

const UNDERWEIGHT_PLAN = [
  {
    day: 'Monday',
    focus: 'Chest + Triceps (Heavy)',
    duration: '60 min',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', rest: '90s', icon: 'fitness-center' },
      { name: 'Incline Dumbbell Press', sets: 4, reps: '10', rest: '90s', icon: 'fitness-center' },
      { name: 'Cable Flyes', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Close Grip Bench Press', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Tuesday',
    focus: 'Back + Biceps (Heavy)',
    duration: '60 min',
    exercises: [
      { name: 'Deadlifts', sets: 4, reps: '6-8', rest: '120s', icon: 'fitness-center' },
      { name: 'Barbell Rows', sets: 4, reps: '10', rest: '90s', icon: 'fitness-center' },
      { name: 'Lat Pulldowns', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Barbell Curls', sets: 3, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Concentration Curls', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Wednesday',
    focus: 'Rest / Light Stretching',
    duration: '20 min',
    exercises: [
      { name: 'Full Body Stretching', sets: 1, reps: '20 min', rest: '-', icon: 'self-improvement' },
    ],
  },
  {
    day: 'Thursday',
    focus: 'Shoulders + Traps (Heavy)',
    duration: '55 min',
    exercises: [
      { name: 'Military Press', sets: 4, reps: '8-10', rest: '90s', icon: 'fitness-center' },
      { name: 'Arnold Press', sets: 4, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Lateral Raises', sets: 4, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Upright Rows', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Heavy Shrugs', sets: 4, reps: '12', rest: '60s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Friday',
    focus: 'Legs (Heavy)',
    duration: '60 min',
    exercises: [
      { name: 'Barbell Squats', sets: 5, reps: '8', rest: '120s', icon: 'fitness-center' },
      { name: 'Leg Press', sets: 4, reps: '10', rest: '90s', icon: 'fitness-center' },
      { name: 'Romanian Deadlifts', sets: 4, reps: '10', rest: '90s', icon: 'fitness-center' },
      { name: 'Leg Extensions', sets: 3, reps: '12', rest: '60s', icon: 'fitness-center' },
      { name: 'Standing Calf Raises', sets: 4, reps: '15', rest: '45s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Saturday',
    focus: 'Arms + Core',
    duration: '50 min',
    exercises: [
      { name: 'EZ Bar Curls', sets: 4, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Skull Crushers', sets: 4, reps: '10', rest: '60s', icon: 'fitness-center' },
      { name: 'Hammer Curls', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Rope Pushdowns', sets: 3, reps: '12', rest: '45s', icon: 'fitness-center' },
      { name: 'Plank', sets: 3, reps: '45s', rest: '30s', icon: 'fitness-center' },
      { name: 'Cable Crunches', sets: 3, reps: '15', rest: '30s', icon: 'fitness-center' },
    ],
  },
  {
    day: 'Sunday',
    focus: 'Rest Day',
    duration: '15 min',
    exercises: [
      { name: 'Light Walk / Mobility Work', sets: 1, reps: '15 min', rest: '-', icon: 'self-improvement' },
    ],
  },
];

export const getWorkoutPlan = (bmiCategory) => {
  switch (bmiCategory) {
    case 'Overweight':
    case 'Obese':
      return {
        plan: OVERWEIGHT_OBESE_PLAN,
        type: 'Cardio Focus + Beginner Strength',
        description: 'More cardio with beginner-friendly strength training to build a solid foundation.',
      };
    case 'Underweight':
      return {
        plan: UNDERWEIGHT_PLAN,
        type: 'Heavy Strength Training',
        description: 'Focus on compound lifts and heavy weights with minimal cardio to maximize muscle gain.',
      };
    case 'Normal':
    default:
      return {
        plan: NORMAL_PLAN,
        type: 'Balanced Strength + Cardio',
        description: 'A well-rounded program combining strength training with cardio for overall fitness.',
      };
  }
};
