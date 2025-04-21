import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Button, ScrollView, Alert, Linking, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import supabase from '../../supabase';
  
const AssignmentsScreen = () => {
  const [assignments, setAssignments] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAssignmentsToDelete, setSelectedAssignmentsToDelete] = useState([]);
  const [editingAssignment, setEditingAssignment] = useState({
    id: null,
    name: '',
    description: '',
    content: '',
    deadline: new Date(),
    submissionType: 'file',
    attachments: [],
    category: '',
    status: 'Not started',
    class: null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [teacherComments, setTeacherComments] = useState('');
  const [deletedAssignment, setDeletedAssignment] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [newAssignment, setNewAssignment] = useState({
    name: '',
    description: '',
    content: '',
    deadline: new Date(),
    submissionType: 'file',
    attachments: [],
    category: '',
    status: 'Not started',
    class: null,
  });

  const [reminder, setReminder] = useState({
    title: '',
    content: '',
    recipientType: 'all',
    recipientId: '',
    reminderDate: new Date(),
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentUser) return;
        
        setLoading(true);
        
        // Fetch assignments created by the current user
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('created_by', currentUser.id)
          .order('created_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;

        const assignmentsWithDates = assignmentsData.map(assignment => ({
          ...assignment,
          deadline: assignment.deadline ? new Date(assignment.deadline) : new Date(),
          subjects: Array.isArray(assignment.subjects) ? assignment.subjects : []
        }));

        setAssignments(assignmentsWithDates);
        setRecentAssignments(assignmentsWithDates.slice(0, 5));

        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('subject_name');

        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData.map(subject => subject.subject_name));

        // Fetch classes
        const { data: classesData, error: classesError } = await supabase
          .from('students')
          .select('class')
          .not('class', 'is', null);

        if (classesError) throw classesError;

        const classNames = classesData
          .map(student => student.class)
          .filter(className => className && typeof className === 'string');

        const uniqueClasses = [...new Set(classNames)].sort();
        setClasses(uniqueClasses);

      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleFileUpload = async (isNewAssignment = true) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        multiple: true,
      });
  
      if (!result.canceled && result.assets) {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
  
        if (!user) {
          throw new Error('User not authenticated');
        }
  
        const uploadedFiles = await Promise.all(
          result.assets.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `assignments/${fileName}`;
            
            // Read the file content
            const fileContent = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
  
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('assignments')
              .upload(filePath, FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
              }), {
                contentType: file.mimeType,
                upsert: false,
              });
  
            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw uploadError;
            }
  
            const { data: { publicUrl } } = supabase
              .storage
              .from('assignments')
              .getPublicUrl(uploadData.path);
  
            return {
              file_url: uploadData.path,
              public_url: publicUrl,
              file_name: file.name,
              mimeType: file.mimeType,
              size: file.size,
            };
          })
        );
  
        if (isNewAssignment) {
          // For new assignment
          setNewAssignment(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...uploadedFiles]
          }));
        } else {
          // For editing assignment
          setEditingAssignment(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...uploadedFiles]
          }));
        }
        
        setFiles(prev => [...prev, ...uploadedFiles]);
        Alert.alert('Success', 'Files uploaded successfully');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload files');
    }
  };

  const handleAssignmentSubmit = async () => {
    try {
      if (!newAssignment.name) {
        throw new Error('Assignment name is required');
      }
      if (!newAssignment.content) {
        throw new Error('Assignment content is required');
      }
      if (!selectedClass) {
        throw new Error('Please select a class');
      }
  
      const deadline = newAssignment.deadline ? new Date(newAssignment.deadline) : new Date();
      const pointsValue = newAssignment.points === undefined || newAssignment.points === null || 
                          newAssignment.points.toString().trim() === '' ? 
                          0 : parseInt(newAssignment.points.toString(), 10);
      
      if (isNaN(pointsValue)) {
        throw new Error('Points must be a valid number');
      }
  
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
  
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          name: newAssignment.name,
          description: newAssignment.description,
          content: newAssignment.content,
          deadline: deadline.toISOString(),
          status: 'Not started',
          attachments: newAssignment.attachments.map(file => file.file_url),
          category: newAssignment.category,
          points: pointsValue,
          submission_type: newAssignment.submissionType,
          subjects: selectedSubjects.length > 0 ? selectedSubjects : null,
          class: selectedClass,
          created_by: user?.id
        }])
        .select()
        .single();
  
      if (assignmentError) throw assignmentError;
  
      if (newAssignment.attachments.length > 0) {
        const { error: filesError } = await supabase
        .from('assignment_files')
        .insert(editingAssignment.attachments.map(file => ({
          assignment_id: editingAssignment.id,
          file_url: file.file_url,
          public_url: file.public_url,
          file_name: file.file_name,
          uploaded_by: currentUser?.id,
          teacher_comments: teacherComments,
        })));
  
        if (filesError) throw filesError;
      }

      setAssignments([{
        ...assignmentData,
        deadline: new Date(assignmentData.deadline),
        points: assignmentData.points || 'N/A'
      }, ...assignments]);
      
      setRecentAssignments([{
        ...assignmentData,
        deadline: new Date(assignmentData.deadline),
        points: assignmentData.points || 'N/A'
      }, ...recentAssignments.slice(0, 4)]);

      setNewAssignment({
        name: '',
        description: '',
        content: '',
        deadline: new Date(),
        points: '',
        submissionType: 'file',
        attachments: [],
        category: '',
        status: 'Not started',
        class: null,
      });
      setFiles([]);
      setSelectedSubjects([]);
      setTeacherComments('');
      setIsAssignmentModalVisible(false);
      
      Alert.alert('Success', 'Assignment created successfully');
    } catch (error) {
      console.error('Error submitting assignment:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleEditAssignment = async () => {
    try {
      if (!editingAssignment.name) {
        throw new Error('Assignment name is required');
      }
      if (!editingAssignment.content) {
        throw new Error('Assignment content is required');
      }
      if (!editingAssignment.class) {
        throw new Error('Please select a class');
      }
  
      const deadline = editingAssignment.deadline ? new Date(editingAssignment.deadline) : new Date();
      const pointsValue = editingAssignment.points === undefined || editingAssignment.points === null || 
                          editingAssignment.points.toString().trim() === '' ? 
                          0 : parseInt(editingAssignment.points.toString(), 10);
      
      if (isNaN(pointsValue)) {
        throw new Error('Points must be a valid number');
      }
  
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
  
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .update({
          name: editingAssignment.name,
          description: editingAssignment.description,
          content: editingAssignment.content,
          deadline: deadline.toISOString(),
          status: editingAssignment.status,
          attachments: editingAssignment.attachments.map(file => file.file_url),
          category: editingAssignment.category,
          points: pointsValue,
          submission_type: editingAssignment.submissionType,
          subjects: selectedSubjects.length > 0 ? selectedSubjects : null,
          class: editingAssignment.class,
        })
        .eq('id', editingAssignment.id)
        .select()
        .single();
  
      if (assignmentError) throw assignmentError;
  
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === editingAssignment.id ? {
            ...assignmentData,
            deadline: new Date(assignmentData.deadline),
            points: assignmentData.points || 'N/A',
            subjects: selectedSubjects
          } : assignment
        )
      );
      
      setRecentAssignments(prev => 
        prev.map(assignment => 
          assignment.id === editingAssignment.id ? {
            ...assignmentData,
            deadline: new Date(assignmentData.deadline),
            points: assignmentData.points || 'N/A',
            subjects: selectedSubjects
          } : assignment
        )
      );
  
      setEditingAssignment({
        id: null,
        name: '',
        description: '',
        content: '',
        deadline: new Date(),
        points: '',
        submissionType: 'file',
        attachments: [],
        category: '',
        status: 'Not started',
        class: null,
      });
      setFiles([]);
      setSelectedSubjects([]);
      setIsEditModalVisible(false);
      
      Alert.alert('Success', 'Assignment updated successfully');
    } catch (error) {
      console.error('Error updating assignment:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleViewFile = async (fileUrl) => {
    try {
      const { data: { publicUrl } } = supabase.storage.from('assignments').getPublicUrl(fileUrl);
      const supported = await Linking.canOpenURL(publicUrl);
      if (supported) {
        await Linking.openURL(publicUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const sendReminder = async (assignment) => {
    try {
      if (!assignment) return;

      const deadline = assignment.deadline ? new Date(assignment.deadline) : new Date();
      const reminderDate = new Date(deadline.getTime() - 24 * 60 * 60 * 1000); // 1 day before deadline

      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          title: `Assignment Reminder: ${assignment.name}`,
          content: `Don't forget to complete "${assignment.name}" by ${deadline.toDateString()}`,
          recipient_type: 'class',
          recipient_id: assignment.class,
        }])
        .select()
        .single();

      if (error) throw error;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Assignment Reminder: ${assignment.name}`,
          body: `Due soon: ${assignment.name}`,
        },
        trigger: { date: reminderDate },
      });

      Alert.alert('Success', 'Reminder set for this assignment');
    } catch (error) {
      console.error('Error sending reminder:', error);
      Alert.alert('Error', 'Failed to set reminder');
    }
  };

  const toggleAssignmentSelection = (assignmentId) => {
    setSelectedAssignmentsToDelete(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId) 
        : [...prev, assignmentId]
    );
  };
  
  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .in('id', selectedAssignmentsToDelete);
  
      if (error) throw error;
  
      setAssignments(prev => 
        prev.filter(assignment => !selectedAssignmentsToDelete.includes(assignment.id))
      );
      setRecentAssignments(prev => 
        prev.filter(assignment => !selectedAssignmentsToDelete.includes(assignment.id))
      );
      setSelectedAssignmentsToDelete([]);
      setIsDeleteModalVisible(false);
      Alert.alert('Success', 'Selected assignments deleted successfully');
    } catch (error) {
      console.error('Error deleting assignments:', error);
      Alert.alert('Error', 'Failed to delete assignments');
    }
  };
  
  const handleDeleteAssignment = async (id) => {
    try {
      const assignmentToDelete = assignments.find(a => a.id === id);
      setDeletedAssignment(assignmentToDelete);
      
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
  
      setAssignments(prev => prev.filter(assignment => assignment.id !== id));
      setRecentAssignments(prev => prev.filter(assignment => assignment.id !== id));
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      Alert.alert('Error', 'Failed to delete assignment');
    }
  };
  
  const undoDelete = () => {
    if (deletedAssignment) {
      setAssignments(prev => [deletedAssignment, ...prev]);
      setRecentAssignments(prev => [deletedAssignment, ...prev.slice(0, 4)]);
      setDeletedAssignment(null);
      setShowUndo(false);
    }
  };
  
  const handleStatusUpdate = async (id, status) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);
  
      if (error) throw error;
  
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === id ? { ...assignment, status } : assignment
        )
      );
      setRecentAssignments(prev => 
        prev.map(assignment => 
          assignment.id === id ? { ...assignment, status } : assignment
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };
  
  const saveReminder = async () => {
    try {
      if (!reminder.title) {
        throw new Error('Reminder title is required');
      }
      if (!reminder.content) {
        throw new Error('Reminder content is required');
      }
      if (reminder.recipientType !== 'all' && !reminder.recipientId) {
        throw new Error(`Please select a ${reminder.recipientType}`);
      }
  
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          title: reminder.title,
          content: reminder.content,
          recipient_type: reminder.recipientType,
          recipient_id: reminder.recipientId,
          reminder_date: reminder.reminderDate.toISOString(),
        }])
        .select()
        .single();
  
      if (error) throw error;
  
      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.content,
        },
        trigger: { date: reminder.reminderDate },
      });
  
      setReminder({
        title: '',
        content: '',
        recipientType: 'all',
        recipientId: '',
        reminderDate: new Date(),
      });
      setIsReminderModalVisible(false);
      Alert.alert('Success', 'Reminder set successfully');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', error.message || 'Failed to save reminder');
    }
  };

  const renderAssignmentCard = ({ item }) => {
    const deadline = item.deadline ? new Date(item.deadline) : new Date();
    const subjectsList = Array.isArray(item.subjects) ? item.subjects : [];
    const points = item.points !== undefined && item.points !== null ? item.points : 'N/A';
    const isSelected = selectedAssignmentsToDelete.includes(item.id);
  
    let iconName = 'info';
    let iconColor = '#000';
  
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
  
    return (
      <TouchableOpacity
        style={[
          styles.assignmentCard, 
          { backgroundColor: isSelected ? '#E3F2FD' : '#AEF5F8' }
        ]}
        onPress={() => {
          if (isDeleteModalVisible) {
            toggleAssignmentSelection(item.id);
          } else {
            setEditingAssignment({
              ...item,
              class: item.class || null
            });
            setSelectedSubjects(item.subjects || []);
            setIsEditModalVisible(true);
          }
        }}
        onLongPress={() => toggleAssignmentSelection(item.id)}
      >
        {isDeleteModalVisible && (
          <View style={styles.selectionIndicator}>
            <Icon 
              name={isSelected ? "check-box" : "check-box-outline-blank"} 
              size={24} 
              color={isSelected ? "#2196F3" : "#757575"} 
            />
          </View>
        )}
        
        <View style={styles.assignmentInfo}>
          <View style={styles.assignmentHeader}>
            <Icon name={iconName} size={20} color={iconColor} />
            <Text style={styles.assignmentTitle}>{item.name}</Text>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                sendReminder(item);
              }}
              style={styles.reminderButton}
            >
              <Icon name="notifications" size={20} color="#FF9800" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.assignmentMeta}>
            <Text style={styles.assignmentText}>
              <Icon name="calendar-today" size={14} color="#555" /> {deadline.toDateString()}
            </Text>
            <Text style={styles.assignmentText}>
            </Text>
          </View>
          
          <View style={styles.assignmentMeta}>
            <Text style={styles.assignmentText}>
              <Icon name="class" size={14} color="#555" /> Subjects: {subjectsList.length > 0 ? subjectsList.join(', ') : 'No subjects'}
            </Text>
          </View>
          
          {item.class && (
            <Text style={styles.assignmentText}>
              <Icon name="group" size={14} color="#555" /> Class: {item.class}
            </Text>
          )}
          
          <View style={styles.statusContainer}>
            <Text style={styles.assignmentText}>
              Status: {item.status}
            </Text>
            <Picker
              selectedValue={item.status}
              style={styles.statusPicker}
              onValueChange={(value) => handleStatusUpdate(item.id, value)}
              dropdownIconColor="#555"
            >
              <Picker.Item label="Not started" value="Not started" key="not-started" />
              <Picker.Item label="In progress" value="In progress" key="in-progress" />
              <Picker.Item label="Submitted" value="Submitted" key="submitted" />
            </Picker>
          </View>
        </View>
        
        {!isDeleteModalVisible && (
          <TouchableOpacity 
            onPress={() => handleDeleteAssignment(item.id)}
            style={styles.deleteButton}
          >
            <Icon name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {showUndo && (
        <View style={styles.undoContainer}>
          <Text style={styles.undoText}>Assignment deleted</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.undoButton}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>My Assignments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.deleteActionButton}
            onPress={() => setIsDeleteModalVisible(!isDeleteModalVisible)}
          >
            <Icon name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAssignmentModalVisible(true)}
          >
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>

        </View>
      </View>

      {isDeleteModalVisible && (
        <View style={styles.deleteControls}>
          <Text style={styles.deleteInfoText}>
            {selectedAssignmentsToDelete.length} selected
          </Text>
          <TouchableOpacity 
            style={styles.confirmDeleteButton}
            onPress={handleBulkDelete}
            disabled={selectedAssignmentsToDelete.length === 0}
          >
            <Text style={styles.confirmDeleteText}>Delete Selected</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelDeleteButton}
            onPress={() => {
              setIsDeleteModalVisible(false);
              setSelectedAssignmentsToDelete([]);
            }}
          >
            <Text style={styles.cancelDeleteText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.subSectionTitle}>Recent Assignments</Text>
      <FlatList
        horizontal
        data={recentAssignments}
        renderItem={renderAssignmentCard}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />

      <Text style={styles.subSectionTitle}>All Assignments</Text>
      <FlatList 
        data={assignments} 
        renderItem={renderAssignmentCard} 
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.verticalList}
      />

      {/* Assignment Modal */}
      <Modal visible={isAssignmentModalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsAssignmentModalVisible(false)}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Assignment</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => handleFileUpload(true)}
            >
              <Icon name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Files</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assignment Name*</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter assignment name (required)"
              value={newAssignment.name}
              onChangeText={(text) => setNewAssignment({ ...newAssignment, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assignment Content*</Text>
            <TextInput
              style={[styles.modalInput, { height: 150, textAlignVertical: 'top' }]}
              placeholder="Enter assignment content (required)"
              value={newAssignment.content}
              onChangeText={(text) => setNewAssignment({ ...newAssignment, content: text })}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Class*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedClass}
                onValueChange={(value) => setSelectedClass(value)}
                style={styles.modalPicker}
                dropdownIconColor="#555"
              >
                <Picker.Item label="Select a class" value="" />
                {classes.map((className) => (
                  <Picker.Item 
                    key={className} 
                    label={className} 
                    value={className} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subjects</Text>
            <View style={styles.subjectsContainer}>
              {subjects.map((subject) => (
                <Pressable
                  key={subject}
                  style={[
                    styles.subjectButton,
                    selectedSubjects.includes(subject) && styles.selectedSubjectButton
                  ]}
                  onPress={() => {
                    if (selectedSubjects.includes(subject)) {
                      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
                    } else {
                      setSelectedSubjects([...selectedSubjects, subject]);
                    }
                  }}
                >
                  <Text style={[
                    styles.subjectButtonText,
                    selectedSubjects.includes(subject) && styles.selectedSubjectButtonText
                  ]}>
                    {subject}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Deadline</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="event" size={20} color="#555" />
              <Text style={styles.dateButtonText}>
                {newAssignment.deadline.toDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={newAssignment.deadline}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setNewAssignment({ ...newAssignment, deadline: date });
                }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Attached Files</Text>
  {isAssignmentModalVisible ? (
    newAssignment.attachments.length > 0 ? (
      newAssignment.attachments.map((file, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.fileItem}
          onPress={() => handleViewFile(file.file_url)}
        >
          <Icon name="insert-drive-file" size={20} color="#555" />
          <Text style={styles.fileName}>{file.file_name}</Text>
        </TouchableOpacity>
      ))
    ) : (
      <Text style={styles.noFilesText}>No files attached</Text>
    )
  ) : (
    editingAssignment.attachments.length > 0 ? (
      editingAssignment.attachments.map((file, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.fileItem}
          onPress={() => handleViewFile(file.file_url)}
        >
          <Icon name="insert-drive-file" size={20} color="#555" />
          <Text style={styles.fileName}>{file.file_name}</Text>
        </TouchableOpacity>
      ))
    ) : (
      <Text style={styles.noFilesText}>No files attached</Text>
    )
  )}
</View>

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleAssignmentSubmit}
          >
            <Text style={styles.submitButtonText}>Create Assignment</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Edit Modal */}
<Modal visible={isEditModalVisible} animationType="slide">
  <ScrollView contentContainerStyle={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <TouchableOpacity 
        onPress={() => setIsEditModalVisible(false)}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={24} color="#2196F3" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Edit Assignment</Text>
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => handleFileUpload(false)}
      >
        <Icon name="cloud-upload" size={20} color="#fff" />
        <Text style={styles.uploadButtonText}>Upload Files</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Assignment Name*</Text>
      <TextInput
        style={styles.modalInput}
        placeholder="Enter assignment name (required)"
        value={editingAssignment.name}
        onChangeText={(text) => setEditingAssignment({ ...editingAssignment, name: text })}
      />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Assignment Content*</Text>
      <TextInput
        style={[styles.modalInput, { height: 150, textAlignVertical: 'top' }]}
        placeholder="Enter assignment content (required)"
        value={editingAssignment.content}
        onChangeText={(text) => setEditingAssignment({ ...editingAssignment, content: text })}
        multiline
      />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Class*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={editingAssignment.class}
          onValueChange={(value) => setEditingAssignment({ ...editingAssignment, class: value })}
          style={styles.modalPicker}
          dropdownIconColor="#555"
        >
          <Picker.Item label="Select a class" value="" />
          {classes.map((className) => (
            <Picker.Item 
              key={className} 
              label={className} 
              value={className} 
            />
          ))}
        </Picker>
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Subjects</Text>
      <View style={styles.subjectsContainer}>
        {subjects.map((subject) => (
          <Pressable
            key={subject}
            style={[
              styles.subjectButton,
              selectedSubjects.includes(subject) && styles.selectedSubjectButton
            ]}
            onPress={() => {
              if (selectedSubjects.includes(subject)) {
                setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
              } else {
                setSelectedSubjects([...selectedSubjects, subject]);
              }
            }}
          >
            <Text style={[
              styles.subjectButtonText,
              selectedSubjects.includes(subject) && styles.selectedSubjectButtonText
            ]}>
              {subject}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Deadline</Text>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Icon name="event" size={20} color="#555" />
        <Text style={styles.dateButtonText}>
          {editingAssignment.deadline.toDateString()}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={editingAssignment.deadline}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setEditingAssignment({ ...editingAssignment, deadline: date });
          }}
        />
      )}
    </View>

    <View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Attached Files</Text>
  {isAssignmentModalVisible ? (
    newAssignment.attachments.length > 0 ? (
      newAssignment.attachments.map((file, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.fileItem}
          onPress={() => handleViewFile(file.file_url)}
        >
          <Icon name="insert-drive-file" size={20} color="#555" />
          <Text style={styles.fileName}>{file.file_name}</Text>
        </TouchableOpacity>
      ))
    ) : (
      <Text style={styles.noFilesText}>No files attached</Text>
    )
  ) : (
    editingAssignment.attachments.length > 0 ? (
      editingAssignment.attachments.map((file, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.fileItem}
          onPress={() => handleViewFile(file.file_url)}
        >
          <Icon name="insert-drive-file" size={20} color="#555" />
          <Text style={styles.fileName}>{file.file_name}</Text>
        </TouchableOpacity>
      ))
    ) : (
      <Text style={styles.noFilesText}>No files attached</Text>
    )
  )}
</View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Status</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={editingAssignment.status}
          onValueChange={(value) => setEditingAssignment({ ...editingAssignment, status: value })}
          style={styles.modalPicker}
          dropdownIconColor="#555"
        >
          <Picker.Item label="Not started" value="Not started" />
          <Picker.Item label="In progress" value="In progress" />
          <Picker.Item label="Submitted" value="Submitted" />
          <Picker.Item label="Graded" value="Graded" />
        </Picker>
      </View>
    </View>

    <TouchableOpacity 
      style={styles.submitButton}
      onPress={handleEditAssignment}
    >
      <Text style={styles.submitButtonText}>Update Assignment</Text>
    </TouchableOpacity>
  </ScrollView>
</Modal>

      {/* Reminder Modal */}
      <Modal visible={isReminderModalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsReminderModalVisible(false)}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Reminder</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reminder Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reminder title"
              value={reminder.title}
              onChangeText={(text) => setReminder({ ...reminder, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reminder Content</Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Enter reminder content"
              value={reminder.content}
              onChangeText={(text) => setReminder({ ...reminder, content: text })}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Recipient Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={reminder.recipientType}
                onValueChange={(value) => setReminder({ ...reminder, recipientType: value })}
                style={styles.modalPicker}
                dropdownIconColor="#555"
              >
                <Picker.Item label="All Students" value="all" />
                <Picker.Item label="Specific Class" value="class" />
                <Picker.Item label="Specific Student" value="student" />
              </Picker>
            </View>
          </View>

          {reminder.recipientType === 'class' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Class</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={reminder.recipientId}
                  onValueChange={(value) => setReminder({ ...reminder, recipientId: value })}
                  style={styles.modalPicker}
                  dropdownIconColor="#555"
                >
                  <Picker.Item label="Select a class" value="" />
                  {classes.map((className) => (
                    <Picker.Item 
                      key={className} 
                      label={className} 
                      value={className} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {reminder.recipientType === 'student' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student ID</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter student ID"
                value={reminder.recipientId}
                onChangeText={(text) => setReminder({ ...reminder, recipientId: text })}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reminder Date</Text>  
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowReminderDatePicker(true)}
            >
              <Icon name="event" size={20} color="#555" />
              <Text style={styles.dateButtonText}>
                {reminder.reminderDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {showReminderDatePicker && (
              <DateTimePicker
                value={reminder.reminderDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowReminderDatePicker(false);
                  if (date) setReminder({ ...reminder, reminderDate: date });
                }}
              />
            )}
          </View>

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={saveReminder}
          >
            <Text style={styles.submitButtonText}>Save Reminder</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  reminderActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
    marginLeft: 10,
  },
  assignmentCard: {
    backgroundColor: '#AEF5F8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: 300,
    marginRight: 15,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
    flex: 1,
  },
  assignmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  assignmentText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusPicker: {
    flex: 1,
    height: 30,
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  reminderButton: {
    padding: 5,
    marginLeft: 10,
  },
  horizontalList: {
    paddingBottom: 15,
  },
  verticalList: {
    paddingBottom: 30,
  },
  modalContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  modalPicker: {
    height: 50,
    width: '100%',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  subjectButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 5,
    backgroundColor: '#eee',
  },
  selectedSubjectButton: {
    backgroundColor: '#2196F3',
  },
  subjectButtonText: {
    color: '#333',
  },
  selectedSubjectButtonText: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 14,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 5,
  },
  fileName: {
    marginLeft: 10,
    flex: 1,
  },
  noFilesText: {
    fontStyle: 'italic',
    color: '#888',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    marginBottom: 15,
  },
  deleteInfoText: {
    fontSize: 14,
    color: '#555',
  },
  confirmDeleteButton: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 12,
  },
  cancelDeleteButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelDeleteText: {
    color: '#fff',
    fontSize: 12,
  },
  selectionIndicator: {
    marginRight: 10,
  },
  undoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
  },
  undoButton: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AssignmentsScreen;