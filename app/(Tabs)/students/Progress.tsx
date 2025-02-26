import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Modal, Button, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import supabase from '../../supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing'; // For opening the PDF

const ProgressScreen = () => {
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [subjects, setSubjects] = useState([]);
  const [scores, setScores] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [targetScores, setTargetScores] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isDownloadModalVisible, setIsDownloadModalVisible] = useState(false);
  const [selectedDownloadTerm, setSelectedDownloadTerm] = useState('Term 1');
  const [isDownloading, setIsDownloading] = useState(false); // For PDF download feedback
  const [pdfUri, setPdfUri] = useState(null); // To store the downloaded PDF URI

  // Prepare chart data
  const prepareChartData = async (selectedTerm) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('period', selectedTerm);

      if (reportsError) throw reportsError;

      const subjects = [...new Set(reportsData.map((report) => report.report_type))];
      const data = subjects.map((subject) => {
        const report = reportsData.find((r) => r.report_type === subject);
        return report ? report.score : 0;
      });

      return {
        labels: subjects,
        datasets: [
          {
            data,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      };
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return null;
    }
  };

  // Fetch user data, subjects, scores, and grades
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .single();

        if (studentError) throw studentError;

        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*');

        if (subjectsError) throw subjectsError;

        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no);

        if (scoresError) throw scoresError;

        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .eq('term', selectedTerm);

        if (gradesError) throw gradesError;

        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .eq('term', selectedTerm);

        if (!attendanceError) setAttendance(attendanceData[0]);

        const combinedData = {
          student: studentData,
          subjects: subjectsData,
          scores: scoresData,
          grades: gradesData,
        };

        setUserData(combinedData);
        setSubjects(subjectsData);
        setScores(scoresData);
        setGrades(gradesData);

        const chartData = await prepareChartData(selectedTerm);
        setChartData(chartData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTerm]);

  // Combine subjects, scores, and grades into a single array
  const combinedData = subjects.map((subject) => {
    const score = scores.find((s) => s.subject_id === subject.id);
    const grade = grades.find((g) => g.subject_id === subject.id);
    const targetScore = targetScores[subject.id] || 'N/A';

    return {
      subject_name: subject.subject_name,
      score: score ? score.score : 'N/A',
      grade: grade ? grade.grade : 'N/A',
      targetScore,
    };
  });

  // Function to update target scores
  const updateTargetScore = (subjectId, targetScore) => {
    setTargetScores((prev) => ({ ...prev, [subjectId]: targetScore }));
  };

  // Function to fetch yearly subject analysis
  const fetchSubjectAnalysis = async (subjectName) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.user_metadata.adm_no)
        .eq('report_type', subjectName);

      if (reportsError) throw reportsError;

      const scoresByTerm = reportsData.map((report) => ({
        term: report.period,
        score: report.score,
      }));

      const averageScore = scoresByTerm.reduce((sum, report) => sum + report.score, 0) / scoresByTerm.length;

      return {
        subject_name: subjectName,
        scoresByTerm,
        averageScore,
      };
    } catch (error) {
      console.error('Error fetching subject analysis:', error);
      return null;
    }
  };

  // Function to handle PDF download
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      // Simulate PDF generation (replace with actual PDF generation logic)
      const pdfUri = `${FileSystem.documentDirectory}results_${selectedDownloadTerm}.pdf`;
      await FileSystem.writeAsStringAsync(pdfUri, `Results for ${selectedDownloadTerm}`, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setPdfUri(pdfUri);
      Alert.alert('Download Complete', 'The PDF has been downloaded successfully.', [
        { text: 'Open PDF', onPress: () => Sharing.shareAsync(pdfUri) },
        { text: 'OK', onPress: () => setIsDownloadModalVisible(false) },
      ]);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Render attendance overview
  const renderAttendanceOverview = () => (
    <View style={styles.attendanceContainer}>
      <Text style={styles.attendanceText}>Attendance Overview</Text>
      <Text>{attendance?.attendance} / {attendance?.total_days} days</Text>
      <View style={styles.progressBar}>
        <View
          style={{
            width: `${(attendance?.attendance / attendance?.total_days) * 100}%`,
            height: 10,
            backgroundColor: '#4CAF50',
          }}
        />
      </View>
    </View>
  );

  // Render goal setting modal
  const renderGoalSettingModal = () => (
    <Modal visible={isTargetModalVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Set Target Scores</Text>
        {subjects.map((subject) => (
          <View key={subject.id} style={styles.modalRow}>
            <Text>{subject.subject_name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Target Score"
              keyboardType="numeric"
              onChangeText={(text) => updateTargetScore(subject.id, parseInt(text))}
            />
          </View>
        ))}
        <Button title="Close" onPress={() => setIsTargetModalVisible(false)} />
      </View>
    </Modal>
  );

  // Render subject analysis modal
  const renderSubjectAnalysisModal = () => (
    <Modal visible={isSubjectModalVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{selectedSubject?.subject_name}</Text>
        <Text>Yearly Analysis:</Text>
        {selectedSubject?.scoresByTerm.map((term, index) => (
          <Text key={index}>{term.term}: {term.score}%</Text>
        ))}
        <Text>Average Score: {selectedSubject?.averageScore.toFixed(2)}%</Text>
        <Button title="Close" onPress={() => setIsSubjectModalVisible(false)} />
      </View>
    </Modal>
  );

  // Render download modal
  const renderDownloadModal = () => (
    <Modal visible={isDownloadModalVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Download Results</Text>
        <Picker
          selectedValue={selectedDownloadTerm}
          onValueChange={(itemValue) => setSelectedDownloadTerm(itemValue)}
        >
          <Picker.Item label="Term 1" value="Term 1" />
          <Picker.Item label="Term 2" value="Term 2" />
          <Picker.Item label="Term 3" value="Term 3" />
        </Picker>
        {isDownloading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Download PDF" onPress={handleDownloadPdf} />
        )}
        <Button title="Close" onPress={() => setIsDownloadModalVisible(false)} />
      </View>
    </Modal>
  );

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view your progress.</Text>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      {/* Header with Download Icon */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Progress</Text>
        <TouchableOpacity onPress={() => setIsDownloadModalVisible(true)}>
          <Icon name="download" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Chart */}
      {chartData && (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#e26a00',
              backgroundGradientFrom: '#fb8c00',
              backgroundGradientTo: '#ffa726',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#ffa726',
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>
      )}

      {/* Dropdown Container */}
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedTerm}
          onValueChange={(itemValue) => {
            setSelectedTerm(itemValue);
            setIsPickerOpen(false);
          }}
          onFocus={() => setIsPickerOpen(true)}
          onBlur={() => setIsPickerOpen(false)}
          style={[styles.picker, { height: isPickerOpen ? 150 : 50 }]}
          dropdownIconColor="#000"
          mode="dropdown"
        >
          <Picker.Item label="Term 1" value="Term 1" />
          <Picker.Item label="Term 2" value="Term 2" />
          <Picker.Item label="Term 3" value="Term 3" />
        </Picker>
      </View>

      {/* Table */}
      <ScrollView contentContainerStyle={styles.tableContainer}>
        {/* Table Headers */}
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>Subjects</Text>
          <Text style={styles.headerCell}>Score (%)</Text>
          <Text style={styles.headerCell}>Target Score</Text>
          <Text style={styles.headerCell}>Grade</Text>
        </View>

        {/* Table Rows */}
        {combinedData.length > 0 ? (
          combinedData.map((data, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.cell}>{data.subject_name}</Text>
              <Text style={styles.cell}>{data.score}</Text>
              <Text style={styles.cell}>{data.targetScore}</Text>
              <Text style={styles.cell}>{data.grade}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No data found for {selectedTerm}.</Text>
        )}
      </ScrollView>

      {/* Attendance Overview */}
      {renderAttendanceOverview()}

      {/* New Features Section */}
      <View style={styles.newFeaturesContainer}>
        {/* Goal Setting Button */}
        <Button title="Set Target Scores" onPress={() => setIsTargetModalVisible(true)} />

        {/* Subject Analysis */}
        <Button
          title="View Subject Analysis"
          onPress={async () => {
            const subjectAnalysis = await fetchSubjectAnalysis('Mathematics'); // Replace with dynamic subject selection
            setSelectedSubject(subjectAnalysis);
            setIsSubjectModalVisible(true);
          }}
        />
      </View>

      {/* Modals */}
      {renderGoalSettingModal()}
      {renderSubjectAnalysisModal()}
      {renderDownloadModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  picker: {
    width: '100%',
  },
  chartContainer: {
    marginVertical: 10,
  },
  tableContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#AEF5F8',
  },
  headerCell: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#AEF5F8',
  },
  cell: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  attendanceContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  attendanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  newFeaturesContainer: {
    marginVertical: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    width: 100,
  },
});

export default ProgressScreen;