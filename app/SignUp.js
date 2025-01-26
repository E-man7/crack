import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import supabase from './supabase'; // Ensure this path is correct
import tw from 'twrnc';

const SignUp = () => {
  const [form, setForm] = useState({
    adm_no: '', // Admission number
    email: '',
    password: '',
    school: '',
    role: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigation = useNavigation();

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const validateAdmNo = async (adm_no) => {
    console.log('Validating adm_no:', adm_no); // Debugging

    const { data, error } = await supabase
      .from('students') // Replace with your students table name
      .select('adm_no')
      .eq('adm_no', adm_no);

    console.log('Validation response:', data, error); // Debugging

    if (error) {
      console.error('Error validating admission number:', error);
      return false; // Database error
    }

    if (data.length === 0) {
      console.error('Admission number not found:', adm_no);
      return false; // Admission number does not exist
    }

    return true; // Admission number exists
  };

  const submit = async () => {
    const { adm_no, email, password, school, role } = form;

    // Validation
    if (!adm_no || !email || !password || !school || !role) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate admission number
      const isAdmNoValid = await validateAdmNo(adm_no);
      if (!isAdmNoValid) {
        Alert.alert('Error', 'Invalid admission number');
        return;
      }

      // Supabase sign-up call
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            adm_no,
            school,
            role,
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Insert into 'parents' or 'teachers' table based on role
      const table = role === 'parent' ? 'parents' : 'teachers';
      const { error: tableError } = await supabase
        .from(table)
        .insert([{ adm_no, email, school }]);

      if (tableError) {
        Alert.alert('Error', 'Failed to save user data');
        return;
      }

      Alert.alert('Success', 'Account created successfully! Please check your email for verification.');
      navigation.navigate('Home');
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
        <Picker
          selectedValue={form.school}
          onValueChange={(value) => handleChange('school', value)}
          style={tw`h-12 text-black`}
        >
          <Picker.Item label="Select School" value="" />
          <Picker.Item label="School A" value="school_a" />
          <Picker.Item label="School B" value="school_b" />
        </Picker>
      </View>

      {/* Role Picker */}
      <View style={tw`w-full border border-gray-400 rounded-lg mb-4`}>
        <Picker
          selectedValue={form.role}
          onValueChange={(value) => handleChange('role', value)}
          style={tw`h-12 text-black`}
        >
          <Picker.Item label="Select Role" value="" />
          <Picker.Item label="Teacher" value="teacher" />
          <Picker.Item label="Parent" value="parent" />
        </Picker>
      </View>

      {/* Admission Number Input */}
      <TextInput
        style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
        placeholder="Admission Number"
        placeholderTextColor="#888888"
        value={form.adm_no}
        onChangeText={(text) => handleChange('adm_no', text)}
      />

      {/* Email Input */}
      <TextInput
        style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
        placeholder="Email"
        placeholderTextColor="#888888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={(text) => handleChange('email', text)}
      />

      {/* Password Input */}
      <View style={tw`w-full border border-gray-400 rounded-lg flex-row items-center mb-4`}>
        <TextInput
          style={tw`flex-1 p-4 text-base text-black`}
          placeholder="Password"
          secureTextEntry={!passwordVisible}
          placeholderTextColor="#888888"
          value={form.password}
          onChangeText={(text) => handleChange('password', text)}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
          <Text style={tw`text-blue-600 font-bold px-4`}>
            {passwordVisible ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          tw`w-full bg-blue-600 rounded-lg py-3 mb-4`,
          isSubmitting && tw`opacity-50`,
        ]}
        onPress={submit}
        disabled={isSubmitting}
      >
        <Text style={tw`text-white text-center text-base font-bold`}>
          {isSubmitting ? 'Submitting...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      {/* Navigate to Sign In */}
      <Text style={tw`text-sm text-black`}>
        Already have an account?{' '}
        <Text
          onPress={() => navigation.navigate('SignIn')}
          style={tw`text-blue-600 font-bold`}
        >
          Sign In
        </Text>
      </Text>
    </View>
  );
};

export default SignUp;