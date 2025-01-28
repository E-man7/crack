import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const notifications = [
  { title: 'Fee reminder', content: 'The school fees for Sophia Johnson for 3rd term are due on...', type: 'today' },
  { title: 'Grades', content: 'Dear parent, your child has achieved a B+ in science. Please review their progress report...', type: 'today' },
  { title: 'Assignments', content: 'Sophia Johnson has a new assignment due on 16/8/25.', type: 'today' },
  { title: 'Upcoming Extracurricular Activities', content: 'We are excited to inform you about extracurricular activities available this academic year...', type: 'earlier' },
];

const NotificationsScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Today's Notifications */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Today</Text>
        <FlatList
          data={notifications.filter((item) => item.type === 'today')}
          renderItem={({ item }) => (
            <View style={styles.notificationCard}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      {/* Earlier Notifications */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Earlier</Text>
        <FlatList
          data={notifications.filter((item) => item.type === 'earlier')}
          renderItem={({ item }) => (
            <View style={styles.notificationCard}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background for the entire screen
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 16,
    backgroundColor: '#FFFFFF', // White background for the header
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#E7F7FF', // Current background color for the sections
    borderRadius: 8,
    marginVertical: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF', // White background for notification cards
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 14,
    color: '#333',
  },
});

export default NotificationsScreen;