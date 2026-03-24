import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getColors } from '../theme/colors';

export default function AddTransactionScreen() {
    const navigation = useNavigation<any>();
    const { accounts, categories, addTransaction, addCategory, isDarkMode } = useAppStore();
    const colors = getColors(isDarkMode);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(accounts[0]?.id || null);
    const [toAccount, setToAccount] = useState<number | null>(accounts.length > 1 ? accounts[1].id : null);
    const [note, setNote] = useState('');

    // Custom Category State
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Batch Entry State
    const [isPinned, setIsPinned] = useState(false);

    // Date Picker State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount)) || !selectedAccount) {
            Alert.alert('Invalid Input', 'Please enter a valid amount and select an account.');
            return;
        }

        if (type === 'transfer' && (!toAccount || selectedAccount === toAccount)) {
            Alert.alert('Invalid Transfer', 'Please ensure you have selected two different accounts for the transfer.');
            return;
        }

        const numAmount = Number(amount);

        try {
            await addTransaction(
                numAmount,
                type,
                type === 'transfer' ? null : selectedCategory,
                selectedAccount,
                type === 'transfer' ? toAccount : null,
                format(date, 'yyyy-MM-dd'),
                note
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (isPinned) {
                setAmount('');
                setNote('');
                // Keep category, account, date the same for quick sequential entry
            } else {
                navigation.goBack();
            }
        } catch (error: any) {
            Alert.alert('Database Error', error.message || 'Failed to save transaction.');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            setIsAddingCategory(false);
            return;
        }
        // Basic fallback color/icon for custom categories
        await addCategory(newCategoryName.trim(), 'pricetag-outline', colors.primary, type === 'transfer' ? 'expense' : type);
        setIsAddingCategory(false);
        setNewCategoryName('');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background, paddingVertical: 20 }]}>
                <Text style={[styles.title, { color: colors.text }]}>New Transaction</Text>
                <TouchableOpacity onPress={() => setIsPinned(!isPinned)} style={[styles.pinButton, isPinned && { backgroundColor: colors.cardAlt }]}>
                    <Ionicons name="pin" size={20} color={isPinned ? colors.primary : colors.subText} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Type Toggle */}
                <View style={[styles.typeSelector, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}>
                    {['expense', 'income', 'transfer'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.typeButton, type === t && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2, borderRadius: 20 }]}
                            onPress={() => setType(t as any)}
                        >
                            <Text style={[styles.typeText, { color: colors.subText }, type === t && { color: colors.text, fontWeight: '900' }]}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>Amount</Text>
                    <TextInput
                        style={[styles.amountInput, { color: colors.text, borderBottomColor: colors.border }]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.subText}
                        placeholder="0.00"
                        autoFocus
                    />
                </View>

                {/* Date Selection */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>Date</Text>
                    <TouchableOpacity
                        style={[styles.dateSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
                        <Text style={[styles.dateText, { color: colors.text }]}>{format(date, 'MMMM do, yyyy')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}
                </View>

                {/* Category Pick (Chips) */}
                {type !== 'transfer' && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>Category</Text>
                        <View style={styles.chipsRow}>
                            {categories.filter(c => c.type === type).map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selectedCategory === cat.id && { backgroundColor: cat.color || colors.primary, borderColor: cat.color || colors.primary }]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Ionicons name={cat.icon as any || 'ellipse'} size={16} color={selectedCategory === cat.id ? '#FFF' : colors.text} />
                                    <Text style={[styles.chipText, { color: colors.text }, selectedCategory === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Add Custom Category Chip */}
                            {isAddingCategory ? (
                                <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.primary, paddingVertical: 4 }]}>
                                    <TextInput
                                        style={{ color: colors.text, minWidth: 80, fontSize: 14 }}
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                        placeholder="New Category"
                                        placeholderTextColor={colors.subText}
                                        autoFocus
                                        onSubmitEditing={handleAddCategory}
                                        onBlur={() => setIsAddingCategory(false)}
                                    />
                                    <TouchableOpacity onPress={handleAddCategory} style={{ marginLeft: 8 }}>
                                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.chip, { backgroundColor: 'transparent', borderColor: colors.border, borderStyle: 'dashed' }]}
                                    onPress={() => setIsAddingCategory(true)}
                                >
                                    <Ionicons name="add" size={16} color={colors.subText} />
                                    <Text style={[styles.chipText, { color: colors.subText }]}>Custom</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Account Selection */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>{type === 'transfer' ? 'From Account' : 'Account'}</Text>
                    <View style={styles.chipsRow}>
                        {accounts.map((acc) => (
                            <TouchableOpacity
                                key={`from-${acc.id}`}
                                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selectedAccount === acc.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => setSelectedAccount(acc.id)}
                            >
                                <Text style={[styles.chipText, { color: colors.text }, selectedAccount === acc.id && { color: '#FFF' }]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* To Account Selection (Transfers Only) */}
                {type === 'transfer' && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>To Account</Text>
                        <View style={styles.chipsRow}>
                            {accounts.map((acc) => (
                                <TouchableOpacity
                                    key={`to-${acc.id}`}
                                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border, opacity: selectedAccount === acc.id ? 0.5 : 1 }, toAccount === acc.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setToAccount(acc.id)}
                                    disabled={selectedAccount === acc.id}
                                >
                                    <Text style={[styles.chipText, { color: selectedAccount === acc.id ? colors.subText : colors.text }, toAccount === acc.id && { color: '#FFF' }]}>{acc.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Note Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>Note (Optional)</Text>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={note}
                        onChangeText={setNote}
                        placeholderTextColor={colors.subText}
                        placeholder="What was this for?"
                    />
                </View>
            </ScrollView>

            <View style={[styles.bottomActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => navigation.goBack()}>
                    <Text style={[styles.cancelBtnText, { color: colors.subText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Save Transaction</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#CCC',
        backgroundColor: '#FFF'
    },
    cancelButton: { fontSize: 16, color: '#888' },
    title: { fontSize: 18, fontWeight: 'bold' },
    saveButton: { fontSize: 16, color: '#4682B4', fontWeight: 'bold' },
    form: { padding: 16 },
    pinButton: { padding: 8, borderRadius: 20 },
    typeSelector: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    typeText: { fontSize: 14, fontWeight: '300' },
    typeTextActive: { color: '#333', fontWeight: 'bold' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 12, marginBottom: 8, fontWeight: '900', textTransform: 'uppercase' },
    amountInput: {
        fontSize: 56,
        fontWeight: '900',
        color: '#333',
        paddingVertical: 8,
    },
    textInput: {
        fontSize: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#333',
        fontWeight: '500'
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    bottomActions: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 24,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
    },
    saveBtn: {
        backgroundColor: '#8A2BE2',
        shadowColor: '#8A2BE2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    }
});
