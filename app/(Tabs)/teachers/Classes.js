import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, Dimensions, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import supabase from '../../supabase';

const { width } = Dimensions.get('window');

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

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#4CAF50';
      case 'A-': return '#8BC34A';
      case 'B+': return '#CDDC39';
      case 'B': return '#FFEB3B';
      case 'B-': return '#FFC107';
      case 'C+': return '#FF9800';
      case 'C': return '#FF5722';
      case 'C-': return '#F44336';
      case 'D+': return '#E91E63';
      case 'D': return '#9C27B0';
      case 'D-': return '#673AB7';
      default: return '#607D8B';
    }
  };

  const renderAvatar = (student, size = 40) => {
    if (student.profile_image) {
      return (
        <Image 
          source={{ uri: student.profile_image }} 
          style={[
            styles.studentAvatar, 
            { width: size, height: size, borderRadius: size / 2 }
          ]} 
        />
      );
    }
    return (
      <View style={[
        styles.studentAvatar, 
        { width: size, height: size, borderRadius: size / 2, backgroundColor: '#5D3FD3' }
      ]}>
        <MaterialIcons name="person" size={size / 2} color="#fff" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Class Management</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D3FD3" />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Classes</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={classes}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.classItem,
                  selectedClass === item && styles.selectedItem
                ]}
                onPress={() => {
                  setSelectedClass(item);
                  fetchStudentsByClass(item);
                  setSelectedStudent(null);
                }}
              >
                <MaterialIcons name="class" size={24} color="#5D3FD3" />
                <Text style={styles.classText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {selectedClass && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Students in {selectedClass}</Text>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={students.filter(student =>
              student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              student.adm_no.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.adm_no}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.studentItem,
                  selectedStudent?.adm_no === item.adm_no && styles.selectedItem
                ]}
                onPress={() => {
                  setSelectedStudent(item);
                  fetchStudentDetails(item.adm_no);
                }}
              >
                {renderAvatar(item)}
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentAdmNo}>{item.adm_no}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#888" />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {selectedStudent && (
        <ScrollView style={styles.detailsContainer}>
          <View style={styles.studentHeader}>
            {renderAvatar(selectedStudent, 60)}
            <View style={styles.studentHeaderInfo}>
              <Text style={styles.studentHeaderName}>{selectedStudent.name}</Text>
              <Text style={styles.studentHeaderDetails}>
                {selectedStudent.adm_no} • {selectedClass}
              </Text>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                displayOption === 'progress' && styles.activeTab
              ]}
              onPress={() => setDisplayOption('progress')}
            >
              <Text style={[
                styles.tabText,
                displayOption === 'progress' && styles.activeTabText
              ]}>
                Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                displayOption === 'fees' && styles.activeTab
              ]}
              onPress={() => setDisplayOption('fees')}
            >
              <Text style={[
                styles.tabText,
                displayOption === 'fees' && styles.activeTabText
              ]}>
                Fees
              </Text>
            </TouchableOpacity>
          </View>

          {displayOption === 'progress' && (
            <>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedTerm}
                  style={styles.picker}
                  onValueChange={(itemValue) => {
                    setSelectedTerm(itemValue);
                    fetchStudentDetails(selectedStudent.adm_no);
                  }}
                  dropdownIconColor="#5D3FD3"
                >
                  <Picker.Item label="Term 1" value="Term 1" />
                  <Picker.Item label="Term 2" value="Term 2" />
                  <Picker.Item label="Term 3" value="Term 3" />
                </Picker>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="calendar-today" size={20} color="#5D3FD3" />
                  <Text style={styles.cardTitle}>Attendance</Text>
                </View>
                {studentDetails.attendance.length > 0 ? (
                  studentDetails.attendance.map((att, index) => (
                    <View key={index} style={styles.attendanceItem}>
                      <Text style={styles.attendanceMonth}>{att.month}</Text>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View style={[
                            styles.progressFill,
                            { width: `${(att.attendance / att.total_days) * 100}%` }
                          ]} />
                        </View>
                        <Text style={styles.attendanceText}>
                          {att.attendance}/{att.total_days} days
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No attendance records found</Text>
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="assessment" size={20} color="#5D3FD3" />
                  <Text style={styles.cardTitle}>Academic Performance</Text>
                </View>
                {studentDetails.scores.length > 0 ? (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Subject</Text>
                      <Text style={styles.tableHeaderText}>Score</Text>
                      <Text style={styles.tableHeaderText}>Grade</Text>
                    </View>
                    {studentDetails.scores.map((score, index) => {
                      const grade = getGrade(score.score);
                      return (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.tableCell}>{score.subject_name}</Text>
                          <Text style={styles.tableCell}>{score.score}</Text>
                          <View style={[
                            styles.gradeBadge,
                            { backgroundColor: getGradeColor(grade) }
                          ]}>
                            <Text style={styles.gradeText}>{grade}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No academic records found</Text>
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="description" size={20} color="#5D3FD3" />
                  <Text style={styles.cardTitle}>Reports</Text>
                </View>
                {studentDetails.reports.length > 0 ? (
                  studentDetails.reports.map((report, index) => (
                    <View key={index} style={styles.reportItem}>
                      <Text style={styles.reportType}>{report.report_type}</Text>
                      <Text style={styles.reportScore}>Score: {report.score}</Text>
                      <Text style={styles.reportPeriod}>Term: {report.period}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No reports found</Text>
                )}
              </View>
            </>
          )}

          {displayOption === 'fees' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="attach-money" size={20} color="#5D3FD3" />
                <Text style={styles.cardTitle}>Fees Information</Text>
              </View>
              {studentDetails.fees.length > 0 ? (
                studentDetails.fees.map((fee, index) => (
                  <View key={index} style={styles.feeItem}>
                    <View style={styles.feeInfo}>
                      <Text style={styles.feeLabel}>Total Fees:</Text>
                      <Text style={styles.feeAmount}>${fee.total_fees}</Text>
                    </View>
                    <View style={styles.feeInfo}>
                      <Text style={styles.feeLabel}>Paid:</Text>
                      <Text style={styles.feeAmount}>${fee.paid_fees}</Text>
                    </View>
                    <View style={styles.feeInfo}>
                      <Text style={styles.feeLabel}>Balance:</Text>
                      <Text style={[
                        styles.feeAmount,
                        { color: fee.total_fees - fee.paid_fees > 0 ? '#E53935' : '#4CAF50' }
                      ]}>
                        ${fee.total_fees - fee.paid_fees}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { 
                            width: `${(fee.paid_fees / fee.total_fees) * 100}%`,
                            backgroundColor: fee.paid_fees / fee.total_fees >= 1 ? '#4CAF50' : '#5D3FD3'
                          }
                        ]} />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round((fee.paid_fees / fee.total_fees) * 100)}% paid
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No fees records found</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
  },
  horizontalList: {
    paddingVertical: 8,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBF8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  selectedItem: {
    backgroundColor: '#5D3FD3',
  },
  classText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#5D3FD3',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  listContent: {
    paddingBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  studentAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentAdmNo: {
    fontSize: 14,
    color: '#777',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  studentHeaderInfo: {
    flex: 1,
  },
  studentHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  studentHeaderDetails: {
    fontSize: 14,
    color: '#777',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EBF8',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#5D3FD3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777',
  },
  activeTabText: {
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  attendanceItem: {
    marginBottom: 12,
  },
  attendanceMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5D3FD3',
  },
  attendanceText: {
    fontSize: 12,
    color: '#777',
  },
  progressText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0EBF8',
    paddingVertical: 10,
  },
  tableHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#5D3FD3',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    color: '#555',
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  reportItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportScore: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  reportPeriod: {
    fontSize: 12,
    color: '#777',
  },
  feeItem: {
    marginBottom: 16,
  },
  feeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#555',
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});

export default ClassesTab;