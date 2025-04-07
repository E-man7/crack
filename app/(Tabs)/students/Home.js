import React, { useEffect, useState } from 'react';
import {View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity,Linking, StatusBar, RefreshControl, useWindowDimensions, Alert} from 'react-native';
import supabase from '../../supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart, ProgressChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Modal, FlatList } from 'react-native';

const Home = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentImage, setStudentImage] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [scoresData, setScoresData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .single();

      if (studentError) throw studentError;

      if (studentData.profile_image) {
        setStudentImage({ uri: studentData.profile_image });
      }

      const { data: feeData, error: feeError } = await supabase
        .from('fees')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .maybeSingle();

      if (feeError) throw feeError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('attendance, month')
        .eq('adm_no', user.user_metadata.adm_no)
        .single();

      if (attendanceError) throw attendanceError;

      const combinedData = {
        ...studentData,
        total_fees: feeData?.total_fees || 0,
        paid_fees: feeData?.paid_fees || 0,
      };

      setUserData(combinedData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchScoresAndSubjects = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no);

      if (scoresError) throw scoresError;

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*');

      if (subjectsError) throw subjectsError;

      const mappedScores = subjectsData.map(subject => {
        const scoreData = scoresData.find(score => score.subject_id === subject.id);
        return {
          subjectName: subject.subject_name,
          score: scoreData ? scoreData.score : 0,
        };
      });

      setSubjects(subjectsData);
      setScoresData(mappedScores);
    } catch (error) {
      console.error('Error fetching scores and subjects:', error);
    }
  };

  const fetchAvatars = async () => {
    try {
      setLoadingAvatars(true);
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .list('students', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;

      const avatarUrls = await Promise.all(
        data.map(async (file) => {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(`students/${file.name}`);
          return {
            uri: publicUrl,
            name: file.name
          };
        })
      );

      setAvatars(avatarUrls);
    } catch (error) {
      console.error('Error fetching avatars:', error);
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchScoresAndSubjects();
    }
  }, [userData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const calculateAttendancePercentage = (attendanceDays) => {
    const totalDaysInMonth = 30;
    if (attendanceDays !== undefined && attendanceDays !== null) {
      return ((attendanceDays / totalDaysInMonth) * 100).toFixed(2);
    }
    return 'N/A';
  };

  const handleImagePress = async () => {
    setShowImagePickerModal(true);
    await fetchAvatars();
  };

  const pickFromGallery = async () => {
    setShowImagePickerModal(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need access to your photos to select an image');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0].uri) {
        await uploadAndUpdateProfileImage(pickerResult.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const takePhoto = async () => {
    setShowImagePickerModal(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need access to your camera to take a photo');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!cameraResult.canceled && cameraResult.assets && cameraResult.assets[0].uri) {
        await uploadAndUpdateProfileImage(cameraResult.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const selectAvatar = async (avatarUri) => {
    setShowImagePickerModal(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update the profile image in the students table
      const { error } = await supabase
        .from('students')
        .update({ profile_image: avatarUri })
        .eq('adm_no', user.user_metadata.adm_no);

      if (error) throw error;

      setStudentImage({ uri: avatarUri });
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const uploadAndUpdateProfileImage = async (uri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload the image to Supabase storage
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File not found');

      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `profile-${user.user_metadata.adm_no}-${Date.now()}.${fileExt}`;
      const filePath = `students/${fileName}`;

      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, FileSystem.readAsStringAsync(uri, { encoding: 'base64' }), {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profile image in the students table
      const { error: updateError } = await supabase
        .from('students')
        .update({ profile_image: publicUrl })
        .eq('adm_no', user.user_metadata.adm_no);

      if (updateError) throw updateError;

      setStudentImage({ uri: publicUrl });
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload and update profile image');
    }
  };

  const attendancePercentage = calculateAttendancePercentage(attendance?.attendance);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load user data.</Text>
      </View>
    );
  }

  const totalFees = Number(userData.total_fees) || 0;
  const paidFees = Number(userData.paid_fees) || 0;
  const outstandingFees = totalFees - paidFees;

  const barData = {
    labels: subjects.map(subject => subject.subject_name),
    datasets: [
      {
        data: scoresData.map(score => score.score),
      },
    ],
  };

  const progressData = {
    labels: ['Paid', 'Outstanding'],
    data: totalFees === 0 ? [0, 0] : [paidFees / totalFees, outstandingFees / totalFees],
  };

  const barChartConfig = {
    backgroundColor: '#f5f5f5',
    backgroundGradientFrom: '#f5f5f5',
    backgroundGradientTo: '#f5f5f5',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(3, 127, 140, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 10 },
    barPercentage: 0.5,
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: '#e0e0e0',
    },
  };

  return (
    <LinearGradient colors={['#49AAAE', '#AEF5F8' ]} style={styles.container}>
      <StatusBar backgroundColor="#037f8c" barStyle="light-content" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardHeaderText}>DASHBOARD</Text>
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={handleImagePress} style={styles.imageContainer}>
            {studentImage ? (
              <Image source={studentImage} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name="add-a-photo" size={40} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>Name: {userData.name}</Text>
            <Text style={styles.grade}>Class: {userData.class}</Text>
            <Text style={styles.adm}>ADM NO: {userData.adm_no}</Text>
          </View>
        </View>

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

        {/* School Website Button */}
        <TouchableOpacity
          style={styles.websiteButton}
          onPress={() => Linking.openURL('https://www.schoolwebsite.com')}
        >
          <Text style={styles.websiteButtonText}>Visit School Website</Text>
          <Icon name="arrow-forward" size={20} color="#037f8c" />
        </TouchableOpacity>

        {/* Attendance Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
          <View style={styles.attendanceContainer}>
            <View style={styles.attendanceCard}>
              <Text style={styles.attendanceCardText}>Attendance</Text>
              <Text style={styles.attendancePercentageText}>{attendancePercentage}%</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Performance Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
          <View style={styles.performanceContainer}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceText}>Performance</Text>
              {subjects.length > 0 && scoresData.length > 0 ? (
                <BarChart
                  data={barData}
                  width={width - 40}
                  height={220}
                  yAxisSuffix="%"
                  chartConfig={barChartConfig}
                  style={styles.barChart}
                  fromZero
                />
              ) : (
                <Text style={styles.errorText}>No performance data available.</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Combined Fee and Pie Chart Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Fee')}>
          <View style={styles.combinedCard}>
            {/* Fee Section */}
            <View style={styles.feeContainer}>
              <View style={styles.feeCard}>
                <Text style={styles.feeTitle}>Annual Fee</Text>
                <Text style={styles.feeValue}>{totalFees.toLocaleString()} Ksh</Text>
              </View>
              <View style={styles.feeCard}>
                <Text style={styles.feeTitle}>Amount Paid</Text>
                <Text style={styles.feeValue}>{paidFees.toLocaleString()} Ksh</Text>
              </View>
              <View style={styles.feeCard}>
                <Text style={styles.feeTitle}>Outstanding Fee</Text>
                <Text style={styles.feeValue}>{outstandingFees.toLocaleString()} Ksh</Text>
              </View>
            </View>

            {/* Pie Chart Section */}
            <View style={styles.pieContainer}>
              <ProgressChart
                data={progressData}
                width={width - 40}
                height={150}
                strokeWidth={16}
                radius={32}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(174, 245, 248, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#6a11cb',
                  },
                }}
                hideLegend={false}
                style={styles.progressChart}
              />
            </View>

            {/* Custom Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#AEF5F8' }]} />
                <Text style={styles.legendText}>Paid Fees</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#6a11cb' }]} />
                <Text style={styles.legendText}>Outstanding Fees</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Notifications Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.notificationCard}>
            <Text style={styles.notificationCardText}>View Notifications</Text>
            <Icon name="arrow-forward" size={20} color="#037f8c" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#037f8c',
    padding: 50,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 2,
  },
  name: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  grade: {
    fontSize: 20,
    color: '#ffffff',
  },
  adm: {
    fontSize: 20,
    color: '#ffffff',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0e0e0',
    marginRight: 8,
  },
  attendanceContainer: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  attendanceCard: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceCardText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendancePercentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#037f8c',
  },
  performanceContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  performanceCard: {
    backgroundColor: '#49AAAE',
    padding: 26,
    borderRadius: 8,
    width: '117%',
  },
  performanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
    marginLeft: 10,
  },
  barChart: {
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  combinedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feeCard: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
  },
  feeTitle: {
    fontSize: 14,
    color: '#666666',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#037f8c',
  },
  pieContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  progressChart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    color: '#000000',
  },
  notificationCard: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationCardText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  // Modal styles
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
});

export default Home;