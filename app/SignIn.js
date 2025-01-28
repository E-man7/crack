import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import supabase from './supabase'; // Ensure this path is correct

const SignIn = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [adm_no, setAdmNo] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordModalVisible, setIsForgotPasswordModalVisible] = useState(false);
  const [emailForReset, setEmailForReset] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const navigation = useNavigation();

  // Handle sign-in
  const handleSignIn = async () => {
    if (!adm_no || !password || !selectedRole) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Determine the table based on selected role
      const table = selectedRole === 'parent' ? 'parents' : 'teachers';

      // Fetch email from the correct table
      const { data: userData, error: userError } = await supabase
        .from(table)
        .select('email')
        .eq('adm_no', adm_no)
        .single();

      if (userError || !userData?.email) {
        Alert.alert('Error', 'Invalid admission number or role');
        return;
      }

      // Sign in with email and password
      const { error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (error) throw error;

      Alert.alert('Success', 'Signed in successfully!');
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!emailForReset) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setIsResettingPassword(true);

      // Send password reset email using the correct method
      const { error } = await supabase.auth.resetPasswordForEmail(emailForReset);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
      setIsForgotPasswordModalVisible(false); // Close the modal
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center px-5 bg-white`}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      <Text style={tw`text-4xl font-bold text-black mb-2`}>Welcome</Text>
      <Text style={tw`text-lg text-gray-700 mb-12`}>Sign in to your account</Text>

      {/* School Picker */}
      <View style={tw`w-full border border-gray-400 rounded-lg mb-4`}>
        <Picker
          selectedValue={selectedSchool}
          onValueChange={(itemValue) => setSelectedSchool(itemValue)}
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
          selectedValue={selectedRole}
          onValueChange={(itemValue) => setSelectedRole(itemValue)}
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
        value={adm_no}
        onChangeText={setAdmNo}
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
          <Text style={tw`text-blue-600 font-bold px-4`}>
            {passwordVisible ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={[
          tw`w-full bg-blue-600 rounded-lg py-3 mb-4`,
          isSubmitting && tw`opacity-50`,
        ]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        <Text style={tw`text-white text-center text-base font-bold`}>
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* Forgot Password Link */}
      <TouchableOpacity onPress={() => setIsForgotPasswordModalVisible(true)}>
        <Text style={tw`text-blue-600 font-bold mb-4`}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Navigate to Sign Up */}
      <Text style={tw`text-sm text-black`}>
        Don't have an account?{' '}
        <Text
          onPress={() => navigation.navigate('SignUp')}
          style={tw`text-blue-600 font-bold`}
        >
          Sign up
        </Text>
      </Text>

      {/* Forgot Password Modal */}
      <Modal
        visible={isForgotPasswordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsForgotPasswordModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white w-11/12 p-6 rounded-lg`}>
            <Text style={tw`text-xl font-bold mb-4`}>Forgot Password</Text>
            <TextInput
              style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
              placeholder="Enter your email"
              value={emailForReset}
              onChangeText={setEmailForReset}
              placeholderTextColor="#888888"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[
                tw`w-full bg-blue-600 rounded-lg py-3 mb-4`,
                isResettingPassword && tw`opacity-50`,
              ]}
              onPress={handleForgotPassword}
              disabled={isResettingPassword}
            >
              <Text style={tw`text-white text-center text-base font-bold`}>
                {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsForgotPasswordModalVisible(false)}>
              <Text style={tw`text-center text-blue-600 font-bold`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SignIn;