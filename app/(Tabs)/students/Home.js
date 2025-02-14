import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Dimensions } from 'react-native';
import supabase from '../../supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart, ProgressChart } from 'react-native-chart-kit'; // Import charts

const screenWidth = Dimensions.get('window').width;

const Home = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentImage, setStudentImage] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [subjects, setSubjects] = useState([]); // State for subjects
  const [scoresData, setScoresData] = useState([]); // State for scores

  useEffect(() => {
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
      }
    };

    fetchUserData();
  }, []);

  // Fetch scores and subjects data
  useEffect(() => {
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

    fetchScoresAndSubjects();
  }, []);

  // Function to calculate attendance percentage
  const calculateAttendancePercentage = (attendanceDays) => {
    const totalDaysInMonth = 30;
    if (attendanceDays !== undefined && attendanceDays !== null) {
      return ((attendanceDays / totalDaysInMonth) * 100).toFixed(2);
    }
    return 'N/A';
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

  // Bar chart data
  const barData = {
    labels: subjects.map(subject => subject.subject_name),
    datasets: [
      {
        data: scoresData.map(score => score.score),
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
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardHeaderText}>DASHBOARD</Text>
      </View>

      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {}} style={styles.imageContainer}>
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
        <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
          <View style={styles.attendanceContainer}>
            <Text style={styles.attendanceText}>Attendance</Text>
            <View style={styles.attendanceCard}>
              <Text style={styles.attendanceCardText}>
                {attendancePercentage}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

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
  },
  attendanceCardText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  pieContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressChart: {
    borderRadius: 10,
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