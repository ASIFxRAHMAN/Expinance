import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getColors } from '../theme/colors';

interface SummaryCardProps {
    label: string;
    amount: number;
    type: 'neutral' | 'positive' | 'negative';
}

export default function SummaryCard({ label, amount, type }: SummaryCardProps) {
    const { isDarkMode } = useAppStore();
    const themeColors = getColors(isDarkMode);

    const isPositive = amount >= 0;
    const color = type === 'neutral' ? themeColors.primary : (type === 'positive' ? themeColors.success : themeColors.danger);

    return (
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.label, { color: themeColors.subText }]}>{label}</Text>
            <Text style={[styles.amount, { color }]}>
                {amount < 0 ? '-' : ''}${Math.abs(amount).toFixed(2)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20, // Increased padding
        borderRadius: 24, // Bento radius
        borderWidth: 1, // Etched border
        flex: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 }, // Deeper shadow
        shadowOpacity: 0.15, // 15% opacity
        shadowRadius: 16,
        elevation: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        fontWeight: '300', // Light metadata
    },
    amount: {
        fontSize: 20,
        fontWeight: '900', // Heavy weight for currency
    }
});
