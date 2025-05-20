import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, Image, FlatList, TouchableOpacity, 
  Modal, ActivityIndicator, Alert, Switch, StatusBar 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import supabase from '../../supabase';
import ImageHandler from '../../ImageHandler';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tscNumber, setTscNumber] = useState(null);
  const [lessonSchedule, setLessonSchedule] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userType, setUserType] = useState('teacher');
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [randomSubject, setRandomSubject] = useState('');
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [lessonRemindersEnabled, setLessonRemindersEnabled] = useState(true);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notification Permission',
          'Please enable notifications to receive lesson reminders',
          [{ text: 'OK' }]
        );
      }
    };
    
    requestPermissions();
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Handle notification when app is in foreground
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Schedule lesson reminders
  useEffect(() => {
    if (!lessonRemindersEnabled || !lessonSchedule.length || !isFocused) return;

    const scheduleReminders = async () => {
      // Cancel all existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule new notifications for upcoming lessons
      lessonSchedule.forEach(lesson => {
        const now = new Date();
        const [hours, minutes] = lesson.start_time.split(':').map(Number);
        
        // Get the next occurrence of this lesson day
        const lessonDay = getDayNumber(lesson.day);
        const lessonDate = new Date();
        
        // Set to next occurrence of this day
        lessonDate.setDate(now.getDate() + ((lessonDay - now.getDay() + 7) % 7));
        lessonDate.setHours(hours, minutes - 5, 0, 0); // 5 minutes before lesson
        
        // If the time has already passed today, schedule for next week
        if (lessonDate < now) {
          lessonDate.setDate(lessonDate.getDate() + 7);
        }

        // Schedule notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Upcoming Lesson',
            body: `Your ${lesson.subject} class starts in 5 minutes`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: lessonDate,
            repeats: true, // Repeat weekly
          },
        });
      });
    };

    scheduleReminders();

    return () => {
      if (lessonRemindersEnabled) {
        Notifications.cancelAllScheduledNotificationsAsync();
      }
    };
  }, [lessonSchedule, lessonRemindersEnabled, isFocused]);

  // Helper function to convert day name to number (0-6)
  const getDayNumber = (dayName) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.findIndex(day => day.toLowerCase() === dayName.toLowerCase());
  };

  // Fetch user preferences (including reminder settings)
  useEffect(() => {
    if (!tscNumber) return;

    const fetchUserPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const { data, error } = await supabase
          .from('user_preferences')
          .select('lesson_reminders')
          .eq('user_id', tscNumber)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
        
        // Set to stored preference or default to true
        setLessonRemindersEnabled(data?.lesson_reminders ?? true);
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        Alert.alert('Error', 'Failed to load user preferences');
      } finally {
        setLoadingPreferences(false);
      }
    };

    fetchUserPreferences();
  }, [tscNumber]);

  // Save user preferences when they change
  useEffect(() => {
    if (!tscNumber || loadingPreferences) return;

    const saveUserPreferences = async () => {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: tscNumber,
            lesson_reminders: lessonRemindersEnabled,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving user preferences:', error);
        // Revert the toggle if save fails
        setLessonRemindersEnabled(prev => !prev);
        Alert.alert('Error', 'Failed to save reminder preference');
      }
    };

    saveUserPreferences();
  }, [lessonRemindersEnabled, tscNumber]);

  // Fetch user session
  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
          setTscNumber(user.user_metadata?.tsc_number);
          setAvatarUrl(user.user_metadata?.avatar_url);
          setUserType(user.user_metadata?.user_type || 'teacher');
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        Alert.alert('Error', 'Failed to load user session. Please try again later.');
      }
    };

    fetchUserSession();
  }, []);

  // Fetch teacher data
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
        Alert.alert('Error', 'Failed to load teacher profile');
      } finally {
        setLoading(false);
      }
    };

    if (userType === 'teacher') {
      fetchTeacherData();
    }
  }, [tscNumber, userType]);

  // Fetch lesson schedule
  useEffect(() => {
    const fetchLessonSchedule = async () => {
      try {
        setScheduleLoading(true);
        const { data: schedules, error: schedulesError } = await supabase
          .from('lesson_schedule')
          .select('day, start_time, end_time, subject')
          .order('day', { ascending: true })
          .order('start_time', { ascending: true });

        if (schedulesError) throw schedulesError;
        setLessonSchedule(schedules);
      } catch (error) {
        console.error('Error fetching lesson schedule:', error);
        setScheduleError(error.message);
      } finally {
        setScheduleLoading(false);
      }
    };

    if (userType === 'teacher') {
      fetchLessonSchedule();
    }
  }, [userType]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('subject_name')
          .order('subject_name', { ascending: true });

        if (error) throw error;
        
        const subjectList = data.map(subject => subject.subject_name);
        setSubjects(subjectList);
        
        if (subjectList.length > 0) {
          const randomIndex = Math.floor(Math.random() * subjectList.length);
          setRandomSubject(subjectList[randomIndex]);
          setSelectedSubject(subjectList[randomIndex]);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        Alert.alert('Error', 'Failed to load subjects');
      }
    };

    if (userType === 'teacher') {
      fetchSubjects();
    }
  }, [userType]);

  // Fetch subject performance
  useEffect(() => {
    if (!selectedSubject || !teacher?.class_teacher) return;

    const fetchSubjectPerformance = async () => {
      try {
        setAnalysisLoading(true);
        
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('adm_no')
          .eq('class', teacher.class_teacher);

        if (studentsError) throw studentsError;
        if (!students.length) return;

        const studentAdmNos = students.map(student => student.adm_no);

        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('score, period')
          .in('adm_no', studentAdmNos)
          .eq('report_type', selectedSubject);

        if (reportsError) throw reportsError;
        if (!reports.length) return;

        const periodData = {};
        reports.forEach(report => {
          if (!periodData[report.period]) {
            periodData[report.period] = { total: 0, count: 0 };
          }
          periodData[report.period].total += report.score;
          periodData[report.period].count += 1;
        });

        const performanceData = Object.keys(periodData).map(period => ({
          period,
          averageScore: Math.round(periodData[period].total / periodData[period].count)
        }));

        setSubjectPerformance(performanceData);
      } catch (error) {
        console.error('Error fetching subject performance:', error);
        Alert.alert('Error', 'Failed to load subject performance data');
      } finally {
        setAnalysisLoading(false);
      }
    };

    fetchSubjectPerformance();
  }, [selectedSubject, teacher?.class_teacher]);

  // Fetch avatars
  const fetchAvatars = async () => {
    try {
      setLoadingAvatars(true);
      const folder = userType === 'teacher' ? 'teachers' : 'students';
      
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      const avatarUrls = data.map(item => {
        const { data: { publicUrl } } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(`${folder}/${item.name}`);
        
        return {
          name: item.name,
          uri: publicUrl
        };
      });

      setAvatars(avatarUrls);
    } catch (error) {
      console.error('Error fetching avatars:', error);
      Alert.alert('Error', 'Failed to load avatar options');
    } finally {
      setLoadingAvatars(false);
    }
  };

  // Image handling functions
  const pickFromGallery = async () => {
    try {
      setUploading(true);
      const result = await ImageHandler.pickProfileFile(tscNumber, userType);
    
      if (result.success) {
        await updateAvatar(result.publicUrl);
        setShowImagePickerModal(false);
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error in image upload:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setUploading(true);
      const result = await ImageHandler.takeProfilePhoto(tscNumber, userType);
    
      if (result.success) {
        await updateAvatar(result.publicUrl);
        setShowImagePickerModal(false);
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error in image upload:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const selectAvatar = async (avatarUrl) => {
    try {
      setUploading(true);
      await updateAvatar(avatarUrl);
      setShowImagePickerModal(false);
    } catch (error) {
      console.error('Error selecting avatar:', error);
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setUploading(false);
    }
  };

  const updateAvatar = async (url) => {
    const newAvatarUrl = `${url}?t=${Date.now()}`;
    setAvatarUrl(newAvatarUrl);
    
    const { error } = await supabase.auth.updateUser({
      data: { 
        avatar_url: newAvatarUrl,
        user_type: userType
      }
    });
    
    if (error) throw error;
    
    Alert.alert('Success', 'Profile picture updated successfully!');
  };

  // Render functions
  const renderLessonItem = ({ item }) => (
    <View style={styles.lessonItem}>
      <View style={styles.lessonHeader}>
        <Text style={styles.lessonDay}>{item.day}</Text>
        <Text style={styles.lessonSubject}>{item.subject}</Text>
      </View>
      <Text style={styles.lessonTime}>{item.start_time} - {item.end_time}</Text>
    </View>
  );

  const renderNotificationCard = () => (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Text style={styles.notificationCardTitle}>
        {userType === 'teacher' ? 'Make an Announcement' : 'View Announcements'}
      </Text>
      <Text style={styles.notificationCardText}>
        {userType === 'teacher' 
          ? 'Click here to send notifications to students or classes.'
          : 'Click here to view school announcements.'}
      </Text>
    </TouchableOpacity>
  );

  const renderProfileInfo = () => {
    if (userType === 'teacher') {
      return (
        <>
          <Text style={styles.label}>Name: <Text style={styles.value}>{teacher?.name || 'N/A'}</Text></Text>
          <Text style={styles.label}>TSC No: <Text style={styles.value}>{teacher?.tsc_number || 'N/A'}</Text></Text>
          <Text style={styles.label}>Class Teacher: <Text style={styles.value}>{teacher?.class_teacher || 'N/A'}</Text></Text>
        </>
      );
    } else {
      return (
        <>
          <Text style={styles.label}>Parent Name: <Text style={styles.value}>{teacher?.name || 'N/A'}</Text></Text>
          <Text style={styles.label}>Student: <Text style={styles.value}>[Student Name]</Text></Text>
          <Text style={styles.label}>Class: <Text style={styles.value}>[Student Class]</Text></Text>
        </>
      );
    }
  };

  const renderSubjectAnalysis = () => {
    if (!teacher?.class_teacher) return null;
  
    const chartData = {
      labels: subjectPerformance.map(item => item.period),
      datasets: [{
        data: subjectPerformance.map(item => item.averageScore),
        color: (opacity = 1) => `rgba(128, 128, 128, ${opacity})`,
        strokeWidth: 2
      }]
    };
  
    return (
      <View style={styles.analysisSection}>
        <Text style={styles.header}>Subject Performance Analysis</Text>
        <View style={styles.subjectPickerContainer}>
          <Text style={styles.pickerLabel}>Select Subject:</Text>
          <Picker
            selectedValue={selectedSubject}
            style={styles.subjectPicker}
            onValueChange={(itemValue) => setSelectedSubject(itemValue)}
            mode="dropdown"
          >
            <Picker.Item label="Select a subject" value="" />
            {subjects.map(subject => (
              <Picker.Item key={subject} label={subject} value={subject} />
            ))}
          </Picker>
        </View>
  
        {analysisLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : subjectPerformance.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={450}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(3, 127, 140, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(3, 127, 140, ${opacity})`,
                style: {
                  borderRadius: 12
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#037f8c'
                },
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: 'rgba(3, 127, 140, 0.2)'
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 12,
                backgroundColor: '#FFFFFF'
              }}
            />
            <Text style={styles.chartNote}>
              {selectedSubject === randomSubject ? (
                <>
                  Today's featured subject: <Text style={{fontWeight: 'bold'}}>{selectedSubject}</Text> in {teacher.class_teacher}
                </>
              ) : (
                <>
                  Average scores for <Text style={{fontWeight: 'bold'}}>{selectedSubject}</Text> in {teacher.class_teacher}
                </>
              )}
            </Text>
          </View>
        ) : selectedSubject ? (
          <Text style={styles.value}>
            {selectedSubject === randomSubject ? (
              `No performance data available for today's featured subject: ${selectedSubject}`
            ) : (
              `No performance data available for ${selectedSubject}`
            )}
          </Text>
        ) : (
          <Text style={styles.value}>Please select a subject to view performance</Text>
        )}
      </View>
    );
  };

  const renderScheduleSection = () => (
    <View style={styles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.header}>Lesson Schedule</Text>
        <View style={styles.reminderToggleContainer}>
          <Text style={styles.reminderToggleText}>Reminders</Text>
          {loadingPreferences ? (
            <ActivityIndicator size="small" color="#037f8c" />
          ) : (
            <Switch
              value={lessonRemindersEnabled}
              onValueChange={() => setLessonRemindersEnabled(prev => !prev)}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={lessonRemindersEnabled ? "#037f8c" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
          )}
        </View>
      </View>
      
      {scheduleLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : scheduleError ? (
        <Text style={styles.errorText}>Error loading schedule: {scheduleError}</Text>
      ) : lessonSchedule.length > 0 ? (
        <View style={styles.scheduleList}>
          {lessonSchedule.map((item) => (
            <View key={`${item.day}-${item.start_time}-${item.subject}`}>
              {renderLessonItem({ item })}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.value}>No lesson schedule found</Text>
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#49AAAE', '#AEF5F8']} style={styles.container}>
      <StatusBar backgroundColor="#037f8c" barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Add Welcome Message Here */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Welcome Back Teacher <Text style={styles.teacherName}>{teacher?.name?.split(' ')[0] || ''}</Text>, Ready to inspire?
          </Text>
        </View>

        <View style={styles.profileSection}>  
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={styles.profileContent}>
              <TouchableOpacity onPress={() => {
                fetchAvatars();
                setShowImagePickerModal(true);
              }}>
                <View style={styles.imageContainer}>
                  {uploading ? (
                    <View style={[styles.profileImage, styles.uploadingOverlay]}>
                      <ActivityIndicator size="large" color="#FFF" />
                    </View>
                  ) : (
                    <Image
                      source={{ 
                        uri: avatarUrl || 'https://via.placeholder.com/150',
                        cache: 'reload'
                      }}
                      style={styles.profileImage}
                      onError={() => setAvatarUrl(null)}
                    />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.infoContainer}>
                {renderProfileInfo()}
              </View>
            </View>
          )}
        </View>

        {/* Scrollable content */}
        <FlatList
          data={[{}]}
          renderItem={() => (
            <>
              {userType === 'teacher' && (
                <>
                  {renderScheduleSection()}
                  {renderSubjectAnalysis()}
                </>
              )}
              <View style={styles.announcementCardContainer}>
                {renderNotificationCard()}
              </View>
            </>
          )}
          keyExtractor={() => 'main-content'}
          contentContainerStyle={styles.scrollContent}
        />

        {/* Image Picker Modal */}
        <Modal
          visible={showImagePickerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowImagePickerModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose Profile Image</Text>
              
              <TouchableOpacity style={styles.modalOption} onPress={pickFromGallery}>
                <Icon name="photo-library" size={24} color="#037f8c" />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
                <Icon name="camera-alt" size={24} color="#037f8c" />
                <Text style={styles.modalOptionText}>Take a Photo</Text>
              </TouchableOpacity>
              
              <Text style={styles.avatarSectionTitle}>Or select an avatar:</Text>
              
              {loadingAvatars ? (
                <ActivityIndicator size="small" color="#037f8c" />
              ) : (
                <FlatList
                  data={avatars}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectAvatar(item.uri)}>
                      <Image source={{ uri: item.uri }} style={styles.avatarImage} />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.avatarList}
                />
              )}
              
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setShowImagePickerModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    fontFamily: 'CaliforniaFB', 
  },
  safeArea: {
    flex: 1,
    fontFamily: 'CaliforniaFB',
  },
  headerContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 15,
    borderBottomColor: 'rgba(44, 62, 80, 0.1)',
    backgroundColor: 'transparent',
  },
  dashboardHeader: {
    fontSize: 26,
    color: '#212529',
    fontFamily: 'CaliforniaFB',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileSection: {
    backgroundColor: '#037f8c',
    padding: 26,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 60,
    borderRadius: 30,
    marginHorizontal: 20,
    overflow: 'hidden',
    marginTop: 12,
    fontFamily: 'CaliforniaFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  scheduleSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 300,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  analysisSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  header: {
    fontSize: 20,
    marginBottom: 12,
    color: '#037f8c',
    fontFamily: 'CaliforniaFB', 
    letterSpacing: 0.3,
    position: 'relative',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(3, 127, 140, 0.3)',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 16,
    position: 'relative',
    marginBottom: 15,
    marginTop: -15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DDD',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 45,
  },
  infoContainer: {
    flex: 1,
    marginBottom: 15,
    marginTop: -15,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#FFF',
    fontFamily: 'CaliforniaFB', 
  },
  value: {
    color: '#FFF',
    fontFamily: 'CaliforniaFB',
    fontSize: 20,
    fontWeight: '800',
  },
  lessonItem: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 80,
    borderLeftWidth: 4,
    borderLeftColor: '#037f8c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lessonDay: {
    fontSize: 16,
    color: '#037f8c',
    marginBottom: 4,
    fontFamily: 'CaliforniaFB', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lessonSubject: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'CaliforniaFB',
    fontWeight: '600',
  },
  lessonTime: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'CaliforniaFB',
    fontStyle: 'italic',
  },
  scheduleList: {
    paddingBottom: 8,
  },
  subjectPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(3, 127, 140, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(3, 127, 140, 0.3)',
  },
  pickerLabel: {
    color: '#037f8c',
    marginRight: 10,
    fontSize: 16,
    fontFamily: 'CaliforniaFB', 
    opacity: 0.9,
  },
  subjectPicker: {
    flex: 1,
    height: 50,
    color: '#037f8c',
    backgroundColor: 'transparent',
    borderRadius: 8,
    fontFamily: 'CaliforniaFB',
  },
  chartNote: {
    color: '#037f8c',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'CaliforniaFB',
    lineHeight: 20,
  },
  notificationCardTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#037f8c',
    fontFamily: 'CaliforniaFB',
    letterSpacing: 0.3,
  },
  notificationCardText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'CaliforniaFB',
    lineHeight: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'CaliforniaFB',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    color: '#037f8c',
    fontFamily: 'CaliforniaFB', // Changed font
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    marginLeft: 15,
    fontSize: 16,
    fontFamily: 'CaliforniaFB', // Changed font
    color: '#2C3E50',
  },
  avatarSectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    fontSize: 16,
    color: '#037f8c',
    fontFamily: 'CaliforniaFB', // Changed font
    textAlign: 'center',
  },
  avatarList: {
    paddingVertical: 10,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#037f8c',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#037f8c',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'CaliforniaFB',
    letterSpacing: 0.5,
  },
  reminderToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderToggleText: {
    marginRight: 8,
    color: '#037f8c',
    fontSize: 14,
    fontFamily: 'CaliforniaFB', 
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 10,
    marginBottom: -10,
  },
  welcomeText: {
    fontSize: 17,
    color: '#FFF',
    fontFamily: 'CaliforniaFB',
    textAlign: 'left',
    lineHeight: 26,
  },
  teacherName: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
});

export default ProfileScreen;