  import * as ImagePicker from 'expo-image-picker';
  import * as FileSystem from 'expo-file-system';
  import { supabase } from './supabase';

  const mediaTypeOptions = {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  };

  const takeProfilePhoto = async (userId, userType) => {
    return handleImageAction(userId, userType, 'camera');
  };

  const pickProfileFile = async (userId, userType) => {
    return handleImageAction(userId, userType, 'gallery');
  };

  const handleImageAction = async (userId, userType, source) => {
    try {
      const permissionRequest = source === 'camera'
        ? ImagePicker.requestCameraPermissionsAsync()
        : ImagePicker.requestMediaLibraryPermissionsAsync();

      const { granted } = await permissionRequest;

      if (!granted) {
        return { success: false, error: 'Permission required' };
      }

      const pickerResult = source === 'camera'
        ? await ImagePicker.launchCameraAsync(mediaTypeOptions)
        : await ImagePicker.launchImageLibraryAsync(mediaTypeOptions);

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return { success: false, error: 'No image selected' };
      }

      return await uploadImage(pickerResult.assets[0].uri, userId, userType);
    } catch (error) {
      console.error(`Image ${source} error:`, error);
      return { success: false, error: error.message };
    }
  };

  const uploadImage = async (uri, userId, userType) => {
    try {
      if (!supabase?.storage) {
        throw new Error('Supabase storage not initialized');
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File not found');

      const fileExt = uri.split('.').pop().toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png'];
      
      if (!allowedExtensions.includes(fileExt)) {
        throw new Error('Only JPG/PNG images allowed');
      }

      if (fileInfo.size > 5 * 1024 * 1024) {
        throw new Error('Maximum file size is 5MB');
      }

      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Determine folder based on user type
      const folder = userType === 'teacher' ? 'teachers' : 'students';
      const fileName = `profile-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
          cacheControl: '3600',
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return {
        success: true,
        publicUrl: `${publicUrl}?t=${Date.now()}`, // Add cache busting
        path: filePath,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return { success: false, error: error.message };
    }
  };

  export default {
    takeProfilePhoto,
    pickProfileFile,
  };