import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './AppNavigator';

export default function App() {
  const [showNavigator, setShowNavigator] = useState(false);

  if (showNavigator) {
    return <AppNavigator />; // Show the main navigation once "Get Started" is pressed
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to School360</Text>
      <Text style={styles.subtitle}>
        Your one-stop solution for school management.
      </Text>
      <StatusBar style="auto" />
      <TouchableOpacity style={styles.button} onPress={() => setShowNavigator(true)}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#6b7280',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});