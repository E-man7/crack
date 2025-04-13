import { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import tw from 'twrnc';
import supabase from './supabase';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { token } = useLocalSearchParams();

  useEffect(() => {
    if (token) {
      // Verify token with Supabase if needed
    }
  }, [token]);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password updated!');
      router.replace('/SignIn');
    }
  };

  return (
    <View style={tw`flex-1 p-4 justify-center`}>
      <Text style={tw`text-2xl font-bold mb-6`}>New Password</Text>
      
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4`}
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-6`}
        placeholder="Confirm password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button 
        title="Update Password" 
        onPress={handleSubmit}
        style={tw`bg-blue-500 py-3 rounded-lg`} 
      />
    </View>
  );
}
