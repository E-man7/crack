import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, TextInput
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
  });
  const [displayOption, setDisplayOption] = useState('progress');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

    if (error) {
      console.error('Error fetching classes:', error);
    } else {
      const uniqueClasses = [...new Set(data.map(item => item.class))];
      setClasses(uniqueClasses);
    }
    setIsLoading(false);
  };

  const fetchStudentsByClass = async (className) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class', className);

    if (error) {
      console.error('Error fetching students:', error);
    } else {
      setStudents(data);
    }
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
        .eq('adm_no', admNo);

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
        .eq('adm_no', admNo);

      const subjectIds = [...new Set([...scoresData.map(s => s.subject_id), ...gradesData.map(g => g.subject_id)])];
      const subjectNames = await fetchSubjectNames(subjectIds);

      setStudentDetails({
        attendance: attendanceData || [],
        scores: scoresData.map(s => ({ ...s, subject_name: subjectNames[s.subject_id] || 'Unknown' })) || [],
        grades: gradesData.map(g => ({ ...g, subject_name: subjectNames[g.subject_id] || 'Unknown' })) || [],
        reports: reportsData || [],
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchClasses();
    if (selectedClass) await fetchStudentsByClass(selectedClass);
    setIsRefreshing(false);
  }, [selectedClass]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.adm_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
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
            data={filteredStudents}
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
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={displayOption}
              style={styles.picker}
              onValueChange={(itemValue) => setDisplayOption(itemValue)}
            >
              <Picker.Item label="Progress" value="progress" />
            </Picker>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <View style={styles.detailsContainer}>
              {/* Attendance */}
              {studentDetails.attendance.length > 0 && (
                <>
                  <Text style={styles.detailTitle}>Attendance</Text>
                  {studentDetails.attendance.map((attendance, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text>Month: {attendance.month}</Text>
                      <Text>Year: {attendance.year}</Text>
                      <Text>Term: {attendance.term}</Text>
                      <Text>Attendance: {attendance.attendance}/{attendance.total_days}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Scores */}
              {studentDetails.scores.length > 0 && (
                <>
                  <Text style={styles.detailTitle}>Scores</Text>
                  {studentDetails.scores.map((score, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text>Subject: {score.subject_name}</Text>
                      <Text>Score: {score.score}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Grades */}
              {studentDetails.grades.length > 0 && (
                <>
                  <Text style={styles.detailTitle}>Grades</Text>
                  {studentDetails.grades.map((grade, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text>Subject: {grade.subject_name}</Text>
                      <Text>Grade: {grade.grade}</Text>
                      <Text>Term: {grade.term}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Reports */}
              {studentDetails.reports.length > 0 && (
                <>
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
            </View>
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
  studentItem: { padding: 16, backgroundColor: '#90caf9', borderRadius: 10, marginBottom: 8 },
  pickerContainer: { backgroundColor: '#ffffff', borderRadius: 10, padding: 5, marginBottom: 10 },
  detailsContainer: { padding: 16, backgroundColor: '#ffffff', borderRadius: 10 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  searchInput: {
    height: 40,
    borderColor: '#90caf9',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
});

export default ClassesTab;