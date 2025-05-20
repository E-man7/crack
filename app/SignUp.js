import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import supabase from './supabase';
import tw from 'twrnc';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const SignUp = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [adm_no, setAdmNo] = useState('');
  const [tsc_number, setTscNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigation = useNavigation();

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (password.length > 0) strength += 1;
    if (password.length >= 6) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

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
          id: user.user.id,
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
    <View style={tw`flex-1 justify-center items-center px-5 bg-gray-900`}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      {/* Animated Logo */}
      <Animated.View entering={FadeIn.duration(800)} exiting={FadeOut}>
        <Image
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//logo13.jpeg' }}
          style={styles.logo}
        />
      </Animated.View>

      <Text style={tw`text-4xl font-bold text-white mb-4`}>Sign Up</Text>
      <Text style={tw`text-lg text-gray-300 mb-8`}>Create your L-Track account</Text>

      {/* School Picker */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>School</Text>
      <View style={tw`w-full border border-gray-500 rounded-full mb-5 bg-gray-800`}>
        <Picker 
          selectedValue={selectedSchool} 
          onValueChange={setSelectedSchool} 
          style={tw`h-14 text-white text-base`}
          dropdownIconColor="#ffffff"
        >
          <Picker.Item label="Select School" value="" />
          <Picker.Item label="School A" value="school_a" />
          <Picker.Item label="School B" value="school_b" />
        </Picker>
      </View>

      {/* Role Picker */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>Teacher/Parent</Text>
      <View style={tw`w-full border border-gray-500 rounded-full mb-5 bg-gray-800`}>
        <Picker 
          selectedValue={selectedRole} 
          onValueChange={setSelectedRole} 
          style={tw`h-14 text-white text-base`}
          dropdownIconColor="#ffffff"
        >
          <Picker.Item label="Select Role" value="" />
          <Picker.Item label="Teacher" value="teacher" />
          <Picker.Item label="Parent" value="parent" />
        </Picker>
      </View>

      {/* TSC Number Input (for Teachers) */}
      {selectedRole === 'teacher' && (
        <>
          <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>TSC Number</Text>
          <TextInput
            style={tw`w-full border border-gray-500 rounded-full p-5 text-base text-white mb-5 bg-gray-800`}
            placeholder="Enter TSC Number"
            value={tsc_number}
            onChangeText={setTscNumber}
            placeholderTextColor="#888888"
          />
        </>
      )}

      {/* Admission Number Input (for Parents) */}
      {selectedRole === 'parent' && (
        <>
          <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>Admission Number</Text>
          <TextInput
            style={tw`w-full border border-gray-500 rounded-full p-5 text-base text-white mb-5 bg-gray-800`}
            placeholder="Enter Admission Number"
            value={adm_no}
            onChangeText={setAdmNo}
            placeholderTextColor="#888888"
          />
        </>
      )}

      {/* Email Input */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>Email</Text>
      <TextInput
        style={tw`w-full border border-gray-500 rounded-full p-5 text-base text-white mb-5 bg-gray-800`}
        placeholder="Enter Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#888888"
      />

      {/* Password Input */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>Password *</Text>
      <View style={tw`w-full border border-gray-500 rounded-full flex-row items-center mb-2 bg-gray-800`}>
        <TextInput
          style={tw`flex-1 p-5 text-base text-white`}
          placeholder={password ? '' : 'Enter Password *'}
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#888888"
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
          <Text style={tw`text-blue-400 font-bold px-5 text-base`}>{passwordVisible ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      {/* Password Strength Meter */}
      <View style={tw`w-full flex-row h-1.5 mb-5`}>
        <View style={tw`flex-1 ${passwordStrength >= 1 ? 'bg-red-500' : 'bg-gray-600'} rounded-l-full`} />
        <View style={tw`flex-1 ${passwordStrength >= 2 ? 'bg-orange-500' : 'bg-gray-600'}`} />
        <View style={tw`flex-1 ${passwordStrength >= 3 ? 'bg-yellow-500' : 'bg-gray-600'}`} />
        <View style={tw`flex-1 ${passwordStrength >= 4 ? 'bg-blue-500' : 'bg-gray-600'}`} />
        <View style={tw`flex-1 ${passwordStrength >= 5 ? 'bg-green-500' : 'bg-gray-600'} rounded-r-full`} />
      </View>

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[tw`w-full bg-blue-600 rounded-full py-5 mb-5`, isSubmitting && tw`opacity-50`]}
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <Text style={tw`text-white text-center text-lg font-bold`}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* Navigate to Sign In */}
      <Text style={tw`text-base text-gray-300`}>
        Already have an account?{' '}
        <Text onPress={() => navigation.navigate('SignIn')} style={tw`text-blue-400 font-bold`}>
          Sign In
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 180,
    height: 180,
    marginBottom: 25,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default SignUp;