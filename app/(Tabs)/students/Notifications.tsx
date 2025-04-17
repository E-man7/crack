import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import supabase from '../../supabase';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import Toast from 'react-native-toast-message';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [prevNotificationCount, setPrevNotificationCount] = useState(0);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('adm_no', user?.user_metadata?.adm_no || '')
        .single();

      if (studentError) throw studentError;
      setStudentInfo(studentData);

      const { data: allNotifications, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationError) throw notificationError;

      const filteredNotifications = allNotifications.filter((notification) => {
        if (notification.recipient_type === 'all') return true;
        if (notification.recipient_type === 'student' && notification.recipient_id === studentData.adm_no) return true;
        if (notification.recipient_type === 'class' && notification.recipient_id === studentData.class) return true;
        return false;
      });

      if (filteredNotifications.length > prevNotificationCount && prevNotificationCount > 0) {
        const newNotifications = filteredNotifications.slice(0, filteredNotifications.length - prevNotificationCount);
        newNotifications.forEach(notification => {
          showToastNotification(notification);
        });
      }

      setNotifications(filteredNotifications);
      setPrevNotificationCount(filteredNotifications.length);
    } catch (error) {
      console.error('Error fetching data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load notifications',
        position: 'top',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToastNotification = (notification) => {
    Toast.show({
      type: notification.is_important ? 'error' : 'info',
      text1: notification.title,
      text2: notification.content,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
      onPress: () => {
        setSelectedNotification(notification);
        setModalVisible(true);
        Toast.hide();
      }
    });
  };

  useEffect(() => {
    fetchData();
    
    const notificationsSubscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new;
          if (
            newNotification.recipient_type === 'all' ||
            (newNotification.recipient_type === 'student' && newNotification.recipient_id === studentInfo?.adm_no) ||
            (newNotification.recipient_type === 'class' && newNotification.recipient_id === studentInfo?.class)
          ) {
            setNotifications(prev => [newNotification, ...prev]);
            showToastNotification(newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsSubscription);
    };
  }, [studentInfo]);

  const groupNotificationsByTime = (notifications) => {
    const grouped = {
      today: [],
      thisWeek: [],
      earlier: [],
    };

    notifications.forEach((notification) => {
      const notificationDate = parseISO(notification.created_at);
      
      if (isToday(notificationDate)) {
        grouped.today.push(notification);
      } else if (isThisWeek(notificationDate, { weekStartsOn: 1 })) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.earlier.push(notification);
      }
    });

    return grouped;
  };

  const groupedNotifications = groupNotificationsByTime(notifications);

  const NotificationItem = ({ notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationCard,
        notification.is_important && styles.importantCard
      ]}
      onPress={() => {
        setSelectedNotification(notification);
        setModalVisible(true);
      }}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <MaterialIcons 
            name={notification.is_important ? 'error' : 'notifications'} 
            size={24} 
            color={notification.is_important ? '#FF5252' : '#037f8c'} 
          />
        </View>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
      </View>
      <Text 
        style={styles.notificationContent}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {notification.content}
      </Text>
      <View style={styles.notificationFooter}>
        <Text style={styles.notificationDate}>
          {format(parseISO(notification.created_at), 'MMM d, h:mm a')}
        </Text>
        {notification.recipient_type !== 'all' && (
          <View style={[
            styles.recipientBadge,
            notification.recipient_type === 'class' ? styles.classBadge : styles.personalBadge
          ]}>
            <Text style={styles.recipientText}>
              {notification.recipient_type === 'class' ? 'Class' : 'Personal'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#037f8c" />
      </View>
    );
  }

  if (!studentInfo) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF5252" />
        <Text style={styles.errorText}>Failed to load student data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchData}
            colors={['#037f8c']}
            tintColor="#037f8c"
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Notifications</Text>
          <View style={styles.notificationCount}>
            <Text style={styles.notificationCountText}>{notifications.length}</Text>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={48} color="#037f8c" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>We'll notify you when something arrives</Text>
          </View>
        ) : (
          <>
            {groupedNotifications.today.length > 0 && (
              <View style={styles.groupContainer}>
                <Text style={styles.groupHeader}>Today</Text>
                {groupedNotifications.today.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}

            {groupedNotifications.thisWeek.length > 0 && (
              <View style={styles.groupContainer}>
                <Text style={styles.groupHeader}>This Week</Text>
                {groupedNotifications.thisWeek.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}

            {groupedNotifications.earlier.length > 0 && (
              <View style={styles.groupContainer}>
                <Text style={styles.groupHeader}>Earlier</Text>
                {groupedNotifications.earlier.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Pressable>
              <View style={styles.modalContent}>
                {selectedNotification && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                      <Pressable
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                      >
                        <MaterialIcons name="close" size={24} color="#666" />
                      </Pressable>
                    </View>
                    <Text style={styles.modalDate}>
                      {format(parseISO(selectedNotification.created_at), 'EEEE, MMMM d, yyyy - h:mm a')}
                    </Text>
                    <ScrollView 
                      style={styles.modalBody}
                      contentContainerStyle={styles.modalBodyContent}
                    >
                      <Text style={styles.modalText}>{selectedNotification.content}</Text>
                      {selectedNotification.recipient_type !== 'all' && (
                        <View style={[
                          styles.recipientBadge,
                          selectedNotification.recipient_type === 'class' ? styles.classBadge : styles.personalBadge,
                          styles.modalBadge
                        ]}>
                          <Text style={styles.recipientText}>
                            {selectedNotification.recipient_type === 'class' 
                              ? 'For your class' 
                              : 'Personal notification'}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </>
                )}
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};

const toastConfig = {
  success: ({ text1, text2, props, ...rest }) => (
    <View style={styles.toastSuccess}>
      <MaterialIcons name="check-circle" size={24} color="white" />
      <View style={styles.toastContent}>
        <Text style={styles.toastText1}>{text1}</Text>
        <Text style={styles.toastText2}>{text2}</Text>
      </View>
    </View>
  ),
  error: ({ text1, text2, props, ...rest }) => (
    <View style={styles.toastError}>
      <MaterialIcons name="error" size={24} color="white" />
      <View style={styles.toastContent}>
        <Text style={styles.toastText1}>{text1}</Text>
        <Text style={styles.toastText2}>{text2}</Text>
      </View>
    </View>
  ),
  info: ({ text1, text2, props, ...rest }) => (
    <View style={styles.toastInfo}>
      <MaterialIcons name="info" size={24} color="white" />
      <View style={styles.toastContent}>
        <Text style={styles.toastText1}>{text1}</Text>
        <Text style={styles.toastText2}>{text2}</Text>
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#037f8c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    backgroundColor: '#037f8c',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCountText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#037f8c',
  },
  importantCard: {
    borderLeftColor: '#FF5252',
    backgroundColor: '#FFF6F6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationContent: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationDate: {
    fontSize: 13,
    color: '#888',
  },
  recipientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  classBadge: {
    backgroundColor: '#E3F2FD',
  },
  personalBadge: {
    backgroundColor: '#E8F5E9',
  },
  recipientText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 15,
  },
  modalBadge: {
    alignSelf: 'flex-start',
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastContent: {
    flex: 1,
    marginLeft: 10,
  },
  toastText1: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toastText2: {
    color: 'white',
    fontSize: 14,
    marginTop: 2,
  },
});

export default NotificationsScreen;