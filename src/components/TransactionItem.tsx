import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Category } from '../database/types';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { getColors, getReadableColor } from '../theme/colors';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { formatCurrency } from '../utils/format';

interface TransactionItemProps {
    transaction: Transaction;
    category?: Category | null;
}

export default function TransactionItem({ transaction, category }: TransactionItemProps) {
    const { deleteTransaction, isDarkMode, themeColor, showAlert, isPrivacyEnabled, isPrivacyMaskRevealed, showGlobalPinPrompt } = useAppStore();
    const themeColors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(themeColors.primary, isDarkMode);
    const swipeableRef = useRef<Swipeable>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const isIncome = transaction.type === 'income';
    const isTransfer = transaction.type === 'transfer';

    const amountColor = readablePrimary;
    const iconName = category?.icon || (isIncome ? 'cash' : (isTransfer ? 'swap-horizontal' : 'cart'));
    const iconColor = category?.color || '#808080';

    const isCensored = isPrivacyEnabled && !isPrivacyMaskRevealed;
    const formattedAmount = formatCurrency(Math.abs(transaction.amount), !isExpanded, isPrivacyEnabled, isPrivacyMaskRevealed);
    const sign = isCensored ? "" : (isIncome ? '+' : (isTransfer ? '' : '-'));

    const handlePressAmount = () => {
        if (isCensored) {
            showGlobalPinPrompt();
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    const handleDelete = () => {
        showAlert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel", onPress: () => swipeableRef.current?.close() },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await deleteTransaction(transaction.id);
                    }
                }
            ]
        );
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [0, 100],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.rightActionContainer, { transform: [{ translateX: trans }] }]}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: themeColors.danger }]} onPress={handleDelete}>
                    <Ionicons name="trash" size={24} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const onSwipeOpen = (direction: 'left' | 'right') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            onSwipeableOpen={onSwipeOpen}
            overshootRight={false}
        >
            <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={iconName as any} size={24} color={iconColor} />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.categoryName, { color: themeColors.text }]} numberOfLines={1}>
                        {category?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}
                    </Text>
                    <Text style={[styles.date, { color: themeColors.subText }]}>
                        {format(parseISO(transaction.date), 'MMM dd, yyyy')} {transaction.note ? `• ${transaction.note}` : ''}
                    </Text>
                </View>
                <View style={styles.amountContainer}>
                    <TouchableOpacity onPress={handlePressAmount} activeOpacity={0.7}>
                        <Text style={[styles.amount, { color: amountColor }]} numberOfLines={isExpanded ? 2 : 1} adjustsFontSizeToFit>
                            {sign}{formattedAmount}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: 'bold', // Heavy weights
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        fontWeight: '300', // Light for metadata
    },
    amountContainer: {
        marginLeft: 16,
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '900', // Heavy weight for currency
    },
    rightActionContainer: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 12,
        paddingRight: 16,
    },
    actionButton: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    }
});
