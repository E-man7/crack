import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Home from './Home';
import Progress from './Progress';
import Assignments from './Assignments';
import Fee from './Fee';
import Others from './Others';
import Notifications from './Notifications'; // Import Notifications screen

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Progress') iconName = focused ? 'trending-up' : 'trending-up-outline';
          if (route.name === 'Assignments') iconName = focused ? 'book' : 'book-outline';
          if (route.name === 'Fee') iconName = focused ? 'wallet' : 'wallet-outline';
          if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          if (route.name === 'Others') iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
        tabBarStyle: {
          height: 60,
          justifyContent: 'center', // Align items in the center of the tab bar
        },
        tabBarLabelPosition: 'below-icon', // Ensures the label is positioned correctly below the icon
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Progress" component={Progress} />
      <Tab.Screen name="Assignments" component={Assignments} />
      <Tab.Screen name="Fee" component={Fee} />
      <Tab.Screen name="Notifications" component={Notifications} />
      <Tab.Screen name="Others" component={Others} />
    </Tab.Navigator>
  );
};

const Tabs = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{
          headerShown: false, // Remove the header entirely
        }}
      />
    </Stack.Navigator>
  );
};

export default Tabs;
