import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  StyleSheet, Modal, TextInput, ActivityIndicator,
  ToastAndroid, Alert
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
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchClasses();
    fetchTeacherClass();
    fetchNotifications();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchTeacherClass = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('teachers')
        .select('class_teacher, tsc_number')
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
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      // If user is not a teacher, show only general notifications
      if (!teacherClass) {
        const filteredNotifications = notificationsData.filter(n => 
          n.recipient_type === 'all' || 
          (n.recipient_type === 'class_teacher' && n.recipient_id === null)
        );
        setNotifications(filteredNotifications);
        return;
      }
  
      const filteredNotifications = [];
      
      for (const notification of notificationsData) {
        if (notification.recipient_type === 'all') {
          filteredNotifications.push(notification);
          continue;
        }
  
        if (notification.recipient_type === 'class' && 
            notification.recipient_id === teacherClass) {
          filteredNotifications.push(notification);
          continue;
        }
  
        if (notification.recipient_type === 'class_teacher' && 
            (notification.recipient_id === teacherClass || notification.recipient_id === null)) {
          filteredNotifications.push(notification);
          continue;
        }
  
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
      showToast('Notifications updated');
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
      showToast('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    ToastAndroid.showWithGravity(
      message,
      ToastAndroid.SHORT,
      ToastAndroid.TOP
    );
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('Please fill in the title and content');
      return;
    }
  
    if (recipientType !== 'all' && !recipientId.trim() && !studentAdmNo.trim() && recipientType !== 'class-teacher') {
      showToast(`Please provide a ${recipientType === 'class' ? 'Class' : 'Admission No'}`);
      return;
    }
  
    setLoading(true);
    try {
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
  
      const finalRecipientId = recipientType === 'student' ? studentAdmNo : 
                            (recipientType === 'class-teacher' ? teacherClass : recipientId);
  
      // Get teacher's TSC number from current user metadata
      const tscNumber = currentUser?.user_metadata?.tsc_number;
      if (!tscNumber) {
        throw new Error('Unable to verify your identity');
      }
  
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          title,
          content,
          recipient_type: recipientType,
          recipient_id: recipientType === 'all' ? null : finalRecipientId,
          created_at: new Date().toISOString(),
        }]);
  
      if (error) throw error;
  
      fetchNotifications();
      setModalVisible(false);
      setTitle('');
      setContent('');
      setRecipientType('all');
      setRecipientId('');
      setStudentAdmNo('');
      showToast('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error.message);
      showToast(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id, senderId) => {
    if (!currentUser) {
      showToast('You must be logged in to delete notifications');
      return;
    }
  
    // Get current teacher's TSC number
    const currentTeacherTsc = currentUser?.user_metadata?.tsc_number;
    if (!currentTeacherTsc) {
      showToast('Unable to verify your identity');
      return;
    }
  
    // Verify the notification was sent by this teacher
    if (senderId !== currentTeacherTsc) {
      showToast('You can only delete your own notifications');
      return;
    }
  
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this notification?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
  
              if (error) throw error;
  
              fetchNotifications();
              showToast('Notification deleted');
            } catch (error) {
              console.error('Error deleting notification:', error);
              showToast('Failed to delete notification');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const showNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);
  };

  const getRecipientText = (notification) => {
    switch (notification.recipient_type) {
      case 'all':
        return 'All';
      case 'class':
        return `Class ${notification.recipient_id}`;
      case 'student':
        return `Student (Admission No: ${notification.recipient_id})`;
      case 'class_teacher':
        return notification.recipient_id 
          ? `Class Teacher of ${notification.recipient_id}`
          : 'All Class Teachers';
      default:
        return notification.recipient_type;
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
            <TouchableOpacity 
              key={notification.id} 
              style={styles.notificationCard}
              onPress={() => showNotificationDetail(notification)}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationDate}>
                  {new Date(notification.created_at).toLocaleString()}
                </Text>
                {currentUser && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                    }}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.content}
              </Text>
              <Text style={styles.notificationRecipient}>
                Sent to: {getRecipientText(notification)}
              </Text>
            </TouchableOpacity>
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

      {/* Notification Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedNotification && (
              <>
                <Text style={styles.detailModalTitle}>{selectedNotification.title}</Text>
                <Text style={styles.detailModalDate}>
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </Text>
                <Text style={styles.detailModalRecipient}>
                  To: {getRecipientText(selectedNotification)}
                </Text>
                <ScrollView style={styles.detailModalScroll}>
                  <Text style={styles.detailModalContentText}>
                    {selectedNotification.content}
                  </Text>
                </ScrollView>
                <TouchableOpacity 
                  style={styles.closeDetailButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeDetailButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              {teacherClass && <Picker.Item label="Class Teacher" value="class-teacher" />}
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
            
            {recipientType === 'class-teacher' && teacherClass && (
              <Text style={styles.noteText}>
                This will be sent to the teacher of class {teacherClass}
              </Text>
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
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 12,
    color: '#636e72',
  },
  deleteButton: {
    backgroundColor: '#ff7675',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
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
  detailModalContent: {
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
  detailModalScroll: {
    maxHeight: '70%',
    marginVertical: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2d3436',
  },
  detailModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2d3436',
  },
  detailModalDate: {
    fontSize: 14,
    color: '#636e72',
    marginBottom: 10,
  },
  detailModalRecipient: {
    fontSize: 16,
    color: '#0984e3',
    marginBottom: 15,
    fontWeight: '600',
  },
  detailModalContentText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
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
  closeDetailButton: {
    backgroundColor: '#0984e3',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  closeDetailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default NotificationsScreen;