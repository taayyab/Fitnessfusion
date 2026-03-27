import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ThemedAlertProvider from './src/components/ThemedAlert';

// Safely set up notifications (may fail in Expo Go)
try {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('Notification handler setup skipped:', e.message);
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    try {
      const Notifications = require('expo-notifications');
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification tapped:', response);
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    } catch (e) {
      console.warn('Notification listeners skipped:', e.message);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemedAlertProvider>
        <AuthProvider>
          <StatusBar style="light" backgroundColor="#0D0D0D" />
          <AppNavigator />
        </AuthProvider>
      </ThemedAlertProvider>
    </SafeAreaProvider>
  );
}
