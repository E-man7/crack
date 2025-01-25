import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import supabase from './supabase'; // Ensure this path is correct

const SignIn = () => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigation = useNavigation();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'You are signed in!');
      navigation.replace('Home'); // Navigate to the Tabs component
    } catch (error) {
      Alert.alert('Error', error.message);
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

      {/* Email Input */}
      <TextInput
        style={tw`w-full border border-gray-400 rounded-lg p-4 text-base text-black mb-4`}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#888888"
        keyboardType="email-address"
        autoCapitalize="none"
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
        style={tw`w-full bg-blue-600 rounded-lg py-3 mb-4`}
        onPress={handleSignIn}
      >
        <Text style={tw`text-white text-center text-base font-bold`}>Sign In</Text>
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
    </View>
  );
};

export default SignIn;