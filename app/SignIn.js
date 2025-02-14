import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import supabase from './supabase'; // Ensure this path is correct

const SignIn = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [adm_no, setAdmNo] = useState('');
  const [tsc_number, setTscNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

  // Handle sign-in
  const handleSignIn = async () => {
    if (!selectedSchool || !password || !selectedRole) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    // Validate admission number (parent) or TSC number (teacher)
    if (selectedRole === 'parent' && !adm_no) {
      Alert.alert('Error', 'Admission number is required');
      return;
    }
    if (selectedRole === 'teacher' && !tsc_number) {
      Alert.alert('Error', 'TSC number is required');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const identifierField = selectedRole === 'parent' ? 'adm_no' : 'tsc_number';
      const identifierValue = selectedRole === 'parent' ? adm_no : tsc_number;

      // Fetch user data from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq(identifierField, identifierValue)
        .eq('school', selectedSchool)
        .eq('role', selectedRole)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user:', userError);
        Alert.alert('Error', 'Error fetching user data. Try again.');
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'Invalid credentials. Check your details and try again.');
        return;
      }

      // Sign in using email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      Alert.alert('Success', 'Signed in successfully!');

      // Navigate based on role
      if (selectedRole === 'teacher') {
        navigation.replace('TeacherTabs'); // Navigate to TeacherTabs for teachers
      } else {
        navigation.replace('Home', { userRole: selectedRole }); // Navigate to Home for parents/students
      }

    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center px-5 bg-white`}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      <Text style={tw`text-4xl font-bold text-black mb-2`}>Welcome</Text>
      <Text style={tw`text-lg text-gray-700 mb-12`}>Sign in to your account</Text>

      {/* School Picker */}
      <View style={tw`w-full border border-gray-400 rounded-lg mb-4`}>
        <Picker selectedValue={selectedSchool} onValueChange={setSelectedSchool} style={tw`h-12 text-black`}>
          <Picker.Item label="Select School" value="" />
          <Picker.Item label="School A" value="school_a" />
          <Picker.Item label="School B" value="school_b" />
        </Picker>
      </View>

      {/* Role Picker */}
      <View style={tw`w-full border border-gray-400 rounded-lg mb-4`}>
        <Picker selectedValue={selectedRole} onValueChange={setSelectedRole} style={tw`h-12 text-black`}>
          <Picker.Item label="Select Role" value="" />
          <Picker.Item label="Parent" value="parent" />
          <Picker.Item label="Teacher" value="teacher" />
        </Picker>
      </View>

      {/* Admission Number Input (for Parents) */}
      {selectedRole === 'parent' && (
        <TextInput
          style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
          placeholder="Admission Number"
          value={adm_no}
          onChangeText={setAdmNo}
          placeholderTextColor="#888888"
        />
      )}

      {/* TSC Number Input (for Teachers) */}
      {selectedRole === 'teacher' && (
        <TextInput
          style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
          placeholder="TSC Number"
          value={tsc_number}
          onChangeText={setTscNumber}
          placeholderTextColor="#888888"
        />
      )}

      {/* Password Input */}
      <View style={tw`w-full border border-gray-400 rounded-lg flex-row items-center mb-4`}>
        <TextInput
          style={tw`flex-1 p-4 text-base text-black`}
          placeholder="Password"
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#888888"
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
          <Text style={tw`text-blue-600 font-bold px-4`}>{passwordVisible ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={[tw`w-full bg-blue-600 rounded-lg py-3 mb-4`, isSubmitting && tw`opacity-50`]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        <Text style={tw`text-white text-center text-base font-bold`}>
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignIn;
