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
    content: '', // Added this required field
    deadline: new Date(),
    points: '',
    submissionType: 'file',
    attachments: [],
    category: '',
    status: 'Not started',
    class: null, // Changed from class_id to class
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [teacherComments, setTeacherComments] = useState('');
  const [deletedAssignment, setDeletedAssignment] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    name: '',
    description: '',
    content: '', // Added this required field
    deadline: new Date(),
    points: '',
    submissionType: 'file',
    attachments: [],
    category: '',
    status: 'Not started',
    class: null, // Changed from class_id to class
  });

  const [reminder, setReminder] = useState({
    title: '',
    content: '',
    recipientType: 'all',
    recipientId: '',
    reminderDate: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });
  
        if (assignmentsError) throw assignmentsError;
  
        const assignmentsWithDates = assignmentsData.map(assignment => ({
          ...assignment,
          deadline: assignment.deadline ? new Date(assignment.deadline) : new Date(),
          points: assignment.points || 'N/A',
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
  
        // Fetch classes - updated implementation
        const { data: classesData, error: classesError } = await supabase
          .from('students')
          .select('class')
          .not('class', 'is', null);
  
        if (classesError) throw classesError;
  
        // Process class data more robustly
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
  }, []); 

  const handleFileUpload = async (isNewAssignment = true) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/zip'],
        multiple: true,
      });
  
      if (!result.canceled) {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
  
        if (!user) {
          throw new Error('User not authenticated');
        }
  
        const uploadedFiles = await Promise.all(
          result.assets.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            // Upload file to storage
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('assignments')
              .upload(`files/${fileName}`, {
                uri: file.uri,
                type: file.mimeType,
                name: fileName,
              }, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.mimeType,
              });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase
              .storage
              .from('assignments')
              .getPublicUrl(uploadData.path);

            // Only create database record if we're editing an existing assignment
            if (!isNewAssignment && editingAssignment.id) {
              const { data: fileData, error: fileError } = await supabase
                .from('assignment_files')
                .insert([{
                  assignment_id: editingAssignment.id,
                  file_url: uploadData.path,
                  public_url: publicUrl,
                  file_name: file.name,
                  uploaded_by: user.id,
                  teacher_comments: teacherComments,
                }])
                .select()
                .single();

              if (fileError) throw fileError;
              return fileData;
            }

            // For new assignments, just return the storage info
            return {
              file_url: uploadData.path,
              public_url: publicUrl,
              file_name: file.name
            };
          })
        );
  
        setFiles([...files, ...uploadedFiles]);
        setTeacherComments('');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload files');
    }
  };

  const handleDeleteFile = async (index) => {
    try {
      const fileToDelete = files[index];
      
      // Only try to delete from storage if the file was actually uploaded
      if (fileToDelete.file_url) {
        const { error: storageError } = await supabase
          .storage
          .from('assignments')
          .remove([fileToDelete.file_url]);

        if (storageError) throw storageError;
      }

      // Only try to delete from database if this is an existing file record
      if (fileToDelete.id) {
        const { error: dbError } = await supabase
          .from('assignment_files')
          .delete()
          .eq('id', fileToDelete.id);

        if (dbError) throw dbError;
      }

      setFiles(files.filter((_, i) => i !== index));
    } catch (error) {
      console.error('File deletion error:', error);
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  const handlePreviewFile = async (fileUrl) => {
    try {
      const file = files.find(f => f.file_url === fileUrl);
      const url = file?.public_url || fileUrl;
      
      if (url.endsWith('.pdf')) {
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          FileSystem.documentDirectory + 'temp.pdf',
          {}
        );

        const { uri } = await downloadResumable.downloadAsync();
        
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: uri,
          flags: 1,
          type: 'application/pdf',
        });
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('File preview error:', error);
      Alert.alert('Error', 'Failed to open file. Make sure you have a PDF viewer installed.');
    }
  };

  const handleAssignmentSubmit = async () => {
    try {
      if (!newAssignment.name) {
        throw new Error('Assignment name is required');
      }
      if (!newAssignment.content) { // Added validation for content
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

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          name: newAssignment.name,
          description: newAssignment.description,
          content: newAssignment.content, // Added content field
          deadline: deadline.toISOString(),
          status: 'Not started',
          attachments: files.map(file => file.file_url),
          category: newAssignment.category,
          points: pointsValue,
          submission_type: newAssignment.submissionType,
          subjects: selectedSubjects.length > 0 ? selectedSubjects : null,
          class: selectedClass, // Changed from class_id to class
        }])
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Create file records in database if files were uploaded
      if (files.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        const { error: filesError } = await supabase
          .from('assignment_files')
          .insert(files.map(file => ({
            assignment_id: assignmentData.id,
            file_url: file.file_url,
            public_url: file.public_url,
            file_name: file.file_name,
            uploaded_by: user?.id,
            teacher_comments: teacherComments,
          })));

        if (filesError) throw filesError;
      }

      // Update local state
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

      // Reset form
      setNewAssignment({
        name: '',
        description: '',
        content: '', // Reset content
        deadline: new Date(),
        points: '',
        submissionType: 'file',
        attachments: [],
        category: '',
        status: 'Not started',
        class: null, // Changed from class_id to class
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

  const handleAssignmentUpdate = async () => {
    try {
      if (!editingAssignment.content) { // Added validation for content
        throw new Error('Assignment content is required');
      }

      const deadline = editingAssignment.deadline ? new Date(editingAssignment.deadline) : new Date();
      const pointsValue = editingAssignment.points === undefined || editingAssignment.points === null || 
                          editingAssignment.points.toString().trim() === '' ? 
                          0 : parseInt(editingAssignment.points.toString(), 10);
      
      if (isNaN(pointsValue)) {
        throw new Error('Points must be a valid number');
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          name: editingAssignment.name,
          description: editingAssignment.description,
          content: editingAssignment.content, // Added content field
          deadline: deadline.toISOString(),
          status: editingAssignment.status,
          attachments: files.map(file => file.file_url),
          category: editingAssignment.category,
          points: pointsValue,
          submission_type: editingAssignment.submissionType,
          subjects: selectedSubjects,
          class: editingAssignment.class, // Changed from class_id to class
        })
        .eq('id', editingAssignment.id)
        .select()
        .single();

      if (error) throw error;

      const updatedAssignments = assignments.map(assignment =>
        assignment.id === editingAssignment.id ? {
          ...data,
          deadline: new Date(data.deadline),
          points: data.points || 'N/A'
        } : assignment
      );

      setAssignments(updatedAssignments);
      setIsEditModalVisible(false);
      setEditingAssignment({
        id: null,
        name: '',
        description: '',
        deadline: new Date(),
        points: '',
        submissionType: 'file',
        attachments: [],
        category: '',
        status: 'Not started',
        class_id: null,
      });
      setFiles([]);
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Error updating assignment:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleStatusUpdate = async (assignmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: newStatus })
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(assignments.map(assignment => 
        assignment.id === assignmentId ? { 
          ...assignment, 
          status: newStatus 
        } : assignment
      ));
    } catch (error) {
      console.error('Error updating status:', error.message);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const assignmentToDelete = assignments.find(a => a.id === assignmentId);
      
      setDeletedAssignment(assignmentToDelete);
      
      const updatedAssignments = assignments.filter(assignment => assignment.id !== assignmentId);
      setAssignments(updatedAssignments);
      setRecentAssignments(recentAssignments.filter(assignment => assignment.id !== assignmentId));
      
      setShowUndo(true);
      setTimeout(() => {
        if (showUndo) {
          deleteAssignmentPermanently(assignmentId, assignmentToDelete);
        }
        setShowUndo(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error deleting assignment:', error.message);
      Alert.alert('Error', 'Failed to delete assignment');
    }
  };

  const handleBulkDelete = async () => {
    try {
      if (selectedAssignmentsToDelete.length === 0) {
        Alert.alert('Error', 'Please select at least one assignment to delete');
        return;
      }

      // Delete from database
      const { error } = await supabase
        .from('assignments')
        .delete()
        .in('id', selectedAssignmentsToDelete);

      if (error) throw error;

      // Update local state
      setAssignments(assignments.filter(a => !selectedAssignmentsToDelete.includes(a.id)));
      setRecentAssignments(recentAssignments.filter(a => !selectedAssignmentsToDelete.includes(a.id)));
      setSelectedAssignmentsToDelete([]);
      setIsDeleteModalVisible(false);
      Alert.alert('Success', 'Selected assignments deleted successfully');
    } catch (error) {
      console.error('Error deleting assignments:', error.message);
      Alert.alert('Error', 'Failed to delete assignments');
    }
  };

  const deleteAssignmentPermanently = async (assignmentId, assignmentToDelete) => {
    try {
      if (assignmentToDelete?.attachments?.length > 0) {
        const { error: storageError } = await supabase
          .storage
          .from('assignments')
          .remove(assignmentToDelete.attachments);
        
        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      console.log('Assignment deleted permanently');
    } catch (error) {
      console.error('Error permanently deleting assignment:', error.message);
    }
  };

  const undoDelete = () => {
    if (deletedAssignment) {
      setAssignments([deletedAssignment, ...assignments]);
      setRecentAssignments([deletedAssignment, ...recentAssignments.slice(0, 4)]);
      setShowUndo(false);
      setDeletedAssignment(null);
    }
  };

  const sendNotification = async (title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const saveReminder = async () => {
    try {
      if (!reminder.title || !reminder.content || !reminder.reminderDate) {
        throw new Error('Please fill in all fields');
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert([{
          title: reminder.title,
          content: reminder.content,
          recipient_type: reminder.recipientType,
          recipient_id: reminder.recipientId || null,
          reminder_date: reminder.reminderDate.toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

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
      Alert.alert('Success', 'Reminder saved');
    } catch (error) {
      console.error('Error saving reminder:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const toggleAssignmentSelection = (assignmentId) => {
    setSelectedAssignmentsToDelete(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const renderAssignmentCard = ({ item }) => {
    const deadline = item.deadline ? new Date(item.deadline) : new Date();
    const subjectsList = Array.isArray(item.subjects) ? item.subjects : [];
    const points = item.points !== undefined && item.points !== null ? item.points : 'N/A';
    const classInfo = classes.find(c => c.id === item.class_id);
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
                points: item.points !== undefined && item.points !== null ? item.points.toString() : '',
                class_id: item.class_id || null
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
            </View>
            
            <View style={styles.assignmentMeta}>
              <Text style={styles.assignmentText}>
                <Icon name="calendar-today" size={14} color="#555" /> {deadline.toDateString()}
              </Text>
              <Text style={styles.assignmentText}>
                <Icon name="star" size={14} color="#555" /> Points: {points}
              </Text>
            </View>
            
            <View style={styles.assignmentMeta}>
              <Text style={styles.assignmentText}>
                <Icon name="class" size={14} color="#555" /> Subjects: {subjectsList.length > 0 ? subjectsList.join(', ') : 'No subjects'}
              </Text>
            </View>
            
            {classInfo && (
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
          <Text style={styles.sectionTitle}>Assignments</Text>
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
      <Text style={styles.inputLabel}>Description</Text>
      <TextInput
        style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Enter description (optional)"
        value={newAssignment.description}
        onChangeText={(text) => setNewAssignment({ ...newAssignment, description: text })}
        multiline
      />
    </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Class</Text>
              <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedClass}
                onValueChange={(value) => setSelectedClass(value)}
                style={styles.modalPicker}
                dropdownIconColor="#555"
              >
                <Picker.Item label="Select a class" value="" />
                {classes.map((className, index) => (
                  <Picker.Item 
                    key={index} 
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
                {subjects.map((subject, index) => (
                  <Pressable
                    key={index}
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
              <Text style={styles.inputLabel}>Points (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter points"
                value={newAssignment.points}
                onChangeText={(text) => setNewAssignment({ ...newAssignment, points: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teacher Comments (optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter comments"
                value={teacherComments}
                onChangeText={setTeacherComments}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Files</Text>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleFileUpload}
              >
                <Icon name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Files</Text>
              </TouchableOpacity>
              
              {files.map((file, index) => (
                <View key={index} style={styles.filePreview}>
                  <View style={styles.fileInfo}>
                    <Icon name="insert-drive-file" size={20} color="#555" />
                    <Text style={styles.fileText} numberOfLines={1}>{file.file_name}</Text>
                  </View>
                  <View style={styles.fileActions}>
                    <TouchableOpacity onPress={() => handlePreviewFile(file.file_url)}>
                      <Icon name="visibility" size={20} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteFile(index)}>
                      <Icon name="delete" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAssignmentSubmit}
            >
              <Text style={styles.submitButtonText}>Create Assignment</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>

        {/* Edit Assignment Modal */}
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
      <Text style={styles.inputLabel}>Description</Text>
      <TextInput
        style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Enter description (optional)"
        value={editingAssignment.description}
        onChangeText={(text) => setEditingAssignment({ ...editingAssignment, description: text })}
        multiline
      />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Class*</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={editingAssignment.class}
          onValueChange={(value) => setEditingAssignment({...editingAssignment, class: value})}
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
                    key={subject}  // Using subject name as key
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
              <Text style={styles.inputLabel}>Points (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter points"
                value={editingAssignment.points}
                onChangeText={(text) => setEditingAssignment({ ...editingAssignment, points: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teacher Comments (optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter comments"
                value={teacherComments}
                onChangeText={setTeacherComments}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Files</Text>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleFileUpload}
              >
                <Icon name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Files</Text>
              </TouchableOpacity>
              
              {files.map((file, index) => (
                <View key={index} style={styles.filePreview}>
                  <View style={styles.fileInfo}>
                    <Icon name="insert-drive-file" size={20} color="#555" />
                    <Text style={styles.fileText} numberOfLines={1}>{file.file_name}</Text>
                  </View>
                  <View style={styles.fileActions}>
                    <TouchableOpacity onPress={() => handlePreviewFile(file.file_url)}>
                      <Icon name="visibility" size={20} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteFile(index)}>
                      <Icon name="delete" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAssignmentUpdate}
            >
              <Text style={styles.submitButtonText}>Update Assignment</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>

        {/* Reminder Modal */}
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
              <TouchableOpacity 
                onPress={() => setIsReminderModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#F44336" />
              </TouchableOpacity>
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
                  <Picker.Item label="All" value="all" />
                  <Picker.Item label="Specific" value="specific" />
                </Picker>
              </View>
            </View>

            {reminder.recipientType === 'specific' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient ID</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter recipient ID"
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
  closeButton: {
    padding: 10,
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
    padding: 20,
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
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
    padding: 10,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 14,
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
  filePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 5,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileText: {
    marginLeft: 10,
    fontSize: 12,
    flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
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