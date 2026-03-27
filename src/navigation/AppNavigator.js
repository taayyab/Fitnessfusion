import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/theme';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import TrainerNavigator from './TrainerNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={COLORS.red} />
  </View>
);

const AppNavigator = () => {
  const { user, profile, loading, onboarded } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : profile?.role === 'trainer' || profile?.role === 'admin' ? (
          <Stack.Screen name="TrainerPanel" component={TrainerNavigator} />
        ) : !onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default AppNavigator;
