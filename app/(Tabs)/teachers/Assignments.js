import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Button, ScrollView, Platform, Alert, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import supabase from '../../supabase';

const AssignmentsScreen = () => {
  const [assignments, setAssignments] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [newAssignment, setNewAssignment] = useState({
    name: '',
    description: '',
    deadline: new Date(),
    points: '',
    submissionType: 'file',
    attachments: [],
    category: '',
    status: 'Not started',
  });

  const [reminder, setReminder] = useState({
    title: '',
    content: '',
    recipientType: 'all',
    recipientId: '',
    reminderDate: new Date(),
  });

  // Fetch assignments and subjects on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData);
        setRecentAssignments(assignmentsData.slice(0, 5));

        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*');

        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData.map((subject) => subject.name)); // Assuming the table has a 'name' column
      } catch (error) {
        console.error('Error fetching data:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle file uploads
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/zip'],
        multiple: true,
      });

      if (!result.canceled) {
        const uploadedFiles = await Promise.all(
          result.assets.map(async (file) => {
            const { data, error } = await supabase
              .storage
              .from('assignment_files')
              .upload(`assignments/${file.name}`, file.uri, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.mimeType,
                onUploadProgress: (progressEvent) => {
                  const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                  setUploadProgress(progress);
                },
              });

            if (error) throw error;

            // Save file metadata to assignment_files table
            const { data: fileData, error: fileError } = await supabase
              .from('assignment_files')
              .insert([
                {
                  assignment_id: newAssignment.id || editingAssignment.id,
                  file_url: data.path,
                  file_name: file.name,
                  uploaded_by: supabase.auth.user()?.id,
                },
              ])
              .select()
              .single();

            if (fileError) throw fileError;

            return fileData;
          })
        );

        setFiles([...files, ...uploadedFiles]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to upload files.');
    }
  };

  // Delete a file from the uploaded files list
  const handleDeleteFile = async (index) => {
    try {
      const fileToDelete = files[index];

      // Delete file from storage
      const { error: storageError } = await supabase
        .storage
        .from('assignment_files')
        .remove([fileToDelete.file_url]);

      if (storageError) throw storageError;

      // Delete file metadata from assignment_files table
      const { error: dbError } = await supabase
        .from('assignment_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (dbError) throw dbError;

      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
    } catch (error) {
      console.error('File deletion error:', error);
      Alert.alert('Error', 'Failed to delete file.');
    }
  };

  // Preview or download a file
  const handlePreviewFile = async (fileUrl) => {
    try {
      const { data: { publicUrl } } = supabase
        .storage
        .from('assignment_files')
        .getPublicUrl(fileUrl);

      await Linking.openURL(publicUrl);
    } catch (error) {
      console.error('File preview error:', error);
      Alert.alert('Error', 'Failed to open file.');
    }
  };

  // Handle assignment submission
  const handleAssignmentSubmit = async () => {
    try {
      const pointsValue = newAssignment.points.trim() === '' ? 0 : parseInt(newAssignment.points, 10);
      if (isNaN(pointsValue)) {
        throw new Error('Points must be a valid number.');
      }

      const { data, error } = await supabase
        .from('assignments')
        .insert([
          {
            name: newAssignment.name,
            description: newAssignment.description,
            deadline: newAssignment.deadline.toISOString(),
            status: 'Not started',
            attachments: files.map((file) => file.file_url),
            category: newAssignment.category,
            points: pointsValue,
            submission_type: newAssignment.submissionType,
            subjects: selectedSubjects,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await sendNotification(
        `New Assignment: ${newAssignment.name}`,
        `Deadline: ${newAssignment.deadline.toDateString()}`
      );

      setAssignments([...assignments, data]);
      setIsAssignmentModalVisible(false);
      setNewAssignment({
        name: '',
        description: '',
        deadline: new Date(),
        points: '',
        submissionType: 'file',
        attachments: [],
        category: '',
        status: 'Not started',
      });
      setFiles([]);
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Error submitting assignment:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  // Handle assignment update
  const handleAssignmentUpdate = async () => {
    try {
      const pointsValue = editingAssignment.points.trim() === '' ? 0 : parseInt(editingAssignment.points, 10);
      if (isNaN(pointsValue)) {
        throw new Error('Points must be a valid number.');
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          name: editingAssignment.name,
          description: editingAssignment.description,
          deadline: editingAssignment.deadline.toISOString(),
          status: editingAssignment.status,
          attachments: files.map((file) => file.file_url),
          category: editingAssignment.category,
          points: pointsValue,
          submission_type: editingAssignment.submissionType,
          subjects: selectedSubjects,
        })
        .eq('id', editingAssignment.id)
        .select()
        .single();

      if (error) throw error;

      const updatedAssignments = assignments.map((assignment) =>
        assignment.id === editingAssignment.id ? data : assignment
      );
      setAssignments(updatedAssignments);
      setIsEditModalVisible(false);
      setEditingAssignment(null);
      setFiles([]);
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Error updating assignment:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  // Save reminder function
  const saveReminder = async () => {
    try {
      // Validate reminder data
      if (!reminder.title || !reminder.content || !reminder.reminderDate) {
        throw new Error('Please fill in all fields.');
      }

      // Save reminder to the database
      const { data, error } = await supabase
        .from('reminders')
        .insert([
          {
            title: reminder.title,
            content: reminder.content,
            recipient_type: reminder.recipientType,
            recipient_id: reminder.recipientId || null, // Only include if recipientType is 'specific'
            reminder_date: reminder.reminderDate.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Schedule a local notification for the reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.content,
        },
        trigger: {
          date: reminder.reminderDate,
        },
      });

      // Reset the reminder state and close the modal
      setReminder({
        title: '',
        content: '',
        recipientType: 'all',
        recipientId: '',
        reminderDate: new Date(),
      });
      setIsReminderModalVisible(false);

      Alert.alert('Success', 'Reminder saved and notification scheduled.');
    } catch (error) {
      console.error('Error saving reminder:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  // Render assignment card
  const renderAssignmentCard = ({ item }) => {
    let iconColor = '#000';
    let iconName = 'info';

    switch (item.status) {
      case 'Submitted':
        iconName = 'check-circle';
        iconColor = '#4CAF50';
        break;
      case 'In Progress':
        iconName = 'access-time';
        iconColor = '#FFC107';
        break;
      case 'Graded':
        iconName = 'grade';
        iconColor = '#2196F3';
        break;
      case 'Not Started':
        iconName = 'cancel';
        iconColor = '#F44336';
        break;
    }

    // Ensure subjects is an array
    const subjects = item.subjects || [];

    return (
      <TouchableOpacity
        style={[styles.assignmentCard, { backgroundColor: '#AEF5F8' }]}
        onPress={() => {
          setEditingAssignment(item);
          setIsEditModalVisible(true);
        }}
      >
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentText}>{item.name}</Text>
          <Text style={styles.assignmentText}>Deadline: {new Date(item.deadline).toDateString()}</Text>
          <Text style={styles.assignmentText}>Subjects: {subjects.join(', ')}</Text>
          <Text style={styles.assignmentText}>Status: {item.status}</Text>
        </View>
        <Picker
          selectedValue={item.status}
          style={styles.statusPicker}
          onValueChange={(value) => handleStatusUpdate(item.id, value)}
        >
          <Picker.Item label="Not started" value="Not started" />
          <Picker.Item label="In progress" value="In progress" />
          <Picker.Item label="Submitted" value="Submitted" />
        </Picker>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Recent Assignments */}
      <Text style={styles.sectionTitle}>Recent Assignments</Text>
      <FlatList
        horizontal
        data={recentAssignments}
        renderItem={renderAssignmentCard}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
      />

      {/* All Assignments */}
      <Text style={styles.sectionTitle}>All Assignments</Text>
      <FlatList data={assignments} renderItem={renderAssignmentCard} keyExtractor={(item) => item.id.toString()} />

      {/* Buttons at the bottom */}
      <View style={styles.bottomButtons}>
        <Button title="Add Assignment" onPress={() => setIsAssignmentModalVisible(true)} />
        <Button title="Set Reminder" onPress={() => setIsReminderModalVisible(true)} />
      </View>

      {/* Assignment Modal */}
      <Modal visible={isAssignmentModalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Button title="Back" onPress={() => setIsAssignmentModalVisible(false)} />
          <TextInput
            style={styles.input}
            placeholder="Assignment Name"
            value={newAssignment.name}
            onChangeText={(text) => setNewAssignment({ ...newAssignment, name: text })}
          />

          {/* Subject Selection */}
          <Text style={styles.label}>Select Subject(s):</Text>
          {subjects.map((subject, index) => (
            <TouchableOpacity
              key={index}
              style={styles.classOption}
              onPress={() => {
                if (selectedSubjects.includes(subject)) {
                  setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
                } else {
                  setSelectedSubjects([...selectedSubjects, subject]);
                }
              }}
            >
              <Text style={selectedSubjects.includes(subject) ? styles.selectedClass : styles.classText}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Date Picker */}
          <Button title="Pick Deadline" onPress={() => setShowDatePicker(true)} />
          {showDatePicker && (
            <DateTimePicker
              value={newAssignment.deadline || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setNewAssignment({ ...newAssignment, deadline: date });
              }}
            />
          )}

          {/* File Upload */}
          <Button title="Upload Files" onPress={handleFileUpload} />
          {files.map((file, index) => (
            <View key={index} style={styles.filePreview}>
              <Text style={styles.fileText}>{file.file_name}</Text>
              <Icon name="delete" size={20} color="#F44336" onPress={() => handleDeleteFile(index)} />
              <Icon name="visibility" size={20} color="#2196F3" onPress={() => handlePreviewFile(file.file_url)} />
            </View>
          ))}

          <Button title="Create Assignment" onPress={handleAssignmentSubmit} />
        </ScrollView>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal visible={isEditModalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Button title="Back" onPress={() => setIsEditModalVisible(false)} />
          <TextInput
            style={styles.input}
            placeholder="Assignment Name"
            value={editingAssignment?.name}
            onChangeText={(text) => setEditingAssignment({ ...editingAssignment, name: text })}
          />

          {/* Subject Selection */}
          <Text style={styles.label}>Select Subject(s):</Text>
          {subjects.map((subject, index) => (
            <TouchableOpacity
              key={index}
              style={styles.classOption}
              onPress={() => {
                if (selectedSubjects.includes(subject)) {
                  setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
                } else {
                  setSelectedSubjects([...selectedSubjects, subject]);
                }
              }}
            >
              <Text style={selectedSubjects.includes(subject) ? styles.selectedClass : styles.classText}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Date Picker */}
          <Button title="Pick Deadline" onPress={() => setShowDatePicker(true)} />
          {showDatePicker && (
            <DateTimePicker
              value={editingAssignment?.deadline || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setEditingAssignment({ ...editingAssignment, deadline: date });
              }}
            />
          )}

          {/* File Upload */}
          <Button title="Upload Files" onPress={handleFileUpload} />
          {files.map((file, index) => (
            <View key={index} style={styles.filePreview}>
              <Text style={styles.fileText}>{file.file_name}</Text>
              <Icon name="delete" size={20} color="#F44336" onPress={() => handleDeleteFile(index)} />
              <Icon name="visibility" size={20} color="#2196F3" onPress={() => handlePreviewFile(file.file_url)} />
            </View>
          ))}

          <Button title="Update Assignment" onPress={handleAssignmentUpdate} />
        </ScrollView>
      </Modal>

      {/* Reminder Modal */}
      <Modal visible={isReminderModalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Button title="Back" onPress={() => setIsReminderModalVisible(false)} />
          <TextInput
            style={styles.input}
            placeholder="Reminder Title"
            value={reminder.title}
            onChangeText={(text) => setReminder({ ...reminder, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Reminder Content"
            value={reminder.content}
            onChangeText={(text) => setReminder({ ...reminder, content: text })}
          />

          {/* Recipient Type Selection */}
          <Picker
            selectedValue={reminder.recipientType}
            style={styles.input}
            onValueChange={(value) => setReminder({ ...reminder, recipientType: value })}>
            <Picker.Item label="All" value="all" />
            <Picker.Item label="Specific" value="specific" />
          </Picker>

          {/* Specific Recipient ID */}
          {reminder.recipientType === 'specific' && (
            <TextInput style={styles.input} placeholder="Recipient ID" value={reminder.recipientId} onChangeText={(text) => setReminder({ ...reminder, recipientId: text })} />
          )}

          {/* Reminder Date Picker */}
          <Button title="Pick Reminder Date" onPress={() => setShowReminderDatePicker(true)} />
          {showReminderDatePicker && <DateTimePicker value={reminder.reminderDate || new Date()} mode="date" display="default" onChange={(event, date) => { setShowReminderDatePicker(false); if (date) setReminder({ ...reminder, reminderDate: date }) }} />}

          <Button title="Save Reminder" onPress={saveReminder} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  assignmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentText: {
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileText: {
    marginRight: 8,
    fontSize: 14,
    color: '#666',
  },
  classOption: {
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  selectedClass: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  classText: {
    color: '#333',
  },
  statusPicker: {
    width: 150,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
});

export default AssignmentsScreen;