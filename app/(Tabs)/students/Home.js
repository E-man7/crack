import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Linking, StatusBar, RefreshControl, useWindowDimensions, Alert } from 'react-native';
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
  const [schoolWebsite, setSchoolWebsite] = useState('');

  // Performance Chart Component
  const PerformanceChart = ({ data, chartWidth, chartHeight }) => {
    const barWidth = (chartWidth - 50) / data.labels.length;
    const maxValue = Math.max(...data.datasets[0].data, 100);
    let prevX = 0;
    let prevY = 0;

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    const renderGridLines = () => {
      return [0, 25, 50, 75, 100].map((value, index) => (
        <View
          key={`grid-${index}`}
          style={[
            styles.gridLine,
            {
              top: ((100 - value) / 100) * (chartHeight - 40),
              width: chartWidth - 10,
            }
          ]}
        />
      ));
    };

    return (
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        <View style={styles.graphPaper}>
          {renderGridLines()}
        </View>

        <View style={styles.yAxis}>
          {[0, 25, 50, 75, 100].map((value) => (
            <Text
              key={`y-label-${value}`}
              style={[
                styles.yAxisLabel,
                { top: ((100 - value) / 100) * (chartHeight - 40) - 0 }
              ]}
            >
              {value}%
            </Text>
          ))}
        </View>

        <View style={styles.barsContainer}>
          {data.datasets[0].data.map((value, index) => {
            const barHeight = (value / maxValue) * (chartHeight - 45);
            const color = `rgba(${hexToRgb('#0A71F2').join(', ')}, 0.8)`;
            const shadowColor = `rgba(${hexToRgb('#0A71F2').join(', ')}, 0.5)`;
            
            return (
              <View
                key={`bar-${index}`}
                style={[
                  styles.barContainer,
                  {
                    left: index * barWidth + barWidth * 0.2,
                    height: barHeight,
                    width: barWidth * 0.5,
                  }
                ]}
              >
                {/* Main bar with gradient */}
                <LinearGradient
                  colors={['#0A71F2', '#2196F3']}
                  style={[styles.barMain, { height: barHeight }]}
                  start={{ x: 55, y: 0 }}
                  end={{ x: 0, y: 5 }}
                >
                  <View style={styles.barTopLight} />
                </LinearGradient>
                
              
                
                <Text style={[styles.barValue, { bottom: barHeight + 5 }]}>
                  {value}%
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.labelsContainer}>
          {data.labels.map((label, index) => (
            <Text
              key={`label-${index}`}
              style={[
                styles.subjectLabel,
                { left: index * barWidth + barWidth * 0.5 - 25 }
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.lineGraph}>
          {data.datasets[0].data.map((value, index) => {
            const x = index * barWidth + barWidth / 2;
            const y = chartHeight - 40 - (value / maxValue) * (chartHeight - 60);
            
            return (
              <React.Fragment key={`point-${index}`}>
                {index > 0 && (
                  <View
                    style={[
                      styles.lineSegment,
                      {
                        left: prevX + 4,
                        top: prevY + 4,
                        width: Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2)),
                        transform: [{ rotate: `${Math.atan2(y - prevY, x - prevX)}rad` }],
                      }
                    ]}
                  />
                )}
                
                <View
                  style={[
                    styles.dataPoint,
                    { left: x - 8, top: y - 8 }
                  ]}
                >
                  <LinearGradient
                    colors={['#FF6347', '#FF4500']}
                    style={styles.dataPointInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
                
                {(() => { prevX = x; prevY = y; })()}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) throw new Error('No student data found');

      if (studentData.profile_image) {
        setStudentImage({ uri: studentData.profile_image });
      }

      if (studentData.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('link')
          .eq('id', studentData.school_id)
          .single();

        if (!schoolError && schoolData?.link) {
          setSchoolWebsite(schoolData.link);
        }
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
        .order('month', { ascending: false })
        .limit(1);

      if (attendanceError) throw attendanceError;

      setUserData({
        ...studentData,
        total_fees: feeData?.total_fees || 0,
        paid_fees: feeData?.paid_fees || 0,
      });
      setAttendance(attendanceData?.[0] || null);
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserData(),
        fetchScoresAndSubjects()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
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
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File not found');

      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `profile-${user.user_metadata.adm_no}-${Date.now()}.${fileExt}`;
      const filePath = `students/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, FileSystem.readAsStringAsync(uri, { encoding: 'base64' }), {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchScoresAndSubjects();
    }
  }, [userData]);

  const barData = {
    labels: subjects.map(subject => subject.subject_name),
    datasets: [{
      data: scoresData.map(score => score.score),
    }],
  };

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
  const outstandingFees = Math.max(0, totalFees - paidFees);

  return (
    <LinearGradient colors={['#49AAAE', '#AEF5F8']} style={styles.container}>
      <StatusBar backgroundColor="#037f8c" barStyle="light-content" />
      
      {/* Static Header Section */}
      <View style={styles.staticHeader}>
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
      </View>
  
      {/* Scrollable Content Section */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {schoolWebsite ? (
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => Linking.openURL(schoolWebsite)}
          >
            <Text style={styles.websiteButtonText}>Visit School Website</Text>
            <Icon name="arrow-forward" size={20} color="#037f8c" />
          </TouchableOpacity>
        ) : null}
  
        <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
          <View style={styles.attendanceContainer}>
            <View style={styles.attendanceCard}>
              <Text style={styles.attendanceCardText}>Attendance</Text>
              <Text style={styles.attendancePercentageText}>
                {calculateAttendancePercentage(attendance?.attendance)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>
  
        <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
          <View style={styles.performanceContainer}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceText}>Performance</Text>
              {subjects.length > 0 && scoresData.length > 0 ? (
                <PerformanceChart 
                  data={barData} 
                  chartWidth={width - 40} 
                  chartHeight={220}
                />
              ) : (
                <Text style={styles.errorText}>No performance data available.</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
  
        <TouchableOpacity onPress={() => navigation.navigate('Fee')}>
          <View style={styles.combinedCard}>
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
                <Text style={styles.feeTitle}>Outstanding</Text>
                <Text style={styles.feeValue}>
                  {outstandingFees.toLocaleString()} Ksh
                </Text>
              </View>
            </View>
  
            <View style={styles.pieContainer}>
              <ProgressChart
                data={{
                  labels: ['Paid', 'Outstanding'],
                  data: [
                    paidFees / Math.max(1, totalFees),
                    outstandingFees / Math.max(1, totalFees)
                  ],
                }}
                width={width - 40}
                height={180}
                strokeWidth={20}
                radius={40}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 1,
                  color: (opacity = 1, index) => {
                    const colors = ['#0A71F2', '#F44336'];
                    const hexColor = colors[index] || '#000000';
                    const r = parseInt(hexColor.slice(1, 3), 16);
                    const g = parseInt(hexColor.slice(3, 5), 16);
                    const b = parseInt(hexColor.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                  },
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { 
                    borderRadius: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '3',
                    stroke: '#EA4335',
                  },
                }}
                hideLegend={false}
              />
            </View>
  
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#0A71F2' }]} />
                <Text style={styles.legendText}>Paid Fees</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>Outstanding Fees</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
  
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.notificationCard}>
            <Text style={styles.notificationCardText}>View Notifications</Text>
            <Icon name="arrow-forward" size={20} color="#037f8c" />
          </View>
        </TouchableOpacity>
      </ScrollView>
  
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  scrollContent: {
    flex: 1,
    marginTop: 220,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  dashboardHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardHeaderText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#037f8c',
    padding: 15,
    paddingTop: 50,
    alignItems: 'center',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 60,
    marginHorizontal: 20,
    marginVertical: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 20,
    marginBottom: 15,
    marginTop: -15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  placeholderImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 4,
    marginBottom: 15,
    marginTop: -15,
  },
  name: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 8,
  },
  grade: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    marginBottom: 4,
  },
  adm: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 35,
    backgroundColor: '#037f8c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  attendanceContainer: {
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  attendanceCardText: {
    fontSize: 16,
    color: '#037f8c',
  },
  attendancePercentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#037f8c',
  },
  performanceContainer: {
    marginVertical: 15,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  performanceCard: {
    backgroundColor: '#49AAAE',
    padding: 30,
    borderRadius: 16,
    width: '110%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  performanceText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'left',
    marginLeft: 10,
    color: '#fff',
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingTop: 10,
    paddingLeft: 30,
    paddingRight: 10,
    paddingBottom: 30,
    marginBottom: 10,
  },
  graphPaper: {
    position: 'absolute',
    top: 54,
    left: 30,
    right: 10,
    bottom: 60,
    backgroundColor: '#ffffff',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(73, 170, 174, 0.2)',
    left: 0,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 30,
    width: 30,
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 5,
    color: '#666',
  },
  barsContainer: {
    position: 'relative',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
  },
  barMain: {
    position: 'absolute',
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barTopLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(75, 67, 67, 0.3)',
  },
  barShadow: {
    position: 'absolute',
    width: '200%',
    borderRadius: 4,
    opacity: 0.5,
  },
  barValue: {
    position: 'absolute',
    fontSize: 10,
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#037f8c',
  },
  labelsContainer: {
    position: 'relative',
    height: 40,
    marginTop: 5,
  },
  subjectLabel: {
    position: 'absolute',
    fontSize: 10,
    width: 100,
    textAlign: 'center',
    bottom: 20,
    marginLeft: - 35,
  },
  lineGraph: {
    position: 'absolute',
    top: 10,
    left: 30,
    right: 10,
    bottom: 30,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#FF6347',
    transformOrigin: '0 0',
  },
  
  dataPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  dataPointInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  combinedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  feeCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feeTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#037f8c',
  },
  pieContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#333333',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    marginHorizontal: 15,
    marginVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  notificationCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  errorText: {  
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 25,
    textAlign: 'center',
    color: '#037f8c',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    marginLeft: 18,
    fontSize: 17,
    color: '#444',
  },
  avatarSectionTitle: {
    marginTop: 20,
    marginBottom: 15,
    fontSize: 17,
    fontWeight: '800',
    color: '#037f8c',
  },
  avatarList: {
    paddingVertical: 12,
  },
  avatarImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#037f8c',
  },
  modalCloseButton: {
    marginTop: 25,
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
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default Home;