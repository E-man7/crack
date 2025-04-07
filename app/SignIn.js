import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import supabase from './supabase';
import * as Device from 'expo-device';

const SignIn = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [adm_no, setAdmNo] = useState('');
  const [tsc_number, setTscNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

  // Track device information and manage sessions
  const trackDeviceAndSession = async (userId: string, refreshToken: string) => {
    try {
      const deviceId = Device.osBuildId || `${Device.modelId}-${Math.random().toString(36).substring(2, 10)}`;
      const deviceName = Device.modelName || `${Device.brand} ${Device.model}`;
      const deviceType = Device.osName || Platform.OS;

      // Check if device already exists
      const { data: existingDevice, error: fetchError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "no rows" error
        console.error('Error checking device:', fetchError);
        return;
      }

      if (existingDevice) {
        // Update existing device record
        await supabase
          .from('user_devices')
          .update({
            refresh_token: refreshToken,
            last_login: new Date().toISOString(),
            device_name: deviceName,
            device_type: deviceType
          })
          .eq('id', existingDevice.id);
      } else {
        // Enforce device limit before adding new device
        await enforceDeviceLimit(userId, async () => {
          await supabase
            .from('user_devices')
            .insert({
              user_id: userId,
              device_id: deviceId,
              device_name: deviceName,
              device_type: deviceType,
              refresh_token: refreshToken,
            });
        });
      }
    } catch (error) {
      console.error('Device tracking error:', error);
    }
  };

  // Enforce maximum device limit per user
  const enforceDeviceLimit = async (userId: string, insertCallback: () => Promise<void>) => {
    const { data: existingDevices, error } = await supabase
      .from('user_devices')
      .select('id, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching devices:', error);
      return;
    }

    const MAX_DEVICES = 4;
    if (existingDevices && existingDevices.length >= MAX_DEVICES) {
      // Sort by oldest first
      const sorted = [...existingDevices].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Delete the oldest device
      await supabase
        .from('user_devices')
        .delete()
        .eq('id', sorted[0].id);
    }

    await insertCallback();
  };

  // Handle sign-in
  const handleSignIn = async () => {
    if (!selectedSchool || !password || !selectedRole) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

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

      if (userError) throw userError;
      if (!userData) {
        Alert.alert('Error', 'Invalid credentials. Check your details and try again.');
        return;
      }

      // Sign in using email and password
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (signInError) throw signInError;

      // Track device after successful login
      if (authData.session) {
        await trackDeviceAndSession(
          authData.user.id,
          authData.session.refresh_token
        );
      }

      Alert.alert('Success', 'Signed in successfully!');

      // Navigate based on role
      if (selectedRole === 'teacher') {
        navigation.replace('TeacherTabs');
      } else {
        navigation.replace('Home', { userRole: selectedRole });
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

      {/* Forgot Password Link */}
      <TouchableOpacity 
        style={tw`w-full items-end mb-4`}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={tw`text-blue-600 font-bold`}>Forgot Password?</Text>
      </TouchableOpacity>

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

      {/* Sign Up Link */}
      <View style={tw`flex-row`}>
        <Text style={tw`text-gray-700`}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={tw`text-blue-600 font-bold`}>SignUp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignIn;