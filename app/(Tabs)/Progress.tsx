import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import supabase from '../supabase';
import { useUser } from '../context/UserContext';

const screenWidth = Dimensions.get('window').width;

const Progress = () => {
  const [selectedReport, setSelectedReport] = useState('termly-reports');
  const [subjectData, setSubjectData] = useState([]);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetchSubjectsAndScores();
    }
  }, [user]);

  const fetchSubjectsAndScores = async () => {
    try {
      // Fetch scores for the current user using adm_no
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no); // Use adm_no to fetch scores

      if (scoresError) {
        console.error('Error fetching scores:', scoresError);
        throw scoresError;
      }

      // Fetch all subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, subject_name');

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        throw subjectsError;
      }

      // Combine subjects and scores
      const combinedData = subjects.map(subject => {
        const subjectScore = scores.find(score => score.subject_id === subject.id);
        const scoreValue = subjectScore ? subjectScore.score : null; // Adjust based on actual score field
        return {
          subject: subject.subject_name,
          score: scoreValue || 0, // Default to 0 if score is missing
          grade: scoreValue ? calculateGrade(scoreValue) : 'N/A',
        };
      });

      console.log('Combined Data:', combinedData); // Debugging
      setSubjectData(combinedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const termlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        data: [75, 80, 85, 90, 95, 93, 94, 95, 97, 96, 94, 92],
      },
    ],
  };

  const quarterlyData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        data: [80, 85, 90, 95],
      },
    ],
  };

  const attendanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        data: [90, 92, 93, 91, 94, 95, 93, 94, 96, 98, 97, 99],
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Add the centered header here */}
      <Text style={styles.header}>Progress</Text>

      <Text style={styles.chartTitle}>Termly Progress</Text>
      <LineChart
        data={selectedReport === 'termly-reports' ? termlyData : quarterlyData}
        width={screenWidth - 30}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={styles.chart}
      />

      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedReport}
          onValueChange={(itemValue) => setSelectedReport(itemValue)}
          style={styles.dropdown}
        >
          <Picker.Item label="Termly Reports" value="termly-reports" />
          <Picker.Item label="Quarterly Reports" value="quarterly-reports" />
        </Picker>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Subject</Text>
          <Text style={styles.tableHeaderText}>Subject Scores</Text>
          <Text style={styles.tableHeaderText}>Grade</Text>
        </View>
        {subjectData.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <Text style={styles.tableCell}>{item.subject}</Text>
            <Text style={styles.tableCell}>{item.score}</Text>
            <Text style={styles.tableCell}>{item.grade}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.chartTitle}>Attendance</Text>
      <LineChart
        data={attendanceData}
        width={screenWidth - 30}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={styles.chart}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000', // Black color
    marginVertical: 20, // Add some vertical margin for spacing
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  chart: {
    marginVertical: 10,
    borderRadius: 10,
  },
  dropdownContainer: {
    marginVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  dropdown: {
    height: 40,
  },
  table: {
    backgroundColor: '#e0f7fa',
    borderRadius: 10,
    marginVertical: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableCell: {
    fontSize: 14,
    width: '30%',
    textAlign: 'center',
  },
});

export default Progress;