import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import supabase from '../../supabase';

const ProgressScreen = () => {
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Fetch the user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();
  }, []);

  // Fetch scores based on the selected term and user
  useEffect(() => {
    if (!user) return;

    const fetchScores = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('adm_no', user.adm_no)
        .eq('period', selectedTerm);

      if (error) {
        console.error('Error fetching scores:', error);
      } else {
        setScores(data);
      }
      setLoading(false);
    };

    fetchScores();
  }, [selectedTerm, user]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view your progress.</Text>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Progress</Text>
      </View>

      <Picker
        selectedValue={selectedTerm}
        onValueChange={(itemValue) => setSelectedTerm(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Term 1" value="Term 1" />
        <Picker.Item label="Term 2" value="Term 2" />
        <Picker.Item label="Term 3" value="Term 3" />
      </Picker>

      <ScrollView contentContainerStyle={styles.content}>
        {scores.map((score, index) => (
          <View key={index} style={styles.scoreContainer}>
            <Text style={styles.subjectText}>{score.subject_name}</Text>
            <Text style={styles.scoreText}>{score.score}%</Text>
            <Text style={styles.gradeText}>Grade {score.grade}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    width: '100%',
    paddingVertical: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  picker: {
    width: '100%',
    marginVertical: 10,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  subjectText: {
    fontSize: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradeText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ProgressScreen;