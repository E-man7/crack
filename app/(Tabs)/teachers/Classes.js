import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import supabase from '../../supabase';

const ClassesTab = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState({
    attendance: [],
    scores: [],
    grades: [],
    reports: [],
    fees: []
  });
  const [displayOption, setDisplayOption] = useState('progress');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('class')
      .neq('class', null);

    if (error) console.error('Error fetching classes:', error);
    else setClasses([...new Set(data.map(item => item.class))]);


    setIsLoading(false);
  };

  const fetchStudentsByClass = async (className) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class', className);

    if (error) console.error('Error fetching students:', error);
    else setStudents(data);

    setIsLoading(false);
  };

  const fetchSubjectNames = async (subjectIds) => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name')
      .in('id', subjectIds);

    if (error) {
      console.error('Error fetching subjects:', error);
      return {};
    }

    return data.reduce((acc, subject) => {
      acc[subject.id] = subject.subject_name;
      return acc;
    }, {});
  };

  const fetchStudentDetails = async (admNo) => {
    setIsLoading(true);
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('adm_no', admNo)
        .eq('term', selectedTerm);

      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .eq('adm_no', admNo);

      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .eq('adm_no', admNo);

      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', admNo)
        .eq('period', selectedTerm);

      const { data: feesData } = await supabase
        .from('fees')
        .select('*')
        .eq('adm_no', admNo);

      const subjectIds = [...new Set([...scoresData.map(s => s.subject_id), ...gradesData.map(g => g.subject_id)])];
      const subjectNames = await fetchSubjectNames(subjectIds);

      setStudentDetails({
        attendance: attendanceData || [],
        scores: scoresData.map(s => ({ ...s, subject_name: subjectNames[s.subject_id] || 'Unknown' })) || [],
        grades: gradesData.map(g => ({ ...g, subject_name: subjectNames[g.subject_id] || 'Unknown' })) || [],
        reports: reportsData || [],
        fees: feesData || []
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    if (score >= 30) return 'D-';
    return 'E';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Classes</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.classItem}
              onPress={() => {
                setSelectedClass(item);
                fetchStudentsByClass(item);
              }}
            >
              <Text style={styles.classText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {selectedClass && (
        <>
          <Text style={styles.title}>Students in {selectedClass}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={students.filter(student =>
              student.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.adm_no}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.studentItem}
                onPress={() => {
                  setSelectedStudent(item);
                  fetchStudentDetails(item.adm_no);
                }}
              >
                <Text style={styles.studentText}>{item.name} - {item.adm_no}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {selectedStudent && (
        <ScrollView>
          <Text style={styles.title}>Student Details</Text>
          <Picker selectedValue={displayOption} style={styles.picker} onValueChange={setDisplayOption}>
            <Picker.Item label="Progress" value="progress" />
            <Picker.Item label="Fees" value="fees" />
          </Picker>

          {displayOption === 'progress' && (
            <>
              <Picker selectedValue={selectedTerm} style={styles.picker} onValueChange={setSelectedTerm}>
                <Picker.Item label="Term 1" value="Term 1" />
                <Picker.Item label="Term 2" value="Term 2" />
                <Picker.Item label="Term 3" value="Term 3" />
              </Picker>

              <Text style={styles.detailTitle}>Attendance</Text>
              {studentDetails.attendance.map((att, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text>Month: {att.month}</Text>
                  <Text>Days: {att.attendance}/{att.total_days}</Text>
                </View>
              ))}

              <Text style={styles.detailTitle}>Progress Table</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableHeader}>Subject</Text>
                  <Text style={styles.tableHeader}>Score</Text>
                  <Text style={styles.tableHeader}>Grade</Text>
                </View>
                {studentDetails.scores.map((score, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text>{score.subject_name}</Text>
                    <Text>{score.score}</Text>
                    <Text>{getGrade(score.score)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.detailTitle}>Reports</Text>
              {studentDetails.reports.map((report, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text>Type: {report.report_type}</Text>
                  <Text>Score: {report.score}</Text>
                  <Text>Period: {report.period}</Text>
                </View>
              ))}
            </>
          )}

          {displayOption === 'fees' && (
            <>
              <Text style={styles.detailTitle}>Fees Information</Text>
              {studentDetails.fees.map((fee, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text>Total: {fee.total_fees}</Text>
                  <Text>Paid: {fee.paid_fees}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#e3f2fd' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1565c0' },
  classItem: { padding: 16, backgroundColor: '#bbdefb', borderRadius: 10, marginBottom: 8 },
  studentItem: { padding: 16, backgroundColor: '#e0f7fa', borderRadius: 10, marginBottom: 8 },
  searchInput: { padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 16 },
  picker: { backgroundColor: '#fff', marginBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  detailItem: { padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8 },
  table: { marginTop: 10, borderWidth: 1, borderColor: '#000', borderRadius: 10 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 10, borderBottomWidth: 1 },
  tableHeader: { fontWeight: 'bold' },
});

export default ClassesTab;