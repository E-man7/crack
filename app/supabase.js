import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://mgtkcujpiitudmzldjsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndGtjdWpwaWl0dWRtemxkanN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Mzc3NzUsImV4cCI6MjA1MzMxMzc3NX0.xUaBdORFXZOhL0xWq-WJNqRFgnLXxt7GjSP9pugsrb8';

// Initialize with explicit storage support
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Add these global options for better storage support
  db: {
    schema: 'public',
  },
  storage: {
    // Optional: You can add custom headers if needed
    headers: {
      'X-Client-Info': 'expo-app',
    }
  }
});

// Storage health check function
const checkStorage = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Storage connection error:', error);
      return false;
    }
    console.log('Available buckets:', data);
    return true;
  } catch (err) {
    console.error('Storage check failed:', err);
    return false;
  }
};

// Verify storage on startup
checkStorage().then(isReady => {
  console.log('Supabase storage ready:', isReady);
});

export default supabase;
