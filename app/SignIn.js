import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, Platform, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import supabase from './supabase';
import * as Device from 'expo-device';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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

      if (fetchError && fetchError.code !== 'PGRST116') {
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
      const sorted = [...existingDevices].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (signInError) throw signInError;

      if (authData.session) {
        await trackDeviceAndSession(
          authData.user.id,
          authData.session.refresh_token
        );
      }

      Alert.alert('Success', 'Signed in successfully!');

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
    <View style={tw`flex-1 justify-center items-center px-5 bg-gray-900`}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      {/* Animated Logo */}
      <Animated.View entering={FadeIn.duration(800)} exiting={FadeOut}>
        <Image
          source={{ uri: 'https://mgtkcujpiitudmzldjsy.supabase.co/storage/v1/object/public/school360//logo13.jpeg' }}
          style={styles.logo}
        />
      </Animated.View>

      <Text style={tw`text-4xl font-bold text-white mb-4`}>Sign In</Text>
      <Text style={tw`text-lg text-gray-300 mb-8`}>Welcome back to L-Track</Text>

      {/* School Picker */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>School</Text>
      <View style={tw`w-full border border-gray-500 rounded-full mb-5 bg-gray-800 overflow-hidden`}>
        <Picker
          selectedValue={selectedSchool}
          onValueChange={setSelectedSchool}
          style={tw`h-14 text-white text-base`}
          dropdownIconColor="#ffffff"
          dropdownIconRippleColor="#3b82f6"
          mode="dropdown"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Select School" value="" />
          <Picker.Item label="School A" value="school_a" />
          <Picker.Item label="School B" value="school_b" />
        </Picker>
      </View>

      {/* Role Picker */}
      <Text style={tw`text-white self-start mb-2 ml-1 text-base`}>Teacher/Parent</Text>
      <View style={tw`w-full border border-gray-500 rounded-full mb-5 bg-gray-800 overflow-hidden`}>
        <Picker
          selectedValue={selectedRole}
          onValueChange={setSelectedRole}
          style={tw`h-14 text-white text-base`}
          dropdownIconColor="#ffffff"
          dropdownIconRippleColor="#3b82f6"
          mode="dropdown"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Select Role" value="" />
          <Picker.Item label="Teacher" value="teacher" />
          <Picker.Item label="Parent" value="parent" />
        </Picker>
      </View>

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

      {/* Forgot Password Link */}
      <TouchableOpacity 
        style={tw`w-full items-end mb-4`}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={tw`text-blue-400 font-bold`}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Sign In Button */}
      <TouchableOpacity
        style={[tw`w-full bg-blue-600 rounded-full py-5 mb-5`, isSubmitting && tw`opacity-50`]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <Text style={tw`text-white text-center text-lg font-bold`}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Sign Up Link */}
      <Text style={tw`text-base text-gray-300`}>
        Don't have an account?{' '}
        <Text onPress={() => navigation.navigate('SignUp')} style={tw`text-blue-400 font-bold`}>
          Sign Up
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
  pickerItem: {
    color: '#1f2937',
    backgroundColor: '#6b7280', // bg-gray-800
  },
  pickerDropdown: {
    backgroundColor: '#1f2937',
    borderColor: '#6b7280',
  },
});

// Android Picker theming fix
if (Platform.OS === 'android') {
  Picker.prototype._setMode = function _setMode(mode) {
    this._mode = mode;
    const child = this._picker;
    if (child && child.setMode) {
      child.setMode(mode);
    }
  };
}

export default SignIn;