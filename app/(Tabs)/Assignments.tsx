import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const assignments = [
  { name: 'Kiswahili', status: 'Submitted', deadline: '6/8/25' },
  { name: 'Science', status: 'In progress', deadline: '12/8/25' },
  { name: 'Social Studies', status: 'In progress', deadline: '12/8/25' },
  { name: 'Math', status: 'Not started', deadline: '15/8/25' },
];

const recentlySubmitted = [
  { name: 'Reading', submitted: '5/8/25' },
  { name: 'C.R.E', submitted: '6/8/25' },
  { name: 'Kiswahili', submitted: '6/8/25' },
];

const AssignmentsScreen = () => {
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
        renderItem={({ item }) => (
          <View style={styles.assignmentCard}>
            <Text style={styles.assignmentText}>{item.name}</Text>
            <Text style={styles.assignmentText}>{item.status}</Text>
            <Text style={styles.assignmentText}>{item.deadline}</Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />

      {/* Recently Submitted Section */}
      <Text style={styles.sectionTitle}>Recently Submitted</Text>
      <FlatList
        data={recentlySubmitted}
        renderItem={({ item }) => (
          <View style={styles.submittedCard}>
            <Text style={styles.assignmentText}>{item.name}</Text>
            <Text style={styles.assignmentText}>{item.submitted}</Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' }, // Changed to white
  header: {
    backgroundColor: '#FFFFFF', // White background
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD', // Optional: Add a border for separation
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000', // Black text
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 8 },
  assignmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#E7F7FF', // Retain current background color
    borderRadius: 8,
    marginVertical: 8,
  },
  submittedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#EEEEEE', // Retain current background color
    borderRadius: 8,
    marginVertical: 8,
  },
  assignmentText: { fontSize: 14, fontWeight: 'bold' },
});

export default AssignmentsScreen;