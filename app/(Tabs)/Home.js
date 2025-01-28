import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, PermissionsAndroid, Platform } from 'react-native';
import { BarChart, ProgressChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import supabase from '../supabase';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get('window').width;

const Home = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentImage, setStudentImage] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [scoresData, setScoresData] = useState(null);

  // Function to request camera and storage permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        if (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Permissions granted');
        } else {
          console.log('Permissions denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  useEffect(() => {
    requestPermissions();
    const fetchUserData = async () => {
      try {
        // Get the current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        // Fetch student data from the 'students' table using adm_no
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .single();

        if (studentError) throw studentError;

        // Set the profile image if it exists
        if (studentData.profile_image) {
          setStudentImage({ uri: studentData.profile_image });
        }

        // Fetch fee data from the 'fees' table using adm_no
        const { data: feeData, error: feeError } = await supabase
          .from('fees')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .maybeSingle(); // Use maybeSingle to handle no rows

        if (feeError) throw feeError;

        // Fetch attendance data from the 'performance' table using adm_no
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('performance')
          .select('attendance')
          .eq('adm_no', user.user_metadata.adm_no)
          .single();

        if (attendanceError) throw attendanceError;

        // Fetch scores data from the 'scores' table using adm_no
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .single();

        if (scoresError) throw scoresError;

        // Combine student, fee, attendance, and scores data into a single object
        const combinedData = {
          ...studentData,
          total_fees: feeData?.total_fees || 0, // Default to 0 if feeData is null
          paid_fees: feeData?.paid_fees || 0,   // Default to 0 if feeData is null
          attendance: attendanceData?.attendance || 0, // Default to 0 if attendanceData is null
          scores: scoresData || {}, // Add scores data
        };

        // Log the combined data for debugging
        console.log('Combined User Data:', combinedData);

        // Set the combined data in state
        setUserData(combinedData);
        setScoresData(scoresData); // Set scores data in state
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Function to upload image to Supabase Storage
  const uploadImageToSupabase = async (uri, adm_no) => {
    try {
      // Convert the image URI to a Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Generate a unique file name
      const fileName = `${adm_no}_${new Date().getTime()}.jpg`;

      // Upload the image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('student-images')
        .upload(fileName, blob);

      if (error) throw error;

      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('student-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded. Public URL:', publicUrlData.publicUrl); // Log the public URL
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Function to handle image picker
  const handleImagePicker = async () => {
    Alert.alert(
      'Choose Image',
      'Select an option to upload your profile picture',
      [
        {
          text: 'Choose from Gallery',
          onPress: () => launchImagePicker('gallery'),
        },
        {
          text: 'Take a Photo',
          onPress: () => launchImagePicker('camera'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Function to launch image picker or camera
  const launchImagePicker = async (type) => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    const launchFunction = type === 'gallery' ? launchImageLibrary : launchCamera;

    launchFunction(options, async (response) => {
      console.log('ImagePicker Response:', response); // Log the response

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        console.log('Selected Image URI:', source.uri); // Log the selected image URI
        setStudentImage(source); // Set the selected image

        // Upload the image to Supabase Storage
        const imageUrl = await uploadImageToSupabase(source.uri, userData.adm_no);
        if (imageUrl) {
          console.log('Image uploaded successfully. URL:', imageUrl); // Log the uploaded image URL
          // Update the student's profile image URL in the database
          await supabase
            .from('students')
            .update({ profile_image: imageUrl })
            .eq('adm_no', userData.adm_no);
        }
      }
    });
  };

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  // Display error message if no user data is found
  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load user data.</Text>
      </View>
    );
  }

  // Calculate fees
  const totalFees = Number(userData.total_fees) || 0;
  const paidFees = Number(userData.paid_fees) || 0;
  const outstandingFees = totalFees - paidFees;

  // Bar chart data
  const barData = {
    labels: ['Math', 'English', 'Science', 'History', 'Art'],
    datasets: [
      {
        data: [
          scoresData?.math || 0,
          scoresData?.english || 0,
          scoresData?.science || 0,
          scoresData?.history || 0,
          scoresData?.art || 0,
        ], // Use scores data or default to 0
      },
    ],
  };

  // Progress chart data
  const progressData = {
    labels: ['Paid', 'Outstanding'],
    data: totalFees === 0 ? [0, 0] : [paidFees / totalFees, outstandingFees / totalFees],
  };

  // Bar chart configuration
  const barChartConfig = {
    backgroundColor: '#f5f5f5',
    backgroundGradientFrom: '#f5f5f5',
    backgroundGradientTo: '#f5f5f5',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(3, 127, 140, ${opacity})`, // Primary color for bars
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Label color
    style: { borderRadius: 10 },
    barPercentage: 0.5, // Adjust bar width
    propsForBackgroundLines: {
      strokeWidth: 1, // Grid line thickness
      stroke: '#e0e0e0', // Grid line color
    },
  };

  return (
    <View style={styles.container}>
      {/* Dashboard Header */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardHeaderText}>DASHBOARD</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Image Holder */}
          <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
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

        {/* Attendance Section */}
        <View style={styles.attendanceContainer}>
          <Text style={styles.attendanceText}>Attendance</Text>
          <View style={styles.attendanceCard}>
            <Text style={styles.attendanceCardText}>Attendance:</Text>
            <Text style={styles.attendancePercentageText}>
              {userData.attendance}%
            </Text>
          </View>
        </View>

        {/* Performance Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
          <View style={styles.performanceContainer}>
            <Text style={styles.performanceText}>Performance</Text>
            <BarChart
              data={barData}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix="%"
              chartConfig={barChartConfig}
              style={styles.barChart}
              fromZero
            />
          </View>
        </TouchableOpacity>

        {/* Fee Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Fee')}>
          <View style={styles.feeContainer}>
            <View style={[styles.feeCard, styles.feeCardLarge]}>
              <Text style={styles.feeTitle}>Annual Fee</Text>
              <Text style={styles.feeValue}>{totalFees.toLocaleString()} Ksh</Text>
            </View>
            <View style={[styles.feeCard, styles.feeCardLarge]}>
              <Text style={styles.feeTitle}>Amount Paid</Text>
              <Text style={styles.feeValue}>{paidFees.toLocaleString()} Ksh</Text>
            </View>
            <View style={[styles.feeCard, styles.feeCardLarge]}>
              <Text style={styles.feeTitle}>Outstanding Fee</Text>
              <Text style={styles.feeValue}>{outstandingFees.toLocaleString()} Ksh</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Pie Chart Section */}
        <View style={styles.pieContainer}>
          <ProgressChart
            data={progressData}
            width={screenWidth - 40}
            height={150}
            strokeWidth={16}
            radius={32}
            chartConfig={{
              backgroundColor: '#f5f5f5',
              backgroundGradientFrom: '#f5f5f5',
              backgroundGradientTo: '#f5f5f5',
              color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
            }}
            hideLegend={false}
            style={styles.progressChart}
          />
        </View>

        {/* Notifications Section */}
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.notificationsContainer}>
            <Text style={styles.notificationsText}>Notifications</Text>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationCardText}>View Notifications</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  dashboardHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#444',
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
    backgroundColor: '#e0e0e0', // Light gray background for the placeholder
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
  attendanceContainer: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  attendanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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
    fontSize: 14,
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
  },
  performanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  barChart: {
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginVertical: 40,
  },
  feeCard: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    width: '30%',
  },
  feeCardLarge: {
    padding: 16,
  },
  feeTitle: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pieContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressChart: {
    borderRadius: 10,
  },
  notificationsContainer: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  notificationsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationCard: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
  },
  notificationCardText: {
    fontSize: 14,
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
});

export default Home;