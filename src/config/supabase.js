import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vjnixyivpkrvdoqcagrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbml4eWl2cGtydmRvcWNhZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NjYsImV4cCI6MjA4OTMxODc2Nn0.Eri4EhIB4PBPObQIKhxPoO6Czu64yQG9MD5hZL3DLss';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
cd