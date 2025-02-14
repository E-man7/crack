import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import supabase from '../../supabase';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    const fetchStudentAndNotifications = async () => {
      try {
        // Get the current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        // Fetch student data from the 'students' table using adm_no
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('adm_no', user.user_metadata.adm_no)
          .single();

        if (studentError) throw studentError;

        // Set student information
        setStudentInfo(studentData);

        // Fetch all notifications
        const { data: allNotifications, error: notificationError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false }); // Fetch notifications in descending order of creation time

        if (notificationError) throw notificationError;

        // Filter notifications based on recipient_type and recipient_id
        const filteredNotifications = allNotifications.filter((notification) => {
          if (notification.recipient_type === 'all') {
            return true; // Display to all students
          } else if (notification.recipient_type === 'student' && notification.recipient_id === studentData.adm_no) {
            return true; // Display to the specific student
          } else if (notification.recipient_type === 'class' && notification.recipient_id === studentData.class) {
            return true; // Display to the specific class
          }
          return false; // Exclude other notifications
        });

        setNotifications(filteredNotifications);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndNotifications();
  }, []);

  // Group notifications by time
  const groupNotificationsByTime = (notifications) => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    const grouped = {
      today: [],
      thisWeek: [],
      earlier: [],
    };

    notifications.forEach((notification) => {
      const notificationDate = new Date(notification.created_at);

      if (notificationDate >= startOfToday) {
        grouped.today.push(notification);
      } else if (notificationDate >= startOfWeek) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.earlier.push(notification);
      }
    });

    return grouped;
  };

  const groupedNotifications = groupNotificationsByTime(notifications);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  if (!studentInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load student data.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.length > 0 ? (
        <>
          {groupedNotifications.today.length > 0 && (
            <>
              <Text style={styles.groupHeader}>Today</Text>
              {groupedNotifications.today.map((notification) => (
                <View key={notification.id} style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationContent}>{notification.content}</Text>
                  <Text style={styles.notificationDate}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
          {groupedNotifications.thisWeek.length > 0 && (
            <>
              <Text style={styles.groupHeader}>This Week</Text>
              {groupedNotifications.thisWeek.map((notification) => (
                <View key={notification.id} style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationContent}>{notification.content}</Text>
                  <Text style={styles.notificationDate}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
          {groupedNotifications.earlier.length > 0 && (
            <>
              <Text style={styles.groupHeader}>Earlier</Text>
              {groupedNotifications.earlier.map((notification) => (
                <View key={notification.id} style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationContent}>{notification.content}</Text>
                  <Text style={styles.notificationDate}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      ) : (
        <Text style={styles.noNotificationsText}>No notifications available.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#037f8c',
    textAlign: 'center',
  },
  groupHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#037f8c',
  },
  notificationCard: {
    backgroundColor: '#AEF5F8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 14,
    color: '#666',
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NotificationsScreen;