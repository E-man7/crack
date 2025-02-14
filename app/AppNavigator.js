import React, { Suspense } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import SignIn from './SignIn';
import SignUp from './SignUp';
import TeacherTabs from '././(Tabs)/teachers/TeacherTabs'; // Import TeacherTabs
import StudentTabs from './(Tabs)/students/Tabs'; // Ensure this path is correct

const Stack = createStackNavigator();

// Separate component for dynamic rendering
const HomeScreen = ({ route }) => {
  const userRole = route?.params?.userRole || 'student';

  return (
    <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#037F8C" /></View>}>
      {userRole === 'teacher' ? <TeacherTabs /> : <StudentTabs />}
    </Suspense>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="SignIn">
      <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false }} />
      <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false }} />
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;