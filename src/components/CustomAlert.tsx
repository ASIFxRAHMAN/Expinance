import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppStore } from '../store/useAppStore';
import { getColors, getContrastColor, getReadableColor } from '../theme/colors';

export default function CustomAlert() {
    const { alertConfig, hideAlert, isDarkMode, themeColor } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    if (!alertConfig.isVisible) return null;

    return (
        <Modal visible={alertConfig.isVisible} transparent animationType="fade">
            <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.overlay}>
                <View style={[styles.alertBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{alertConfig.title}</Text>
                    <Text style={[styles.message, { color: colors.subText }]}>{alertConfig.message}</Text>

                    <View style={styles.buttonContainer}>
                        {alertConfig.buttons.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    btn.style === 'cancel' && { backgroundColor: 'transparent' },
                                    btn.style === 'destructive' && { backgroundColor: colors.danger },
                                    btn.style === 'default' && { backgroundColor: readablePrimary },
                                ]}
                                onPress={() => {
                                    if (btn.onPress) {
                                        btn.onPress();
                                    }
                                    hideAlert();
                                }}
                            >
                                <Text style={[
                                    styles.buttonText,
                                    btn.style === 'cancel' && { color: colors.subText },
                                    btn.style === 'default' && { color: getContrastColor(readablePrimary) },
                                    btn.style === 'destructive' && { color: '#FFFFFF', fontWeight: '900' }
                                ]}>
                                    {btn.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 5,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center', // Fallback for single button
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    }
});
