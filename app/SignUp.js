import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import supabase from './supabase'; // Ensure this path is correct
import tw from 'twrnc';

const SignUp = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [adm_no, setAdmNo] = useState('');
  const [tsc_number, setTscNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

  // Validate Admission Number for Parents
  const validateAdmNo = async (adm_no) => {
    const { data, error } = await supabase.from('students').select('adm_no').eq('adm_no', adm_no);
    return !error && data.length > 0;
  };

  // Validate TSC Number for Teachers
  const validateTscNumber = async (tsc_number) => {
    const { data, error } = await supabase.from('teachers').select('tsc_number').eq('tsc_number', tsc_number);
    return !error && data.length > 0;
  };

  // Sign-up function
  const handleSignUp = async () => {
    if (!email || !password || !selectedSchool || !selectedRole) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (selectedRole === 'teacher' && !tsc_number) {
      Alert.alert('Error', 'TSC Number is required for teachers');
      return;
    }
    if (selectedRole === 'parent' && !adm_no) {
      Alert.alert('Error', 'Admission Number is required for parents');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate TSC Number / Admission Number
      if (selectedRole === 'teacher' && !(await validateTscNumber(tsc_number))) {
        Alert.alert('Error', 'Invalid TSC Number');
        return;
      }
      if (selectedRole === 'parent' && !(await validateAdmNo(adm_no))) {
        Alert.alert('Error', 'Invalid Admission Number');
        return;
      }

      // Sign up the user with Supabase Auth
      const { data: user, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            adm_no: selectedRole === 'parent' ? adm_no : null,
            tsc_number: selectedRole === 'teacher' ? tsc_number : null,
            school: selectedSchool,
            role: selectedRole,
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (!user || !user.user) {
        Alert.alert('Error', 'Sign up failed. Please try again.');
        return;
      }

      // Insert user details into `users` table
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.user.id, // Link with auth.users
          email,
          role: selectedRole,
          school: selectedSchool,
          adm_no: selectedRole === 'parent' ? adm_no : null,
          tsc_number: selectedRole === 'teacher' ? tsc_number : null,
        },
      ]);

      if (insertError) {
        console.error('Error inserting user data:', insertError);
        Alert.alert('Error', 'Failed to save user data. Try again.');
        return;
      }

      Alert.alert('Success', 'Account created successfully! Check your email for verification.');
      navigation.navigate('SignIn');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center px-5 bg-white`}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      <Text style={tw`text-4xl font-bold text-black mb-2`}>Sign Up</Text>
      <Text style={tw`text-lg text-gray-700 mb-12`}>Create your account</Text>

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
          <Picker.Item label="Teacher" value="teacher" />
          <Picker.Item label="Parent" value="parent" />
        </Picker>
      </View>

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

      {/* Email Input */}
      <TextInput
        style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#888888"
      />

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

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[tw`w-full bg-blue-600 rounded-lg py-3 mb-4`, isSubmitting && tw`opacity-50`]}
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        <Text style={tw`text-white text-center text-base font-bold`}>
          {isSubmitting ? 'Submitting...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      {/* Navigate to Sign In */}
      <Text style={tw`text-sm text-black`}>
        Already have an account?{' '}
        <Text onPress={() => navigation.navigate('SignIn')} style={tw`text-blue-600 font-bold`}>
          Sign In
        </Text>
      </Text>
    </View>
  );
};

export default SignUp;
