import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, AppState, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { initializeDatabase, getDB } from './src/database/db';
import { useAppStore } from './src/store/useAppStore';
import { getColors } from './src/theme/colors';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { isDarkMode } = useAppStore();
  const colors = getColors(isDarkMode);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 24, color: colors.text },
        headerTintColor: colors.text,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(20, insets.bottom + 10),
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: colors.card,
          borderRadius: 24,
          height: 64,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          paddingBottom: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Accounts') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
      screenListeners={{
        tabPress: (e) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />

      {/* Hidden tabs, navigated to programmatically but not in Dock */}
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const appState = useRef(AppState.currentState);

  const { loadInitialData, isLoading, isDarkMode } = useAppStore();

  const handleAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Expinance',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    if (result.success) {
      setIsLocked(false);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        await loadInitialData();

        // Check DB for App Lock
        const db = await getDB();
        const lockSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'app_lock'");
        if (lockSetting && lockSetting.value === 'true') {
          setAppLockEnabled(true);
          setIsLocked(true); // Lock on startup
          setTimeout(() => handleAuth(), 1000); // Wait 1s for layout to render
        }

        setDbReady(true);
      } catch (error) {
        console.error('App init failed:', error);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Background -> Foreground AND Lock Enabled
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && appLockEnabled) {
        setIsLocked(true);
        handleAuth();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled]);

  if (!dbReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#4682B4" />
        <Text style={{ marginTop: 12, color: '#6C757D', fontWeight: '500' }}>Loading Expinance...</Text>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <Ionicons name="lock-closed" size={64} color="#4682B4" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginVertical: 16 }}>Expinance Locked</Text>
        <TouchableOpacity style={{ padding: 16, backgroundColor: '#4682B4', borderRadius: 8 }} onPress={handleAuth}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = getColors(isDarkMode);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="AddTransactionModal"
              component={AddTransactionScreen}
              options={{ presentation: 'modal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
