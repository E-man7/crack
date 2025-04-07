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
  files: AssignmentFile[];
}

interface AssignmentFile {
  id: string;
  file_url: string;
  public_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
}

const AssignmentScreen = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

      const assignmentsWithFiles = await Promise.all(
        (data || []).map(async (assignment: any) => {
          const { data: files, error: filesError } = await supabase
            .from('assignment_files')
            .select('*')
            .eq('assignment_id', assignment.id);

          if (filesError) throw filesError;

          return {
            ...assignment,
            files: files || [],
          };
        })
      );

      setAssignments(assignmentsWithFiles);
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

  const handleFilePress = (file: AssignmentFile) => {
    Linking.openURL(file.public_url || file.file_url).catch(err => 
      console.error('Failed to open file:', err)
    );
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              {item.files.length > 0 && (
                <View style={styles.filesIndicator}>
                  <Icon name="attachment" size={16} color="#037f8c" />
                  <Text style={styles.filesCount}>{item.files.length}</Text>
                </View>
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedAssignment?.name}</Text>
                <Text style={styles.modalDeadline}>
                  Due: {selectedAssignment && format(new Date(selectedAssignment.deadline), 'MMMM dd, yyyy')}
                </Text>
              </View>

              {selectedAssignment?.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalDescription}>{selectedAssignment.description}</Text>
                </View>
              )}

              {selectedAssignment?.points && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Points</Text>
                  <Text style={styles.modalPoints}>{selectedAssignment.points}</Text>
                </View>
              )}

              {selectedAssignment?.files.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Attachments ({selectedAssignment.files.length})</Text>
                  {selectedAssignment.files.map((file) => (
                    <TouchableOpacity
                      key={file.id}
                      style={styles.modalFileItem}
                      onPress={() => handleFilePress(file)}
                    >
                      <Icon name="insert-drive-file" size={24} color="#037f8c" />
                      <Text style={styles.modalFileName}>{file.file_name}</Text>
                      <Icon name="download" size={24} color="#037f8c" />
                    </TouchableOpacity>
                  ))}
                </View>
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
  filesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filesCount: {
    fontSize: 14,
    color: '#037f8c',
    marginLeft: 4,
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
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#037f8c',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  modalPoints: {
    fontSize: 16,
    color: '#333',
  },
  modalFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    marginBottom: 8,
  },
  modalFileName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
});

export default AssignmentScreen;