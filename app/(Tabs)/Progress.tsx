import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';

const screenWidth = Dimensions.get('window').width;

const Progress = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Termly Progress Chart */}
      <Text style={styles.chartTitle}>Termly Progress</Text>
      <LineChart
        data={{
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              data: [75, 80, 85, 90, 95, 93, 94, 95, 97, 96, 94, 92],
            },
          ],
        }}
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

      {/* Dropdown */}
      <View style={styles.dropdownContainer}>
        <Picker style={styles.dropdown}>
          <Picker.Item label="Termly Reports" value="termly-reports" />
          <Picker.Item label="Quarterly Reports" value="quarterly-reports" />
        </Picker>
      </View>

      {/* Table Section */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Subject Scores</Text>
          <Text style={styles.tableHeaderText}>Classes</Text>
          <Text style={styles.tableHeaderText}>Badges</Text>
        </View>
        {[
          { subject: 'Math', grade: 'A+', score: 97 },
          { subject: 'English', grade: 'B-', score: 85 },
          { subject: 'Science', grade: 'A-', score: 90 },
          { subject: 'Social Studies', grade: 'B-', score: 75 },
          { subject: 'Home Science', grade: 'B', score: 67 },
        ].map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <Text style={styles.tableCell}>{item.subject} {'\n'} <Text style={styles.gradeText}>Grade {item.grade}</Text></Text>
            <Text style={styles.tableCell}>{item.score}</Text>
            <Text style={styles.tableCell}>{item.score}%</Text>
          </View>
        ))}
      </View>

      {/* Attendance Chart */}
      <Text style={styles.chartTitle}>Attendance</Text>
      <LineChart
        data={{
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              data: [90, 92, 93, 91, 94, 95, 93, 94, 96, 98, 97, 99],
            },
          ],
        }}
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
  },
  gradeText: {
    fontSize: 12,
    color: '#555',
  },
});

export default Progress;
