import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
      colors={['#0E294A', '#1C6EB6', '#6EA4D8']} // Your brand colors as gradient
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <Animated.View entering={FadeIn.duration(800)} exiting={FadeOut}>
        <Image
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//logo13.jpeg' }}
          style={styles.logo}
        />
      </Animated.View>

      <Text style={styles.title}>Welcome to L-Track</Text>
      <Text style={styles.subtitle}>Efficiency Meets Education</Text>

      <StatusBar style="light" />

      <Animated.View entering={FadeIn.delay(400).duration(800)}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setShowNavigator(true)}
          activeOpacity={0.7}
        >
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
    width: 180,
    height: 180,
    marginBottom: 25,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#0E294A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    color: '#1C6EB6',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
              console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
              console.error('Service Worker registration failed:', error);
          });
  });
}