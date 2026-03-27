import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../config/theme';
import { useAuth } from '../context/AuthContext';

import AdminDashboard from '../screens/AdminDashboard';
import TrainerPaymentsScreen from '../screens/TrainerPaymentsScreen';

const Drawer = createDrawerNavigator();

const NAV_ITEMS = [
  { name: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
  { name: 'Payments', icon: 'payments', label: 'Payments' },
];

const CustomDrawerContent = (props) => {
  const { profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const currentRoute = props.state?.routeNames?.[props.state?.index] || 'Dashboard';

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll} scrollEnabled={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile?.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || 'T')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'Trainer'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile?.role || 'trainer'}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Nav Items */}
        <View style={styles.navSection}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => props.navigation.navigate(item.name)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={isActive ? COLORS.red : COLORS.textMuted}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout at bottom */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.7}>
          <MaterialIcons name="logout" size={22} color={COLORS.red} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TrainerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: COLORS.background,
          width: 280,
        },
        overlayColor: 'rgba(0,0,0,0.6)',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboard} />
      <Drawer.Screen name="Payments" component={TrainerPaymentsScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  drawerScroll: {
    flex: 1,
    paddingHorizontal: 0,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.red,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.red + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.red + '40',
  },
  avatarText: {
    color: COLORS.red,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  profileName: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: COLORS.red + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: COLORS.red,
    fontSize: SIZES.xs,
    ...FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  navSection: {
    paddingTop: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    gap: 14,
  },
  navItemActive: {
    backgroundColor: COLORS.red + '12',
  },
  navLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.base,
    ...FONTS.semiBold,
    flex: 1,
  },
  navLabelActive: {
    color: COLORS.white,
  },
  activeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.red,
  },
  bottomSection: {
    paddingHorizontal: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    gap: 14,
    marginTop: 12,
  },
  logoutText: {
    color: COLORS.red,
    fontSize: SIZES.base,
    ...FONTS.semiBold,
  },
});

export default TrainerNavigator;
