import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, AppState, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { initializeDatabase, getDB } from './src/database/db';
import { useAppStore } from './src/store/useAppStore';
import { getColors, getContrastColor, getReadableColor } from './src/theme/colors';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import AccountDetailsScreen from './src/screens/AccountDetailsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AppearanceScreen from './src/screens/AppearanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { isDarkMode, themeColor } = useAppStore();
  const colors = getColors(isDarkMode, themeColor);
  const readablePrimary = getReadableColor(colors.primary, isDarkMode);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const navigation = useNavigation<any>();

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 24, color: colors.text },
        headerTintColor: colors.text,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          margin: 0,
          padding: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: readablePrimary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(20, insets.bottom + 10),
          left: 16,
          right: 16,
          elevation: 0,
          backgroundColor: colors.card,
          borderRadius: 32,
          height: 64,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Accounts') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Subscriptions') iconName = focused ? 'calendar' : 'calendar-outline';

          return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
              <Ionicons name={iconName} size={28} color={color} />
            </View>
          );
        },
      })}
      screenListeners={{
        tabPress: (e) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 16 }}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )
        }}
      />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

import CustomAlert from './src/components/CustomAlert';
import PinOverlay from './src/components/PinOverlay';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const appState = useRef(AppState.currentState);

  const [isSettingInitialPin, setIsSettingInitialPin] = useState(false);
  const [isConfirmingInitialPin, setIsConfirmingInitialPin] = useState(false);
  const [tempPin, setTempPin] = useState('');

  const { 
    loadInitialData, 
    isLoading, 
    isDarkMode, 
    themeColor, 
    securityPin,
    isAppLocked,
    appLockType,
    isGlobalPinPromptVisible,
    setSecurityPin,
    unlockApp,
    lockApp,
    revealPrivacyMask,
    showGlobalPinPrompt,
    hideGlobalPinPrompt
  } = useAppStore();

  const handleBiometricAuth = async () => {
      const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access Expinance',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel'
      });
      if (result.success) {
          unlockApp();
      }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        await loadInitialData();
        setDbReady(true);
      } catch (error) {
        console.error('App init failed:', error);
      }
    };
    initApp();
  }, []);

  // Require PIN setup on first launch
  useEffect(() => {
    if (dbReady && !isLoading && securityPin === null && !isSettingInitialPin && !isConfirmingInitialPin) {
      setIsSettingInitialPin(true);
    }
  }, [dbReady, isLoading, securityPin]);

  useEffect(() => {
      if (dbReady && !isLoading && isAppLocked && appLockType === 'biometric') {
          handleBiometricAuth();
      }
  }, [dbReady, isLoading, isAppLocked, appLockType]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Background -> Foreground AND Lock Enabled
      if (appState.current === 'background' && nextAppState === 'active' && appLockType !== 'none') {
        lockApp();
        if (appLockType === 'biometric') {
            handleBiometricAuth();
        } else if (appLockType === 'pin') {
            showGlobalPinPrompt();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appLockType]);

  if (!dbReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#4682B4" />
        <Text style={{ marginTop: 12, color: '#6C757D', fontWeight: '500' }}>Loading Expinance...</Text>
      </View>
    );
  }

  const colors = getColors(isDarkMode, themeColor);
  const contrastColor = getContrastColor(colors.primary);

  const customTheme = isDarkMode ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background, // Set base to our custom deep charcoal to prevent flashes
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor="transparent" translucent={true} />

        {/* Mandatory Setup Flows */}
        <PinOverlay
            isVisible={isSettingInitialPin && securityPin === null}
            title="Create Security PIN"
            subtitle="Required to secure your financial data."
            isDarkMode={isDarkMode}
            themeColor={themeColor}
            onSuccess={(pin) => {
                setTempPin(pin);
                setIsSettingInitialPin(false);
                setIsConfirmingInitialPin(true);
            }}
        />
        
        <PinOverlay
            isVisible={isConfirmingInitialPin && securityPin === null}
            title="Confirm PIN"
            subtitle="Please re-enter your new PIN."
            isDarkMode={isDarkMode}
            themeColor={themeColor}
            onSuccess={(pin) => {
                if (pin === tempPin) {
                    setSecurityPin(pin);
                    setIsConfirmingInitialPin(false);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setIsConfirmingInitialPin(false);
                    setIsSettingInitialPin(true);
                    setTempPin('');
                }
            }}
            onCancel={() => {
                setIsConfirmingInitialPin(false);
                setIsSettingInitialPin(true);
                setTempPin('');
            }}
        />

        {/* Global App Lock Flow */}
        <PinOverlay
            isVisible={isGlobalPinPromptVisible && securityPin !== null}
            title={isAppLocked && appLockType === 'pin' ? "App Locked" : "Privacy Verification"}
            subtitle="Enter your PIN to unlock."
            isDarkMode={isDarkMode}
            themeColor={themeColor}
            onSuccess={(pin) => {
               if (isAppLocked) {
                   if (unlockApp(pin)) {
                       hideGlobalPinPrompt();
                   } else {
                       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                   }
               } else {
                   // This is a privacy prompt unlock
                   if (pin === securityPin) {
                       revealPrivacyMask(); // unlocks and starts 2s timer
                       hideGlobalPinPrompt();
                   } else {
                       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                   }
               }
            }}
            onCancel={(!isAppLocked) ? () => hideGlobalPinPrompt() : undefined}
        />

        {isAppLocked && appLockType === 'biometric' && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, zIndex: 999 }]}>
            <Ionicons name="finger-print" size={80} color={colors.primary} />
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginVertical: 24, color: colors.text }}>Expinance Locked</Text>
             <TouchableOpacity 
               style={{ paddingHorizontal: 32, paddingVertical: 16, backgroundColor: colors.primary, borderRadius: 24 }} 
               onPress={handleBiometricAuth}
             >
               <Text style={{ color: contrastColor, fontWeight: 'bold', fontSize: 18 }}>Unlock with Biometrics</Text>
             </TouchableOpacity>
          </View>
        )}

        <NavigationContainer theme={customTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen
              name="AddTransactionModal"
              component={AddTransactionScreen}
              options={{ presentation: 'modal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <CustomAlert />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
