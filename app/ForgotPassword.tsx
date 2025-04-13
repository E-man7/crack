import { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import tw from 'twrnc';
import supabase from './supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'school360://reset-password'
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Check your email for the reset link!');
    }
  };

  return (
    <View style={tw`flex-1 p-4 justify-center`}>
      <Text style={tw`text-2xl font-bold mb-6`}>Reset Password</Text>
      
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4`}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity 
        style={tw`bg-blue-500 py-3 rounded-lg mb-4`}
        onPress={handleReset}
      >
        <Text style={tw`text-white text-center font-bold`}>Send Reset Link</Text>
      </TouchableOpacity>

      <Link href="/SignIn" style={tw`mt-4 text-blue-500 text-center`}>
        Back to Login
      </Link>
    </View>
  );
}