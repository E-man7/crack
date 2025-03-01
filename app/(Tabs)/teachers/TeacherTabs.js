import React from 'react';
import { StatusBar, Text } from 'react-native'; // Import Text if needed
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from './Dashboard';
import Assignments from './Assignments';
import Notifications from './Notifications';
import Classes from './Classes';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Tab = createBottomTabNavigator();

const TeacherTabs = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Dashboard') {
              iconName = 'dashboard';
            } else if (route.name === 'Assignments') {
              iconName = 'assignment';
            } else if (route.name === 'Notifications') {
              iconName = 'notifications';
            } else if (route.name === 'Classes') {
              iconName = 'class';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#037f8c',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Dashboard" component={Dashboard} />
        <Tab.Screen name="Classes" component={Classes} />
        <Tab.Screen name="Assignments" component={Assignments} />
        <Tab.Screen name="Notifications" component={Notifications} />
      </Tab.Navigator>
    </>
  );
};

export default TeacherTabs;            