import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import supabase from './supabase'; // Ensure this path is correct

// Helper function to convert a file URI to a Blob
const uriToBlob = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

// Define handleImageUpload
const handleImageUpload = async (imageUri, userId, setAvatarUrl) => {
  try {
    console.log('Fetching image from URI:', imageUri); // Debugging log

    // Convert the image URI to a Blob
    const blob = await uriToBlob(imageUri);

    // Extract file extension and dynamically set contentType
    const fileExt = imageUri.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const contentType = `image/${fileExt}`;

    console.log('Uploading image to Supabase...'); // Debugging log
    const { data, error } = await supabase
      .storage
      .from('files') // Use the bucket name 'files'
      .upload(`public/${userId}/${fileName}`, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType, // Dynamically set content type
      });

    console.log('Supabase Upload Response:', data, error); // Debugging log
    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('files')
      .getPublicUrl(`public/${userId}/${fileName}`);

    console.log('Public URL:', publicUrl); // Debugging log
    setAvatarUrl(publicUrl);

    // Update the post with the file URL
    const { error: updateError } = await supabase
      .from('posts') // Assuming 'posts' is your table name
      .update({ file: publicUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    Alert.alert('Success', 'Profile picture updated successfully!');
  } catch (error) {
    console.error('Error uploading image:', error);
    Alert.alert('Error', `Failed to update profile picture: ${error.message}`);
  }
};

// Now define pickImage and takePhoto
export const pickImage = async (userId, setAvatarUrl) => {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('Media Library Permission Status:', status); // Debugging log

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct property
      allowsEditing: true, // Allow the user to crop/edit the image
      aspect: [4, 3], // Aspect ratio for cropping
      quality: 1, // Highest quality
    });

    console.log('Image Picker Result:', result); // Debugging log

    // If the user selects an image, handle the upload
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await handleImageUpload(result.assets[0].uri, userId, setAvatarUrl);
    }
  } catch (error) {
    console.error('Error in pickImage:', error);
    Alert.alert('Error', 'Failed to open image picker');
  }
};

export const takePhoto = async (userId, setAvatarUrl) => {
  try {
    // Request camera permissions
    const { status } = await Camera.requestCameraPermissionsAsync();
    console.log('Camera Permission Status:', status); // Debugging log

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    // Launch the camera
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct property
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, // Reduced quality
    });

    console.log('Camera Result:', result); // Debugging log

    // If the user takes a photo, handle the upload
    if (!result.canceled && result.assets && result.assets.length > 0) {
      console.log('Image URI:', result.assets[0].uri); // Debugging log
      console.log('Image Size:', result.assets[0].fileSize); // Debugging log

      // Compress the image
      const compressedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }], // Resize to a maximum width of 800px
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
      );

      console.log('Compressed Image URI:', compressedImage.uri); // Debugging log
      await handleImageUpload(compressedImage.uri, userId, setAvatarUrl);
    }
  } catch (error) {
    console.error('Error in takePhoto:', error);
    Alert.alert('Error', 'Failed to open camera');
  }
};