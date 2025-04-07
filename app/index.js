import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient'; // For gradient background
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'; // For animations
import AppNavigator from './AppNavigator';
import { UserProvider } from './context/UserContext';

export default function App() {
  const [showNavigator, setShowNavigator] = useState(false);

  if (showNavigator) {
    return (
      <UserProvider>
        <AppNavigator />
      </UserProvider>
    );
  }

  return (
    <LinearGradient
      colors={['#AEF5F8', '#6a11cb']} // Gradient colors
      style={styles.container}
    >
      {/* Animated Logo */}
      <Animated.View entering={FadeIn.duration(1000)} exiting={FadeOut}>
        <Image
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360/logo/logo12.png' }}
          style={styles.logo}
        />
      </Animated.View>

      {/* App Name */}
      <Text style={styles.title}>Welcome to L-Track</Text>

      {/* Catchphrase */}
      <Text style={styles.subtitle}>Efficiency Meets Education.</Text>

      <StatusBar style="auto" />

      {/* Animated Button */}
      <Animated.View entering={FadeIn.delay(500).duration(1000)} exiting={FadeOut}>
        <TouchableOpacity style={styles.button} onPress={() => setShowNavigator(true)}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000', // Shadow for logo
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // For Android
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff', // White text for better contrast
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#e0e0e0', // Light gray for better readability
  },
  button: {
    backgroundColor: '#ffffff', // White button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000', // Shadow for button
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // For Android
  },
  buttonText: {
    color: '#2575fc', // Blue text to match gradient
    fontSize: 16,
    fontWeight: 'bold',
  },
});