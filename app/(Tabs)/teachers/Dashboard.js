import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, FlatList, TouchableOpacity, Alert, Modal, Button } from 'react-native';
import supabase from '../../supabase';
import { pickImage, takePhoto } from '../../ImageHandler'; // Import the image handler functions

const App = () => {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tscNumber, setTscNumber] = useState(null);
  const [lessonSchedule, setLessonSchedule] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false); // State to control the modal

  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTscNumber(user.user_metadata?.tsc_number);
        setAvatarUrl(user.user_metadata?.avatar_url); // Assuming avatar_url is stored in user_metadata
        console.log('User Metadata:', user.user_metadata); // Debugging log
      }
    };

    fetchUserSession();
  }, []);

  useEffect(() => {
    if (!tscNumber) return;

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

  useEffect(() => {
    if (!tscNumber) return;

    const fetchLessonSchedule = async () => {
      try {
        const { data: lessonPlans, error: lessonPlansError } = await supabase
          .from('lesson_plans')
          .select('id')
          .eq('teacher_tsc_number', tscNumber);

        if (lessonPlansError) throw lessonPlansError;

        if (lessonPlans.length > 0) {
          const lessonPlanIds = lessonPlans.map((plan) => plan.id);
          const { data: schedules, error: schedulesError } = await supabase
            .from('lesson_schedule')
            .select('day, start_time, end_time, subject')
            .in('lesson_plan_id', lessonPlanIds);

          if (schedulesError) throw schedulesError;
          setLessonSchedule(schedules);
        }
      } catch (error) {
        console.error('Error fetching lesson schedule:', error);
      }
    };

    fetchLessonSchedule();
  }, [tscNumber]);

  const renderLessonItem = ({ item }) => (
    <View style={styles.lessonItem}>
      <Text style={styles.lessonText}>Day: {item.day}</Text>
      <Text style={styles.lessonText}>Subject: {item.subject}</Text>
      <Text style={styles.lessonText}>Time: {item.start_time} - {item.end_time}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.header}>Profile</Text>
        {loading ? (
          <Text style={styles.value}>Loading...</Text>
        ) : teacher ? (
          <View style={styles.profileContent}>
            <TouchableOpacity onPress={() => setShowImageOptions(true)}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: avatarUrl || 'https://via.placeholder.com/80' }}
                  style={styles.profileImage}
                />
              </View>
            </TouchableOpacity>
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

      <View style={styles.scheduleSection}>
        <Text style={styles.header}>Lesson Schedule</Text>
        {lessonSchedule.length > 0 ? (
          <FlatList
            data={lessonSchedule}
            renderItem={renderLessonItem}
            keyExtractor={(item) => `${item.day}-${item.start_time}`} // Use a unique key
          />
        ) : (
          <Text style={styles.value}>No lesson schedule found</Text>
        )}
      </View>

      {/* Modal for Image Options */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Button title="Take Photo" onPress={async () => {
              await takePhoto(tscNumber, setAvatarUrl);
              setShowImageOptions(false);
            }} />
            <View style={{ marginVertical: 10 }} />
            <Button title="Upload Photo" onPress={async () => {
              await pickImage(tscNumber, setAvatarUrl);
              setShowImageOptions(false);
            }} />
            <View style={{ marginVertical: 10 }} />
            <Button title="Cancel" onPress={() => setShowImageOptions(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F0F0F0' },
  profileSection: { backgroundColor: '#0A71F2', padding: 16, borderRadius: 8, marginBottom: 16 },
  scheduleSection: { backgroundColor: '#0A71F2', padding: 16, borderRadius: 8, marginBottom: 16 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#FFF' },
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { marginRight: 12 },
  profileImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DDD' },
  infoContainer: { flex: 1 },
  label: { fontSize: 16, marginBottom: 8, color: '#FFF' },
  value: { fontWeight: 'normal', color: '#FFF' },
  lessonItem: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8 },
  lessonText: { fontSize: 14, color: '#000' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 10, width: '80%' },
});

export default App;