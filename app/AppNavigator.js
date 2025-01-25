import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SignIn from './SignIn'; // Ensure this path is correct
import SignUp from './SignUp'; // Ensure this path is correct
import Tabs from './(Tabs)/Tabs'; // Ensure this path is correct

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="SignIn">
      <Stack.Screen
        name="SignIn"
        component={SignIn}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUp}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Home"
        component={Tabs}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;