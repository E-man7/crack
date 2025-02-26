import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const assignments = [
  { id: '1', name: 'Kiswahili', status: 'Submitted', deadline: '6/8/25' },
  { id: '2', name: 'Science', status: 'In progress', deadline: '12/8/25' },
  { id: '3', name: 'Social Studies', status: 'In progress', deadline: '12/8/25' },
  { id: '4', name: 'Math', status: 'Not started', deadline: '15/8/25' },
];

const recentlySubmitted = [
  { id: '1', name: 'Reading', submitted: '5/8/25' },
  { id: '2', name: 'C.R.E', submitted: '6/8/25' },
  { id: '3', name: 'Kiswahili', submitted: '6/8/25' },
];

const AssignmentsScreen = () => {
  const renderAssignmentCard = ({ item }) => {
    let iconName, iconColor;
    switch (item.status) {
      case 'Submitted':
        iconName = 'check-circle';
        iconColor = '#4CAF50'; // Green
        break;
      case 'In progress':
        iconName = 'access-time';
        iconColor = '#FFC107'; // Yellow
        break;
      case 'Not started':
        iconName = 'cancel';
        iconColor = '#F44336'; // Red
        break;
      default:
        iconName = 'info';
        iconColor = '#000000';
    }

    return (
      <TouchableOpacity style={[styles.assignmentCard, { backgroundColor: iconColor + '20' }]}>
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentText}>{item.name}</Text>
          <Text style={styles.assignmentText}>{item.deadline}</Text>
        </View>
        <Icon name={iconName} size={24} color={iconColor} />
      </TouchableOpacity>
    );
  };

  const renderSubmittedCard = ({ item }) => (
    <View style={styles.submittedCard}>
      <Text style={styles.assignmentText}>{item.name}</Text>
      <Text style={styles.assignmentText}>{item.submitted}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Assignments</Text>
      </View>

      {/* Assignments Section */}
      <Text style={styles.sectionTitle}>Assignments</Text>
      <FlatList
        data={assignments}
        renderItem={renderAssignmentCard}
        keyExtractor={(item) => item.id}
      />

      {/* Recently Submitted Section */}
      <Text style={styles.sectionTitle}>Recently Submitted</Text>
      <FlatList
        data={recentlySubmitted}
        renderItem={renderSubmittedCard}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 8 },
  assignmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentText: { fontSize: 14, fontWeight: 'bold' },
  submittedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    marginVertical: 8,
  },
});

export default AssignmentsScreen;