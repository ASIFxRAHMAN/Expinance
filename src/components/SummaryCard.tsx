import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getColors, getReadableColor } from '../theme/colors';
import { formatCurrency } from '../utils/format';

interface SummaryCardProps {
    label: string;
    amount: number;
    type: 'neutral' | 'positive' | 'negative';
}

export default function SummaryCard({ label, amount, type }: SummaryCardProps) {
    const { isDarkMode, themeColor, isPrivacyEnabled, isPrivacyMaskRevealed, showGlobalPinPrompt } = useAppStore();
    const themeColors = getColors(isDarkMode, themeColor);
    const [isExpanded, setIsExpanded] = useState(false);

    const isPositive = amount >= 0;
    const color = getReadableColor(themeColors.primary, isDarkMode);

    const isCensored = isPrivacyEnabled && !isPrivacyMaskRevealed;
    const formattedAmount = formatCurrency(Math.abs(amount), !isExpanded, isPrivacyEnabled, isPrivacyMaskRevealed);
    const sign = amount < 0 && !isCensored ? '-' : '';

    const handlePress = () => {
        if (isCensored) {
            showGlobalPinPrompt();
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.label, { color: themeColors.subText }]}>{label}</Text>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
                <Text style={[styles.amount, { color }]} numberOfLines={isExpanded ? 2 : 1} adjustsFontSizeToFit>
                    {sign}{formattedAmount}
                </Text>
            </TouchableOpacity>
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
