import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  Dimensions,
  Pressable
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import supabase from '../../supabase';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  name: string;
  description: string;
  deadline: string;
  status: string;
  class: string | string[];
  points?: number;
  attachments?: string[];
  category?: string;
  submission_type?: string;
  subjects?: string[];
  content?: string;
  created_at: string;
  updated_at: string;
}

interface AssignmentFile {
  id: string;
  file_url: string;
  public_url: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  teacher_comments: string | null;
}

const AssignmentScreen = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignmentFiles, setAssignmentFiles] = useState<Record<string, AssignmentFile[]>>({});
  const [fileLoading, setFileLoading] = useState<string | null>(null);

  const fetchUserClass = async (): Promise<string | null> => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('class')
        .eq('adm_no', user.user_metadata.adm_no)
        .single();

      if (studentError) throw studentError;

      setUserClass(studentData.class);
      return studentData.class;
    } catch (error) {
      console.error('Error fetching user class:', error);
      return null;
    }
  };

  const fetchAssignmentFiles = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assignment_files')
        .select('*')
        .eq('assignment_id', assignmentId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching assignment files:', error);
      return [];
    }
  };

  const fetchAssignments = async () => {
    try {
      const classValue = userClass || await fetchUserClass();
      if (!classValue) return;

      // First try the array approach
      let { data, error } = await supabase
        .from('assignments')
        .select('*')
        .contains('class', [classValue])
        .order('deadline', { ascending: true });

      // If no results, try the text approach
      if (!data || data.length === 0) {
        const { data: textData, error: textError } = await supabase
          .from('assignments')
          .select('*')
          .eq('class', classValue)
          .order('deadline', { ascending: true });
        
        data = textData;
        error = textError;
      }

      if (error) throw error;

      setAssignments(data || []);

      // Fetch files for each assignment
      const filesMap: Record<string, AssignmentFile[]> = {};
      for (const assignment of data || []) {
        const files = await fetchAssignmentFiles(assignment.id);
        filesMap[assignment.id] = files;
      }
      setAssignmentFiles(filesMap);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [userClass]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const handleAssignmentPress = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setModalVisible(true);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return 'insert-drive-file';
    
    const lowerType = fileType.toLowerCase();
    if (lowerType.includes('pdf')) return 'picture-as-pdf';
    if (lowerType.includes('image')) return 'image';
    if (lowerType.includes('word') || lowerType.includes('msword') || lowerType.includes('officedocument.word')) return 'description';
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) return 'grid-on';
    if (lowerType.includes('powerpoint') || lowerType.includes('presentation')) return 'slideshow';
    if (lowerType.includes('zip') || lowerType.includes('compressed')) return 'folder-zip';
    return 'insert-drive-file';
  };

  const handleAttachmentPress = async (file: AssignmentFile) => {
    try {
      setFileLoading(file.id);
      
      // First try to open the public URL if available
      if (file.public_url) {
        const canOpen = await Linking.canOpenURL(file.public_url);
        if (canOpen) {
          await Linking.openURL(file.public_url);
          return;
        }
      }
      
      // If no public URL or can't open it, try to download and open the file
      const { data, error } = await supabase.storage
        .from('assignments')
        .createSignedUrl(file.file_url, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        const canOpen = await Linking.canOpenURL(data.signedUrl);
        if (canOpen) {
          await Linking.openURL(data.signedUrl);
        } else {
          // Fallback: Download the file
          alert(`Cannot open file directly. Please download ${file.file_name}`);
        }
      }
    } catch (error) {
      console.error('Failed to open attachment:', error);
      alert(`Failed to open file: ${file.file_name}. Please try again later.`);
    } finally {
      setFileLoading(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Submitted':
        return styles.statusSubmitted;
      case 'In progress':
        return styles.statusInProgress;
      default:
        return styles.statusNotStarted;
    }
  };

  const renderDetailItem = (label: string, value: string | number | string[] | undefined) => {
    if (!value) return null;
    
    return (
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{label}:</Text>
        {Array.isArray(value) ? (
          <View style={styles.arrayContainer}>
            {value.map((item, index) => (
              <Text key={index} style={styles.detailValue}>
                • {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.detailValue}>{value}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Assignments</Text>
      </View>
      
      <FlatList
        data={assignments}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.assignmentCard}
            onPress={() => handleAssignmentPress(item)}
          >
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentName}>{item.name}</Text>
              <Text style={styles.assignmentDeadline}>
                Due: {format(new Date(item.deadline), 'MMM dd, yyyy')}
              </Text>
            </View>
            
            {item.description && (
              <Text style={styles.assignmentDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            <View style={styles.assignmentFooter}>
              <Text style={styles.assignmentStatus}>
                Status: <Text style={getStatusStyle(item.status)}>{item.status}</Text>
              </Text>
              {item.category && (
                <Text style={styles.assignmentCategory}>
                  {item.category}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No assignments found for your class</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Pressable 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color="#037f8c" />
            </Pressable>

            <ScrollView>
              {selectedAssignment && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedAssignment.name}</Text>
                    <Text style={styles.modalDeadline}>
                      Due: {format(new Date(selectedAssignment.deadline), 'MMMM dd, yyyy')}
                    </Text>
                  </View>

                  {renderDetailItem('Status', selectedAssignment.status)}
                  {renderDetailItem('Description', selectedAssignment.description)}
                  {renderDetailItem('Content', selectedAssignment.content)}
                  {renderDetailItem('Points', selectedAssignment.points)}
                  {renderDetailItem('Category', selectedAssignment.category)}
                  {renderDetailItem('Submission Type', selectedAssignment.submission_type)}
                  {renderDetailItem('Class', selectedAssignment.class)}
                  {renderDetailItem('Subjects', selectedAssignment.subjects)}
                  {renderDetailItem('Created At', format(new Date(selectedAssignment.created_at), 'MMMM dd, yyyy HH:mm'))}
                  {renderDetailItem('Updated At', format(new Date(selectedAssignment.updated_at), 'MMMM dd, yyyy HH:mm'))}
                  {assignmentFiles[selectedAssignment.id]?.length > 0 && (
                    <View style={styles.attachmentsSection}>
                      <Text style={styles.sectionTitle}>Attachments</Text>
                      {assignmentFiles[selectedAssignment.id].map((file) => (
                        <TouchableOpacity
                          key={file.id}
                          style={styles.attachmentItem}
                          onPress={() => handleAttachmentPress(file)}
                          disabled={fileLoading === file.id}
                        >
                          <Icon 
                            name={getFileIcon(file.file_type)} 
                            size={20} 
                            color="#037f8c" 
                          />
                          <View style={styles.attachmentInfo}>
                            <Text style={styles.attachmentText} numberOfLines={1}>
                              {file.file_name}
                            </Text>
                            {file.file_size && (
                              <Text style={styles.fileSize}>
                                {(file.file_size / 1024).toFixed(1)} KB
                              </Text>
                            )}
                          </View>
                          {fileLoading === file.id ? (
                            <ActivityIndicator size="small" color="#037f8c" />
                          ) : (
                            <Icon name="download" size={20} color="#037f8c" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Fallback for old attachments array if needed */}
                  {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                    <View style={styles.attachmentsSection}>
                      <Text style={styles.sectionTitle}>Legacy Attachments</Text>
                      {selectedAssignment.attachments.map((url, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.attachmentItem}
                          onPress={() => Linking.openURL(url).catch(err => 
                            console.error('Failed to open attachment:', err)
                          )}
                        >
                          <Icon name="insert-drive-file" size={20} color="#037f8c" />
                          <Text style={styles.attachmentText} numberOfLines={1}>
                            Attachment {index + 1}
                          </Text>
                          <Icon name="download" size={20} color="#037f8c" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assignmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#037f8c',
    flex: 1,
  },
  assignmentDeadline: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentStatus: {
    fontSize: 14,
    color: '#444',
  },
  assignmentCategory: {
    fontSize: 14,
    color: '#037f8c',
    fontWeight: 'bold',
  },
  statusSubmitted: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusInProgress: {
    color: '#FFC107',
    fontWeight: 'bold',
  },
  statusNotStarted: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: windowHeight * 0.8,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  modalHeader: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#037f8c',
    marginBottom: 8,
  },
  modalDeadline: {
    fontSize: 16,
    color: '#666',
  },
  detailItem: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#037f8c',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  arrayContainer: {
    marginTop: 5,
  },
  attachmentsSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#037f8c',
    marginBottom: 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  attachmentText: {
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
});

export default AssignmentScreen;