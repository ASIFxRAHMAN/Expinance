import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { getColors, PREDEFINED_THEMES, getReadableColor } from '../theme/colors';
import * as Haptics from 'expo-haptics';

export default function AppearanceScreen() {
    const navigation = useNavigation<any>();
    const { isDarkMode, setDarkMode, themeColor, setThemeColor } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);
    const [customHex, setCustomHex] = useState('');

    useEffect(() => {
        setCustomHex(themeColor);
    }, [themeColor]);

    const handleCustomHexChange = (text: string) => {
        // Automatically prefix with # if not present
        let formatted = text;
        if (formatted.length > 0 && !formatted.startsWith('#')) {
            formatted = '#' + formatted;
        }
        setCustomHex(formatted);

        // Validate hex and apply if valid
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(formatted)) {
            handleThemeSelect(formatted);
        }
    };

    const handleThemeSelect = (colorHex: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setThemeColor(colorHex);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>App Appearance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>APPEARANCE</Text>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Theme Mode</Text>

                    <View style={styles.modeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.modeBtn,
                                !isDarkMode && styles.modeBtnActive,
                                { borderColor: !isDarkMode ? readablePrimary : colors.border, backgroundColor: !isDarkMode ? readablePrimary + '15' : 'transparent' }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setDarkMode(false);
                            }}
                        >
                            <Ionicons name="sunny" size={24} color={!isDarkMode ? readablePrimary : colors.subText} />
                            <Text style={[styles.modeLabel, { color: !isDarkMode ? readablePrimary : colors.subText }]}>Light</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.modeBtn,
                                isDarkMode && styles.modeBtnActive,
                                { borderColor: isDarkMode ? readablePrimary : colors.border, backgroundColor: isDarkMode ? readablePrimary + '15' : 'transparent' }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setDarkMode(true);
                            }}
                        >
                            <Ionicons name="moon" size={24} color={isDarkMode ? readablePrimary : colors.subText} />
                            <Text style={[styles.modeLabel, { color: isDarkMode ? readablePrimary : colors.subText }]}>Dark</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subText, marginTop: 12 }]}>ACCENT</Text>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.paletteContainer}>
                        {PREDEFINED_THEMES.map((theme) => {
                            const isSelected = theme.color === themeColor;
                            return (
                                <View key={theme.name} style={styles.swatchWrapper}>
                                    <TouchableOpacity
                                        style={[
                                            styles.swatch,
                                            { backgroundColor: theme.color },
                                            isSelected && styles.swatchSelected
                                        ]}
                                        onPress={() => handleThemeSelect(theme.color)}
                                    />
                                    {isSelected && (
                                        <Text style={[styles.swatchLabel, { color: colors.text }]}>
                                            {theme.name}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.customHexContainer}>
                        <Text style={[styles.customHexLabel, { color: colors.subText }]}>Or Custom Hex Code:</Text>
                        <TextInput
                            style={[styles.hexInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="#HEX"
                            placeholderTextColor={colors.subText}
                            value={customHex}
                            onChangeText={handleCustomHexChange}
                            maxLength={7}
                            autoCapitalize="characters"
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    content: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 8,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 24,
    },
    modeContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    modeBtnActive: {
        borderWidth: 2,
    },
    modeLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    paletteContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    swatchWrapper: {
        alignItems: 'center',
        minWidth: 50,
        gap: 8,
    },
    swatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    swatchSelected: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.15 }],
    },
    swatchLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    customHexContainer: {
        marginTop: 32,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#CCC',
        paddingTop: 24,
    },
    customHexLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    hexInput: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    }
});
