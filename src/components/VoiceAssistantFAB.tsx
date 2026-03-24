import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';
import { getColors, getContrastColor } from '../theme/colors';
import { parseVoiceCommandWithGemini } from '../utils/gemini';

type RecordState = 'IDLE' | 'RECORDING' | 'ANALYZING';

export default function VoiceAssistantFAB() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isDarkMode, themeColor, geminiApiKey, categories, accounts, showAlert } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const iconColor = getContrastColor(colors.primary);

    const [recordState, setRecordState] = useState<RecordState>('IDLE');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => {});
            }
        };
    }, [recording]);

    const handlePress = async () => {
        if (!geminiApiKey) {
            showAlert('API Key Required', 'Please configure your Gemini API Key in Settings > Developer & AI Settings to use Voice Commands.', [{ text: 'OK', style: 'default' }]);
            return;
        }

        if (recordState === 'IDLE') {
            await startRecording();
        } else if (recordState === 'RECORDING') {
            await stopRecordingAndAnalyze();
        }
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                showAlert('Permission Denied', 'Microphone access is required for voice commands.', [{ text: 'OK', style: 'default' }]);
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setRecordState('RECORDING');
        } catch (error) {
            console.error('Failed to start recording', error);
            showAlert('Recording Error', 'Failed to start the microphone.', [{ text: 'OK', style: 'default' }]);
        }
    };

    const stopRecordingAndAnalyze = async () => {
        if (!recording) return;

        try {
            setRecordState('ANALYZING');
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            const uri = recording.getURI();
            setRecording(null);

            if (!uri) throw new Error("No audio URI returned.");

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const activeCategories = categories.map(c => c.name);
            const activeAccounts = accounts.map(a => a.name);

            // Using audio/mp4 generic type for m4a files from high quality preset
            const intent = await parseVoiceCommandWithGemini(base64Audio, 'audio/mp4', geminiApiKey!, activeCategories, activeAccounts);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (intent.action === 'ADD_TRANSACTION') {
                navigation.navigate('AddTransactionModal', { intentData: intent });
            } else if (intent.action === 'ADD_ACCOUNT') {
                navigation.navigate('MainTabs', { screen: 'Accounts', params: { intentData: intent } });
            } else if (intent.action === 'ADD_SUBSCRIPTION') {
                // If the app has an AddSubscriptionModal or something similar
                // Assuming Add Subscription is inside Subscriptions tab inside MainTabs? 
                // Or maybe AddSubscriptionModal doesn't exist. I'll pass it to Subscriptions screen
                navigation.navigate('MainTabs', { screen: 'Subscriptions', params: { intentData: intent } });
            } else {
                showAlert('Command Unknown', 'The AI could not confidently determine your action. Please try speaking clearly.', [{ text: 'OK', style: 'default' }]);
            }
        } catch (error: any) {
            console.error('Analysis failed', error);
            showAlert('AI Processing Failed', error.message || 'Unable to process voice command.', [{ text: 'OK', style: 'default' }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setRecordState('IDLE');
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.fab, 
                { 
                    bottom: Math.max(100, insets.bottom + 100),
                    backgroundColor: recordState === 'IDLE' ? colors.background : colors.primary,
                    borderColor: recordState === 'IDLE' ? colors.border : 'transparent',
                    borderWidth: recordState === 'IDLE' ? 1 : 0,
                    shadowColor: recordState === 'IDLE' ? '#000' : colors.primary
                }
            ]}
            activeOpacity={0.8}
            onPress={handlePress}
            disabled={recordState === 'ANALYZING'}
        >
            {recordState === 'IDLE' && <Ionicons name="mic" size={24} color={colors.text} />}
            {recordState === 'RECORDING' && <View style={[styles.recordingDot, { backgroundColor: iconColor }]} />}
            {recordState === 'ANALYZING' && <ActivityIndicator size="small" color={iconColor} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        left: 24, // Opposite side of regular + FAB
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    recordingDot: {
        width: 24,
        height: 24,
        borderRadius: 8,
    }
});
