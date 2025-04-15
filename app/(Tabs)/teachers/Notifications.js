import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  StyleSheet, Modal, TextInput, ActivityIndicator 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import supabase from '../../supabase';

const NotificationsScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [recipientId, setRecipientId] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teacherClass, setTeacherClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentAdmNo, setStudentAdmNo] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchTeacherClass();
    fetchNotifications();
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
      if (data?.class_teacher) {
        setTeacherClass(data.class_teacher);
        setSelectedClass(data.class_teacher);
        fetchStudentsByClass(data.class_teacher);
      }
    } catch (error) {
      console.error('Error fetching teacher class:', error);
    }
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class')
        .neq('class', null);

      if (error) throw error;

      // Get unique classes
      const uniqueClasses = [...new Set(data.map(item => item.class))];
      
      // If teacher is a class teacher, move their class to the front
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
      setLoading(false);
    }
  };

  const fetchStudentsByClass = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, adm_no')
        .eq('class', classId);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // First get all notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no teacher class (not a class teacher), only show 'all' notifications
      if (!teacherClass) {
        const allNotifications = notificationsData.filter(n => n.recipient_type === 'all');
        setNotifications(allNotifications);
        return;
      }

      // For class teachers, we need to check student classes
      const filteredNotifications = [];
      
      for (const notification of notificationsData) {
        // Always include 'all' notifications
        if (notification.recipient_type === 'all') {
          filteredNotifications.push(notification);
          continue;
        }

        // Include class notifications for the teacher's class
        if (notification.recipient_type === 'class' && 
            notification.recipient_id === teacherClass) {
          filteredNotifications.push(notification);
          continue;
        }

        // For student notifications, verify the student's class
        if (notification.recipient_type === 'student') {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('class')
            .eq('adm_no', notification.recipient_id)
            .single();

          if (!studentError && studentData && studentData.class === teacherClass) {
            filteredNotifications.push(notification);
          }
        }
      }

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in the title and content.');
      return;
    }

    if (recipientType !== 'all' && !recipientId.trim() && !studentAdmNo.trim()) {
      alert(`Please provide a ${recipientType === 'class' ? 'Class' : 'Admission No'}.`);
      return;
    }

    setLoading(true);
    try {
      // For student recipient type, verify the student exists and is in teacher's class
      if (recipientType === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('class')
          .eq('adm_no', studentAdmNo)
          .single();

        if (studentError || !studentData) {
          throw new Error('Student not found');
        }

        if (teacherClass && studentData.class !== teacherClass) {
          throw new Error('Student is not in your class');
        }
      }

      const finalRecipientId = recipientType === 'student' ? studentAdmNo : recipientId;

      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            title,
            content,
            recipient_type: recipientType,
            recipient_id: recipientType === 'all' ? null : finalRecipientId,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      fetchNotifications();
      setModalVisible(false);
      setTitle('');
      setContent('');
      setRecipientType('all');
      setRecipientId('');
      setStudentAdmNo('');
    } catch (error) {
      console.error('Error sending notification:', error.message);
      alert(error.message || 'Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      
      <ScrollView>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <Text style={styles.notificationDate}>
                {new Date(notification.created_at).toLocaleString()}
              </Text>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.content}</Text>
              <Text style={styles.notificationRecipient}>
                Sent to: {notification.recipient_type === 'all' 
                  ? 'All' 
                  : notification.recipient_type === 'class' 
                  ? `Class ${notification.recipient_id}` 
                  : `Student (Admission No: ${notification.recipient_id})`}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No notifications available</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.announcementButton} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.announcementButtonText}>Make an announcement</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Make an Announcement</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />
            
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Content"
              value={content}
              onChangeText={setContent}
              multiline
            />
            
            <Picker
              selectedValue={recipientType}
              style={styles.picker}
              onValueChange={(itemValue) => {
                setRecipientType(itemValue);
                setRecipientId('');
                setStudentAdmNo('');
              }}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Class" value="class" />
              <Picker.Item label="Student" value="student" />
            </Picker>
            
            {recipientType === 'class' && (
              <Picker
                selectedValue={recipientId}
                style={styles.picker}
                onValueChange={(itemValue) => setRecipientId(itemValue)}
              >
                <Picker.Item label="Select a class" value="" />
                {classes.map((classItem) => (
                  <Picker.Item 
                    key={classItem} 
                    label={`Class ${classItem}`} 
                    value={classItem} 
                  />
                ))}
              </Picker>
            )}
            
            {recipientType === 'student' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Student Admission Number"
                  value={studentAdmNo}
                  onChangeText={setStudentAdmNo}
                  keyboardType="numeric"
                />
                {teacherClass && (
                  <Text style={styles.noteText}>
                    Note: You can only send to students in your class ({teacherClass})
                  </Text>
                )}
              </>
            )}
            
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSendNotification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 20,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 18,
    shadowColor: '#74b9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#0984e3',
  },
  notificationDate: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2d3436',
  },
  notificationMessage: {
    fontSize: 15,
    marginBottom: 10,
    color: '#555',
    lineHeight: 22,
  },
  notificationRecipient: {
    fontSize: 13,
    color: '#0984e3',
    fontWeight: '600',
    backgroundColor: 'rgba(152, 193, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
  },
  announcementButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  announcementButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2d3436',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 18,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  sendButton: {
    backgroundColor: '#00b894',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#00b894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonText: {
    color: '#636e72',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default NotificationsScreen;