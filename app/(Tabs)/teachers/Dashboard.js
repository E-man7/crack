import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, FlatList, TouchableOpacity, Modal, Button, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import supabase from '../../supabase';
import ImageHandler from '../../ImageHandler';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = () => {
  const navigation = useNavigation();
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

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
          setTscNumber(user.user_metadata?.tsc_number);
          setAvatarUrl(user.user_metadata?.avatar_url);
          setUserType(user.user_metadata?.user_type || 'teacher');
          console.log('User session loaded:', user);
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        Alert.alert('Error', 'Failed to load user session');
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
        Alert.alert('Error', 'Failed to load teacher profile');
      } finally {
        setLoading(false);
      }
    };

    if (userType === 'teacher') {
      fetchTeacherData();
    }
  }, [tscNumber, userType]);

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
        
        // Set a random subject if there are subjects available
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

  const renderLessonItem = ({ item }) => (
    <View style={styles.lessonItem}>
      <Text style={styles.lessonDay}>{item.day}</Text>
      <Text style={styles.lessonSubject}>{item.subject}</Text>
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
                backgroundColor: '#0A71F2',
                backgroundGradientFrom: '#0A71F2',
                backgroundGradientTo: '#0A71F2',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#ffa726'
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Section (non-scrollable) */}
      <View style={styles.profileSection}>  
        <Text style={styles.header}>Profile</Text>
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
        data={[{}]} // Dummy data for single item
        renderItem={() => (
          <>
            {userType === 'teacher' && (
              <>
                <View style={styles.scheduleSection}>
                  <Text style={styles.header}>Lesson Schedule</Text>
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

                {renderSubjectAnalysis()}
              </>
            )}
            {renderNotificationCard()}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileSection: {
    backgroundColor: '#0A71F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleSection: {
    backgroundColor: '#0A71F2',
    padding: 20, // Increased padding
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 300, // Added minimum height
  },
  analysisSection: {
    backgroundColor: '#0A71F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 20,
    marginBottom: 12,
    color: '#FFF',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DDD',
  },
  uploadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#FFF',
  },
  value: {
    color: '#FFF',
  },
  lessonItem: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16, // Increased padding
    borderRadius: 8,
    marginBottom: 12, // Increased margin
    minHeight: 80, // Added minimum height
  },
  lessonDay: {
    fontSize: 16,
    color: '#0A71F2',
    marginBottom: 4,
  },
  lessonSubject: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 14,
    color: '#666',
  },
  scheduleList: {
    paddingBottom: 8,
  },
  subjectPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerLabel: {
    color: '#FFF',
    marginRight: 10,
    fontSize: 16,
  },
  subjectPicker: {
    flex: 1,
    height: 50,
    color: '#FFF',
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  chartNote: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationCardTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#0A71F2',
  },
  notificationCardText: {
    fontSize: 14,
    color: '#555',
  },
  errorText: {
    color: '#FFCCCB',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#037f8c',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalOptionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  avatarSectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    fontSize: 16,
    color: '#037f8c',
  },
  avatarList: {
    paddingVertical: 10,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#037f8c',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#037f8c',
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
export default ProfileScreen;