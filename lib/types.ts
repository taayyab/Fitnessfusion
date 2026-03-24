export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'member' | 'trainer' | 'admin';
  age: number | null;
  gender: 'male' | 'female' | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  bmi_category: string | null;
  daily_calories: number | null;
  goal: string | null;
  whatsapp: string | null;
  cnic: string | null;
  joining_date: string | null;
  blood_group: string | null;
  profession: string | null;
  profile_picture: string | null;
  push_token: string | null;
  is_active: boolean;
  membership_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  month: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
    profile_picture: string | null;
  };
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  status: 'present' | 'late' | 'absent';
  check_in_time: string | null;
  notes: string | null;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
    profile_picture: string | null;
  };
}

export interface Workout {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  exercises: Exercise[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string | null;
  target_bmi_category: string | null;
  created_at: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: string;
  rest?: string;
  notes?: string;
}

export interface Meal {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  meal_data: MealItem[];
  total_calories: number | null;
  goal_type: string | null;
  created_at: string;
}

export interface MealItem {
  name: string;
  type?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  description?: string;
}

export interface Assignment {
  id: string;
  trainer_id: string;
  member_id: string;
  type: 'workout' | 'meal';
  content: string | null;
  workout_id: string | null;
  meal_id: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  };
  workouts?: {
    title: string;
  };
  meals?: {
    title: string;
  };
}

export interface Progress {
  id: string;
  user_id: string;
  weight: number | null;
  bmi: number | null;
  notes: string | null;
  recorded_at: string;
  users?: {
    full_name: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  sent_by: string | null;
  read: boolean;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}
