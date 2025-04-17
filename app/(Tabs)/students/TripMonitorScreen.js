import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TripMonitorScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="gps-fixed" size={100} color="#037f8c" style={styles.icon} />
        <Text style={styles.title}>Coming Soon!</Text>
        <Text style={styles.subtitle}>We're working on this exciting new feature.</Text>
        <Text style={styles.description}>
          The Trip Monitor will allow you to track school trips in real-time with GPS technology.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#037f8c',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default TripMonitorScreen;