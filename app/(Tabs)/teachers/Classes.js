import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, Dimensions, Image, Modal, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
    reports: [], 
    fees: []
  });
  const [displayOption, setDisplayOption] = useState('progress');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherClass, setTeacherClass] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [absentReasons, setAbsentReasons] = useState({});
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState('Morning');
  const [attendanceFilter, setAttendanceFilter] = useState('today');

  useEffect(() => {
    fetchClasses();
    fetchTeacherClass();
  }, []);

  const fetchTeacherClass = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('teachers')
        .select('class_teacher')
        .eq('tsc_number', user.user_metadata?.tsc_number)
        .single();

      if (error) throw error;
      if (data.class_teacher) {
        setTeacherClass(data.class_teacher);
        setSelectedClass(data.class_teacher);
        fetchStudentsByClass(data.class_teacher);
      }
    } catch (error) {
      console.error('Error fetching teacher class:', error);
    }
  };

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class')
        .neq('class', null);

      if (error) throw error;

      const uniqueClasses = [...new Set(data.map(item => item.class))];
      
      if (teacherClass) {
        const teacherClassIndex = uniqueClasses.indexOf(teacherClass);
        if (teacherClassIndex > -1) {
          uniqueClasses.splice(teacherClassIndex, 1);
          uniqueClasses.unshift(teacherClass);
        }
      }

      setClasses(uniqueClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsByClass = async (className) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class', className)
        .order('name', { ascending: true });

      if (error) throw error;

      const randomizedStudents = [...data].sort(() => Math.random() - 0.5);
      setStudents(randomizedStudents);

      const initialRecords = {};
      const initialReasons = {};
      randomizedStudents.forEach(student => {
        initialRecords[student.adm_no] = 'present';
        initialReasons[student.adm_no] = '';
      });
      setAttendanceRecords(initialRecords);
      setAbsentReasons(initialReasons);

      if (randomizedStudents.length > 0) {
        const randomIndex = Math.floor(Math.random() * randomizedStudents.length);
        setSelectedStudent(randomizedStudents[randomIndex]);
        fetchStudentDetails(randomizedStudents[randomIndex].adm_no);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async (admNo) => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (attendanceFilter) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'threeMonths':
          startDate.setMonth(now.getMonth() - 3);
          break;
        default:
          startDate = now;
      }
  
      const fetchSubjectNames = async (subjectIds) => {
        if (!subjectIds || subjectIds.length === 0) return {};
        
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
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];
  
      // Fetch attendance data
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('adm_no', admNo)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });
  
      // Fetch scores data with subject names (no term filter since it's not in the schema)
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          subjects:subject_id (subject_name)
        `)
        .eq('adm_no', admNo);

      if (scoresError) throw scoresError;
  
      // Fetch reports data with term filter (using period column)
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', admNo)
        .eq('period', selectedTerm);
  
      // Only fetch fees if the teacher is the class teacher
      let feesData = [];
      if (teacherClass === selectedClass) {
        const { data: fees } = await supabase
          .from('fees')
          .select('*')
          .eq('adm_no', admNo);
        feesData = fees || [];
      }
  
      setStudentDetails({
        attendance: attendanceData || [],
        scores: scoresData || [],
        reports: reportsData || [],
        fees: feesData
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAttendanceDate(selectedDate);
    }
  };

  const handleAttendanceChange = (admNo, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [admNo]: status
    }));
  };

  const handleReasonChange = (admNo, reason) => {
    setAbsentReasons(prev => ({
      ...prev,
      [admNo]: reason
    }));
  };

  const submitAttendance = async () => {
    setIsMarkingAttendance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
  
      const dateStr = attendanceDate.toISOString().split('T')[0];
      const month = attendanceDate.toLocaleString('default', { month: 'long' });
      const year = attendanceDate.getFullYear();
      
      // Check for existing attendance for each student
      const attendanceChecks = await Promise.all(
        students.map(async student => {
          const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('adm_no', student.adm_no)
            .eq('date', dateStr)
            .eq('session', attendanceSession);
          
          if (error) throw error;
          return data && data.length > 0;
        })
      );
      
      if (attendanceChecks.some(check => check)) {
        throw new Error('Attendance already marked for this session on selected date');
      }
  
      const recordsToInsert = students.map(student => ({
        adm_no: student.adm_no,
        date: dateStr,
        status: attendanceRecords[student.adm_no],
        reason: attendanceRecords[student.adm_no] === 'absent' ? absentReasons[student.adm_no] : null,
        month,
        year,
        term: selectedTerm,
        teacher_tsc_number: user.user_metadata?.tsc_number,
        attendance: attendanceRecords[student.adm_no] === 'present' ? 1 : 0,
        total_days: 1,
        session: attendanceSession,
        notes: '',
        modified_at: new Date().toISOString()
      }));
  
      const { error } = await supabase
        .from('attendance')
        .insert(recordsToInsert);
  
      if (error) throw error;
  
      Alert.alert('Success', 'Attendance marked successfully');
      setShowAttendanceModal(false);
      if (selectedStudent) {
        fetchStudentDetails(selectedStudent.adm_no);
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const downloadAttendanceSheet = async () => {
    try {
      if (!selectedClass || students.length === 0) {
        Alert.alert('Error', 'No students data available to download');
        return;
      }

      const dateStr = attendanceDate.toISOString().split('T')[0];
      const formattedDate = attendanceDate.toLocaleDateString();
      
      let csvContent = 'Admission No,Name,Status,Date,Class,Session\n';
      
      students.forEach(student => {
        const status = attendanceRecords[student.adm_no] === 'late' ? 'present' : 
                       attendanceRecords[student.adm_no] === 'excused' ? 'absent' : 
                       attendanceRecords[student.adm_no];
        csvContent += `${student.adm_no},${student.name},${status},${formattedDate},${selectedClass},${attendanceSession}\n`;
      });

      const fileUri = FileSystem.documentDirectory + `attendance_${selectedClass}_${dateStr}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Attendance Sheet - ${selectedClass} - ${formattedDate}`,
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Error downloading attendance sheet:', error);
      Alert.alert('Error', 'Failed to download attendance sheet');
    }
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.classItem,
        selectedClass === item && styles.selectedItem,
        teacherClass === item && styles.teacherClassItem
      ]}
      onPress={() => {
        setSelectedClass(item);
        fetchStudentsByClass(item);
        setSelectedStudent(null);
      }}
    >
      <MaterialCommunityIcons 
        name={selectedClass === item ? 'account-group' : 'account-group-outline'} 
        size={24} 
        color={teacherClass === item ? '#fff' : '#5D3FD3'} 
      />
      <Text style={[
        styles.classText,
        teacherClass === item && styles.teacherClassText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderAttendanceSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="calendar-today" size={20} color="#5D3FD3" />
        <Text style={styles.cardTitle}>Attendance</Text>
        <Picker
          selectedValue={attendanceFilter}
          style={styles.smallPicker}
          onValueChange={(itemValue) => {
            setAttendanceFilter(itemValue);
            fetchStudentDetails(selectedStudent.adm_no);
          }}
          dropdownIconColor="#5D3FD3"
        >
          <Picker.Item label="Today" value="today" />
          <Picker.Item label="Last Week" value="week" />
          <Picker.Item label="Last Month" value="month" />
          <Picker.Item label="Last 3 Months" value="threeMonths" />
        </Picker>
      </View>
      {studentDetails.attendance.length > 0 ? (
        <View style={styles.attendanceTable}>
          <View style={styles.attendanceTableHeader}>
            <Text style={styles.attendanceTableHeaderText}>Date</Text>
            <Text style={styles.attendanceTableHeaderText}>Session</Text>
            <Text style={styles.attendanceTableHeaderText}>Status</Text>
          </View>
          {studentDetails.attendance.map((att, index) => (
            <View key={index} style={styles.attendanceTableRow}>
              <Text style={styles.attendanceTableCell}>
                {new Date(att.date).toLocaleDateString()}
              </Text>
              <Text style={styles.attendanceTableCell}>{att.session}</Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: 
                    att.status === 'present' ? '#4CAF50' : 
                    att.status === 'absent' ? '#F44336' :
                    att.status === 'late' ? '#FFC107' : '#9C27B0'
                }
              ]}>
                <Text style={styles.statusText}>{att.status}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No attendance records found</Text>
      )}
    </View>
  );

  const renderReportsSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="description" size={20} color="#5D3FD3" />
        <Text style={styles.cardTitle}>Reports</Text>
      </View>
      {studentDetails.reports.length > 0 ? (
        studentDetails.reports.map((report, index) => (
          <View key={index} style={styles.reportItem}>
            <Text style={styles.reportType}>{report.report_type}</Text>
            <Text style={styles.reportContent}>{report.content}</Text>
            <Text style={styles.reportPeriod}>Term: {report.period}</Text>
            <Text style={styles.reportDate}>
              {new Date(report.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No reports found</Text>
      )}
    </View>
  );

  const renderAcademicPerformance = () => (
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
                <Text style={styles.tableCell}>{score.subjects.subject_name}</Text>
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Class Management</Text>
        {teacherClass && (
          <Text style={styles.subtitle}>Class Teacher: {teacherClass}</Text>
        )}
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
            renderItem={renderClassItem}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {selectedClass && (
        <View style={styles.section}>
          <View style={styles.classHeader}>
            <Text style={styles.sectionTitle}>Students in {selectedClass}</Text>
            {teacherClass === selectedClass && (
              <View style={styles.attendanceButtonsContainer}>
                <TouchableOpacity
                  style={[styles.markAttendanceButton, { marginRight: 8 }]}
                  onPress={() => setShowAttendanceModal(true)}
                >
                  <MaterialIcons name="event-available" size={20} color="#fff" />
                  <Text style={styles.markAttendanceButtonText}>Mark Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.markAttendanceButton, { backgroundColor: '#4CAF50' }]}
                  onPress={downloadAttendanceSheet}
                >
                  <MaterialIcons name="file-download" size={20} color="#fff" />
                  <Text style={styles.markAttendanceButtonText}>Download Sheet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
            {teacherClass === selectedClass && (
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
            )}
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

              {renderAttendanceSection()}
              {renderAcademicPerformance()}
              {renderReportsSection()}
            </>
          )}

          {displayOption === 'fees' && teacherClass === selectedClass && (
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

      <Modal
        visible={showAttendanceModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>Date:</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{attendanceDate.toDateString()}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#5D3FD3" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={attendanceDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={styles.sessionPickerContainer}>
            <Text style={styles.sessionLabel}>Session:</Text>
            <Picker
              selectedValue={attendanceSession}
              style={styles.sessionPicker}
              onValueChange={(itemValue) => setAttendanceSession(itemValue)}
              dropdownIconColor="#5D3FD3"
            >
              <Picker.Item label="Morning" value="Morning" />
              <Picker.Item label="Afternoon" value="Afternoon" />
            </Picker>
          </View>

          <ScrollView style={styles.attendanceList}>
            {students.map(student => (
              <View key={student.adm_no} style={styles.attendanceRecord}>
                <View style={styles.studentInfoContainer}>
                  {renderAvatar(student)}
                  <View style={styles.studentInfoText}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentAdmNo}>{student.adm_no}</Text>
                  </View>
                </View>
                
                <View style={styles.attendanceOptions}>
                  <TouchableOpacity
                    style={[
                      styles.attendanceOption,
                      attendanceRecords[student.adm_no] === 'present' && styles.selectedOption
                    ]}
                    onPress={() => handleAttendanceChange(student.adm_no, 'present')}
                  >
                    <Text style={[
                      styles.optionText,
                      attendanceRecords[student.adm_no] === 'present' && styles.selectedOptionText
                    ]}>
                      Present
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.attendanceOption,
                      attendanceRecords[student.adm_no] === 'absent' && styles.selectedOptionAbsent
                    ]}
                    onPress={() => handleAttendanceChange(student.adm_no, 'absent')}
                  >
                    <Text style={[
                      styles.optionText,
                      attendanceRecords[student.adm_no] === 'absent' && styles.selectedOptionText
                    ]}>
                      Absent
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.attendanceOption,
                      attendanceRecords[student.adm_no] === 'late' && styles.selectedOptionLate
                    ]}
                    onPress={() => handleAttendanceChange(student.adm_no, 'late')}
                  >
                    <Text style={[
                      styles.optionText,
                      attendanceRecords[student.adm_no] === 'late' && styles.selectedOptionText
                    ]}>
                      Late
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.attendanceOption,
                      attendanceRecords[student.adm_no] === 'excused' && styles.selectedOptionExcused
                    ]}
                    onPress={() => handleAttendanceChange(student.adm_no, 'excused')}
                  >
                    <Text style={[
                      styles.optionText,
                      attendanceRecords[student.adm_no] === 'excused' && styles.selectedOptionText
                    ]}>
                      Excused
                    </Text>
                  </TouchableOpacity>
                </View>

                {['absent', 'late', 'excused'].includes(attendanceRecords[student.adm_no]) && (
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Enter reason..."
                    value={absentReasons[student.adm_no]}
                    onChangeText={(text) => handleReasonChange(student.adm_no, text)}
                  />
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAttendanceModal(false)}
              disabled={isMarkingAttendance}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitAttendance}
              disabled={isMarkingAttendance}
            >
              {isMarkingAttendance ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Attendance</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  section: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  markAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6f42c1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
  },
  markAttendanceButtonText: {
    color: '#ffffff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 8,
  },
  horizontalList: {
    paddingVertical: 8,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 100,
    justifyContent: 'center',
    elevation: 1,
  },
  selectedItem: {
    backgroundColor: '#6f42c1',
  },
  teacherClassItem: {
    backgroundColor: '#6f42c1',
    borderWidth: 1,
    borderColor: '#5a32a3',
  },
  classText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
    color: '#495057',
  },
  teacherClassText: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
    color: '#6c757d',
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: '#212529',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 8,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
  },
  studentAdmNo: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  studentHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  studentHeaderDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6f42c1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#ffffff',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  picker: {
    height: 46,
    color: '#212529',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 8,
  },
  attendanceTable: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  attendanceTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    paddingVertical: 10,
  },
  attendanceTableHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#495057',
  },
  attendanceTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  attendanceTableCell: {
    flex: 1,
    textAlign: 'center',
    color: '#495057',
    fontSize: 14,
  },
  statusBadge: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#495057',
    fontSize: 14,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
    color: '#495057',
    fontSize: 14,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  gradeBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 'auto', // Centers the badge in its cell
    elevation: 1,
  },
  gradeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  reportItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  reportScore: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 2,
  },
  reportPeriod: {
    fontSize: 12,
    color: '#6c757d',
  },
  feeItem: {
    marginBottom: 12,
  },
  feeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feeLabel: {
    fontSize: 14,
    color: '#495057',
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  noDataText: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  sessionPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sessionLabel: {
    fontSize: 15,
    marginRight: 10,
    color: '#495057',
    fontWeight: '500',
  },
  sessionPicker: {
    flex: 1,
    height: 46,
    color: '#212529',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dateLabel: {
    fontSize: 15,
    marginRight: 10,
    color: '#495057',
    fontWeight: '500',
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  attendanceList: {
    flex: 1,
    padding: 12,
  },
  attendanceRecord: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  smallPicker: {
    width: 120,
    height: 30,
    fontSize: 12,
  },
  studentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentInfoText: {
    marginLeft: 12,
  },
  attendanceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 4,
  },
  attendanceOption: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  selectedOption: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  selectedOptionAbsent: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  selectedOptionLate: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  selectedOptionExcused: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  optionText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#6f42c1',
    alignItems: 'center',
    elevation: 2,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default ClassesTab;