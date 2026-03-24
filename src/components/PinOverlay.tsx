import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getColors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface PinOverlayProps {
    isVisible: boolean;
    title?: string;
    subtitle?: string;
    isDarkMode: boolean;
    themeColor: string;
    onSuccess: (pin: string) => void;
    onCancel?: () => void;
    errorText?: string | null;
}

export default function PinOverlay({
    isVisible,
    title = 'Enter PIN',
    subtitle,
    isDarkMode,
    themeColor,
    onSuccess,
    onCancel,
    errorText
}: PinOverlayProps) {
    const colors = getColors(isDarkMode, themeColor);
    const [pin, setPin] = useState<string>('');
    const PIN_LENGTH = 6;

    useEffect(() => {
        if (isVisible) {
            setPin('');
        }
    }, [isVisible]);

    const handlePress = (char: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + char;
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                setTimeout(() => {
                    onSuccess(newPin);
                    // We don't clear pin instantly so the last dot can render
                    setTimeout(() => setPin(''), 100); 
                }, 50);
            }
        }
    };

    const handleDelete = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPin(prev => prev.slice(0, -1));
    };

    const NumberButton = ({ num }: { num: string }) => (
        <TouchableOpacity 
            style={[styles.numButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => handlePress(num)}
        >
            <Text style={[styles.numText, { color: colors.text }]}>{num}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        {subtitle && <Text style={[styles.subtitle, { color: colors.subText }]}>{subtitle}</Text>}
                        {errorText && <Text style={[styles.error, { color: colors.danger }]}>{errorText}</Text>}
                    </View>

                    <View style={styles.dotsContainer}>
                        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                            <View 
                                key={i} 
                                style={[
                                    styles.dot, 
                                    { borderColor: colors.primary },
                                    i < pin.length && { backgroundColor: colors.primary }
                                ]} 
                            />
                        ))}
                    </View>

                    <View style={styles.padContainer}>
                        <View style={styles.row}>
                            <NumberButton num="1" /><NumberButton num="2" /><NumberButton num="3" />
                        </View>
                        <View style={styles.row}>
                            <NumberButton num="4" /><NumberButton num="5" /><NumberButton num="6" />
                        </View>
                        <View style={styles.row}>
                            <NumberButton num="7" /><NumberButton num="8" /><NumberButton num="9" />
                        </View>
                        <View style={styles.row}>
                            {onCancel ? (
                                <TouchableOpacity style={[styles.numButton, { backgroundColor: 'transparent', borderWidth: 0 }]} onPress={onCancel}>
                                    <Text style={[styles.cancelText, { color: colors.subText }]}>Cancel</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.numButtonEmpty} />
                            )}
                            <NumberButton num="0" />
                            <TouchableOpacity style={[styles.numButton, { backgroundColor: 'transparent', borderWidth: 0 }]} onPress={handleDelete}>
                                <Ionicons name="backspace-outline" size={32} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        paddingTop: 32,
        paddingBottom: 48,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        minHeight: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    error: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 48,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
    },
    padContainer: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    numButton: {
        width: (width - 64) / 3, // 3 column grid with gaps
        height: 72,
        borderRadius: 36,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    numButtonEmpty: {
        width: (width - 64) / 3,
        height: 72,
    },
    numText: {
        fontSize: 28,
        fontWeight: '500',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
