/**
 * Push Notifications & Image Upload Utility
 *
 * Push notifications are DISABLED for Expo Go testing (removed in SDK 53+).
 * They will work in production APK/development builds.
 *
 * To enable for production:
 * 1. Set PUSH_ENABLED = true
 * 2. Uncomment the dynamic imports inside registerForPushNotifications()
 */

import { supabase } from '../config/supabase';

const PUSH_ENABLED = true; // Enabled for production builds

// Register for push notifications and save token
export const registerForPushNotifications = async (userId) => {
  if (!PUSH_ENABLED) return null;

  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    const { Platform } = require('react-native');

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Fitness Fusion',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B3B',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '4eee7dca-b7f2-4be3-8330-bcc3acf0fa16',
    })).data;

    if (userId && token) {
      await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);
    }

    return token;
  } catch (error) {
    console.warn('Push notification registration failed:', error);
    return null;
  }
};

// Send push notification via Expo's push API
export const sendPushNotification = async (expoPushToken, title, body) => {
  if (!expoPushToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: { type: 'payment_reminder' },
      }),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Send notification to multiple users
export const sendBulkPushNotifications = async (tokens, title, body) => {
  const messages = tokens
    .filter(t => t)
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { type: 'payment_reminder' },
    }));

  if (messages.length === 0) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
  }
};

// Upload profile image to Supabase Storage
export const uploadProfileImage = async (userId, imageUri) => {
  try {
    const ext = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `profiles/${fileName}`;

    // Use FormData — works reliably in React Native
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, formData, {
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await supabase
      .from('users')
      .update({ profile_picture: urlData.publicUrl })
      .eq('id', userId);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
