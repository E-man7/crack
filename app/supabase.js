import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://mgtkcujpiitudmzldjsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndGtjdWpwaWl0dWRtemxkanN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Mzc3NzUsImV4cCI6MjA1MzMxMzc3NX0.xUaBdORFXZOhL0xWq-WJNqRFgnLXxt7GjSP9pugsrb8';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase; // Ensure this is exported as default