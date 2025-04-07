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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data);
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

    if (recipientType !== 'all' && !recipientId.trim()) {
      alert(`Please provide a ${recipientType === 'class' ? 'Class (1-9)' : 'Admission No'}.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            title,
            content,
            recipient_type: recipientType,
            recipient_id: recipientType === 'all' ? null : recipientId,
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
    } catch (error) {
      console.error('Error sending notification:', error.message);
      alert('Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
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
                  : `Admission No: ${notification.recipient_id}`}
              </Text>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.announcementButton} onPress={() => setModalVisible(true)}>
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
              onValueChange={(itemValue) => setRecipientType(itemValue)}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Class (1-9)" value="class" />
              <Picker.Item label="Student (Admission No)" value="student" />
            </Picker>
            
            {recipientType !== 'all' && (
              <TextInput
                style={styles.input}
                placeholder={recipientType === 'class' ? 'Class (1-9)' : 'Admission No'}
                value={recipientId}
                onChangeText={setRecipientId}
              />
            )}
            
            <TouchableOpacity style={styles.sendButton} onPress={handleSendNotification}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#2d3436',
    marginBottom: 25,
    textAlign: 'center',
    fontFamily: 'Helvetica',
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
    fontFamily: 'Helvetica',
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
  viewAllButton: {
    backgroundColor: '#0984e3',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0984e3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
    marginTop: 15,
  },
});
export default NotificationsScreen;