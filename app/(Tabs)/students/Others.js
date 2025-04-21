import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import supabase from '../../supabase';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

const ExtracurricularScreen = () => {
  const [selectedActivity, setSelectedActivity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user?.user_metadata?.adm_no || '')
        .single();

      if (studentError) throw studentError;
      if (!studentData) throw new Error('Student not found');

      setStudentInfo(studentData);
    } catch (error) {
      console.error('Error fetching student data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load student information',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleEnroll = async () => {
    if (!selectedActivity) {
      Alert.alert('Error', 'Please select an activity first');
      return;
    }

    if (!studentInfo) {
      Alert.alert('Error', 'Student data not loaded yet');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create the notification for the class teacher
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Enrollment to a club',
          content: `Student ${studentInfo.name} (${studentInfo.adm_no}) wants to enroll in ${selectedActivity}`,
          recipient_type: 'class_teacher',
          recipient_id: studentInfo.class,
        });

      if (notificationError) throw notificationError;

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Enrollment request sent to your class teacher',
        position: 'top',
      });
      setSelectedActivity('');
    } catch (error) {
      console.error('Error enrolling:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send enrollment request',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  if (!studentInfo) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF5252" />
        <Text style={styles.errorText}>Failed to load student data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStudentData}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with menu icon */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('TripMonitor')}
          style={styles.menuButton}
        >
          <MaterialIcons name="menu" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Extracurricular</Text>
        <View style={styles.menuButtonPlaceholder} />
      </View>

      {/* Rest of the content remains the same */}
      <Text style={styles.subHeader}>Your Extracurriculars</Text>
      
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={styles.cell}>Piano</Text>
          <Text style={styles.cell}>Week 1</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Group Lessons</Text>
          <Text style={styles.cell}></Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Chess</Text>
          <Text style={styles.cell}>Week 2</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Beginners level</Text>
          <Text style={styles.cell}></Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Drama</Text>
          <Text style={styles.cell}>Week 4</Text>
        </View>
      </View>

      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360/Ai.home.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360/C2.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360/intro.home.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360/Rob.kids.jpg' }}
        />
      </View>

      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedActivity}
          onValueChange={(itemValue) => setSelectedActivity(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select an activity" value="" />
          <Picker.Item label="Piano" value="Piano" />
          <Picker.Item label="Chess" value="Chess" />
          <Picker.Item label="Drama" value="Drama" />
          <Picker.Item label="Group Lessons" value="Group Lessons" />
        </Picker>
      </View>

      <TouchableOpacity 
        style={[styles.button, (isLoading || !selectedActivity) && styles.disabledButton]} 
        onPress={handleEnroll}
        disabled={isLoading || !selectedActivity}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enroll to a new club</Text>
        )}
      </TouchableOpacity>

      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF5252',
    marginVertical: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#037f8c',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
    marginBottom: 10,
  },
  menuButton: {
    padding: 5,
  },
  menuButtonPlaceholder: {
    width: 28, // Same as menu icon for balance
  },
  header: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    textAlign: 'center',
    flex: 1,
  },
  subHeader: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  table: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  cell: {
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#0A71F2',
    padding: 40,
    borderRadius: 8,
    marginBottom: 30,
  },
  image: {
    width: '47%',
    height: 170,
    marginBottom: 30,
    borderRadius: 8,
  },
  dropdownContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#037f8c',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default ExtracurricularScreen;