import { useEffect } from 'react';
import { Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import supabase from './supabase';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      try {
        // Handle both direct deep links and web fallback
        if (url.includes('school360://reset-password')) {
          const token = new URL(url).searchParams.get('token');
          router.replace({
            pathname: '/UpdatePassword',
            params: { token }
          });
        }
        // Handle Supabase auth callback URL
        else if (url.includes('access_token')) {
          const accessToken = url.split('access_token=')[1]?.split('&')[0];
          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: url.split('refresh_token=')[1]?.split('&')[0]
            });
            
            if (!error) {
              router.replace('/UpdatePassword');
            }
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Invalid reset link');
      }
    };

    // Check if app was launched from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}