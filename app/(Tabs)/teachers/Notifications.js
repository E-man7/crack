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
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  notificationRecipient: {
    fontSize: 14,
    color: '#777',
  },
  viewAllButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
  },
});

export default NotificationsScreen;
