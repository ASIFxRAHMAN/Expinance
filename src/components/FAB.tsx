import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { getColors, getContrastColor } from '../theme/colors';

export default function FAB() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isDarkMode, themeColor } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const iconColor = getContrastColor(colors.primary);

    return (
        <TouchableOpacity
            style={[styles.fab, { bottom: Math.max(100, insets.bottom + 100), backgroundColor: colors.primary, shadowColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddTransactionModal')}
        >
            <Ionicons name="add" size={32} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#8A2BE2',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8A2BE2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    }
});
