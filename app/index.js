import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './AppNavigator';

export default function App() {
  const [showNavigator, setShowNavigator] = useState(false);

  if (showNavigator) {
    return <AppNavigator />; // Show the main navigation once "Get Started" is pressed
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 20,
          color: '#1f2937',
        }}
      >
        Welcome to School360
      </Text>
      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 30,
          color: '#6b7280',
        }}
      >
        Your one-stop solution for school management.
      </Text>
      <StatusBar style="auto" />
      <Button title="Get Started" onPress={() => setShowNavigator(true)} />
    </View>
  );
}
