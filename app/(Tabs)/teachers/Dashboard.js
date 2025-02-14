import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import supabase from '../../supabase';

const App = () => {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tscNumber, setTscNumber] = useState(null);

  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTscNumber(user.user_metadata?.tsc_number);
      }
    };

    fetchUserSession();
  }, []);

  useEffect(() => {
    if (!tscNumber) return; // Wait for tscNumber to be available

    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('teachers')
          .select('name, tsc_number, class_teacher')
          .eq('tsc_number', tscNumber)
          .single();

        if (error) throw error;
        setTeacher(data);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [tscNumber]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.header}>Profile</Text>
        {loading ? (
          <Text style={styles.value}>Loading...</Text>
        ) : teacher ? (
          <View style={styles.profileContent}>
            {/* Profile Image Placeholder */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: 'https://via.placeholder.com/80' }} // Replace with actual image source
                style={styles.profileImage}
              />
            </View>

            {/* Teacher Information */}
            <View style={styles.infoContainer}>
              <Text style={styles.label}>Name: <Text style={styles.value}>{teacher.name}</Text></Text>
              <Text style={styles.label}>TSC No: <Text style={styles.value}>{teacher.tsc_number}</Text></Text>
              <Text style={styles.label}>Class Teacher: <Text style={styles.value}>{teacher.class_teacher}</Text></Text>
            </View>
          </View>
        ) : (
          <Text style={styles.value}>No data found</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F0F0F0' },
  profileSection: { backgroundColor: '#0A71F2', padding: 16, borderRadius: 8, marginBottom: 16 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#FFF' },

  // Profile Layout
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { marginRight: 12 }, 
  profileImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DDD' },

  // Text Styling
  infoContainer: { flex: 1 }, 
  label: { fontSize: 16, marginBottom: 8, color: '#FFF' },
  value: { fontWeight: 'normal', color: '#FFF' },
});

export default App;
