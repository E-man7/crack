import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const ExtracurricularScreen = () => {
  const [selectedActivity, setSelectedActivity] = useState('');

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Extracurricular</Text>
      </View>

      {/* Content */}
      <Text style={styles.subHeader}>Your Extracurriculars</Text>
      
      {/* Table-like structure */}
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={styles.cell}>piano</Text>
          <Text style={styles.cell}>week 1</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Group Lessons</Text>
          <Text style={styles.cell}></Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Chess</Text>
          <Text style={styles.cell}>Week 2</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Beginners level</Text>
          <Text style={styles.cell}></Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>Drama</Text>
          <Text style={styles.cell}>Week 4</Text>
        </View>
      </View>

      {/* Images */}
      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//Ai.home.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//C2.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//intro.home.jpeg' }}
        />
        <Image
          style={styles.image}
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//Rob.kids.jpg' }}
        />
      </View>

      {/* Dropdown for enrolling in new clubs */}
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedActivity}
          onValueChange={(itemValue) => setSelectedActivity(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select an activity" value="" />
          <Picker.Item label="Piano" value="piano" />
          <Picker.Item label="Chess" value="chess" />
          <Picker.Item label="Drama" value="drama" />
          <Picker.Item label="Group Lessons" value="groupLessons" />
        </Picker>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}>
        <Text>Enroll to a new club</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subHeader: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  table: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  cell: {
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#0A71F2',
    padding: 40,
    borderRadius: 8,
    marginBottom: 30,
  },
  image: {
    width: '47%',
    height: 170,
    marginBottom: 30,
    borderRadius: 8,
  },
  dropdownContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  picker: {
    width: '100%',
  },
  button: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ddd',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default ExtracurricularScreen;