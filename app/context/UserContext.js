import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase'; // Make sure this path is correct

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    setError(null);

    try {
      // First verify supabase is initialized
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Get authenticated user
      const { data: { user: authUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError) throw sessionError;

      console.log('Authenticated User:', authUser);

      if (!authUser) throw new Error('User not authenticated');

      // Fetch user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found in database');

      console.log('User Data:', userData);
      setUser(userData);

      // Fetch teacher details using TSC number
      if (userData?.tsc_number) {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('tsc_number', userData.tsc_number)
          .maybeSingle();

        if (teacherError) throw teacherError;

        console.log('Teacher Data:', teacherData);
        setTeacher(teacherData || null);
      } else {
        setTeacher(null);
      }
    } catch (error) {
      console.error('Error fetching user or teacher data:', error);
      setError(error.message || 'Failed to load user data.');
    }

    setLoading(false);
  };

  return (
    <UserContext.Provider value={{ user, teacher, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);