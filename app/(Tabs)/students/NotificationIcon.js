import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NotificationIcon = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={{
        marginRight: 15,
      }}
      onPress={() => {
        navigation.navigate('Notifications'); // Navigate to Notifications tab
      }}
    >
      <Ionicons name="notifications-outline" size={24} color="black" />
    </TouchableOpacity>
  );
};

export default NotificationIcon;
