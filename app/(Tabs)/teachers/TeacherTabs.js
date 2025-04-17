import React from 'react';
import { StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from './Dashboard';
import Assignments from './Assignments';
import Notifications from './Notifications';
import Classes from './Classes';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const Tab = createBottomTabNavigator();

const TeacherTabs = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Home') {
              return (
                <Icon
                  name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
                  size={size}
                  color={color}
                />
              );
            } else if (route.name === 'Assignments') {
              return (
                <Icon
                  name={focused ? 'book-edit' : 'book-edit-outline'}
                  size={size}
                  color={color}
                />
              );
            } else if (route.name === 'Notifications') {
              return (
                <MaterialIcons
                  name={focused ? 'notifications' : 'notifications-none'}
                  size={size}
                  color={color}
                />
              );
            } else if (route.name === 'Classes') {
              return (
                <Icon
                  name={focused ? 'account-group' : 'account-group-outline'}
                  size={size}
                  color={color}
                />
              );
            }
          },
          tabBarActiveTintColor: '#037f8c',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Home" component={Dashboard} />
        <Tab.Screen name="Classes" component={Classes} />
        <Tab.Screen name="Assignments" component={Assignments} />
        <Tab.Screen name="Notifications" component={Notifications} />
      </Tab.Navigator>
    </>
  );
};

export default TeacherTabs;