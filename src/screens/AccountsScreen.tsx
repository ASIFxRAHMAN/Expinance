import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { Account, Transaction } from '../database/types';
import { getColors } from '../theme/colors';
import { VictoryLine } from 'victory-native';
import { subDays, parseISO, isAfter } from 'date-fns';

export default function AccountsScreen() {
    const { accounts, transactions, addAccount, deleteAccount, isDarkMode } = useAppStore();
    const colors = getColors(isDarkMode);
    const [isAdding, setIsAdding] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState<'cash' | 'bank' | 'wallet' | 'custom'>('bank');
    const [newAccountBalance, setNewAccountBalance] = useState('');

    const accountTrendData = useMemo(() => {
        const trends: Record<number, { x: number, y: number }[]> = {};
        const sevenDaysAgo = subDays(new Date(), 7);

        accounts.forEach(acc => {
            const recentTxs = transactions.filter(t =>
                (t.account_id === acc.id || t.to_account_id === acc.id) &&
                isAfter(parseISO(t.date), sevenDaysAgo)
            );

            if (recentTxs.length === 0) {
                trends[acc.id] = [{ x: 1, y: acc.balance }, { x: 7, y: acc.balance }];
                return;
            }

            let runningBal = acc.balance;
            const points = [{ x: 7, y: runningBal }];
            const sorted = [...recentTxs].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

            sorted.forEach((tx, idx) => {
                let impact = 0;
                if (tx.type === 'expense') impact = -tx.amount;
                if (tx.type === 'income') impact = tx.amount;
                if (tx.type === 'transfer') {
                    if (tx.to_account_id === acc.id) impact = tx.amount;
                    else impact = -tx.amount;
                }
                runningBal -= impact;
                points.push({ x: 7 - (idx + 1), y: runningBal });
            });

            trends[acc.id] = points.reverse();
        });

        return trends;
    }, [accounts, transactions]);

    const handleAddAccount = async () => {
        if (!newAccountName || isNaN(Number(newAccountBalance))) {
            Alert.alert('Invalid Input', 'Please enter a valid name and initial balance.');
            return;
        }
        try {
            await addAccount(newAccountName, newAccountType, Number(newAccountBalance));
            setIsAdding(false);
            setNewAccountName('');
            setNewAccountBalance('');
        } catch (error: any) {
            Alert.alert('Database Error', error.message || 'Failed to create account.');
        }
    };

    const confirmDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete Account',
            `Are you sure you want to delete ${name}? This will remove associated transactions!`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(id) }
            ]
        );
    };

    const renderAccount = ({ item }: { item: Account }) => (
        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.accountInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.cardAlt }]}>
                    <Ionicons name={item.type === 'cash' ? 'cash' : (item.type === 'wallet' ? 'wallet' : 'card')} size={24} color={colors.primary} />
                </View>
                <View>
                    <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.accountType, { color: colors.subText }]}>{item.type.toUpperCase()}</Text>
                </View>
            </View>
            <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 16 }}>
                {accountTrendData[item.id] && (
                    <VictoryLine
                        data={accountTrendData[item.id]}
                        style={{ data: { stroke: colors.primary, strokeWidth: 2 } }}
                        width={60}
                        height={40}
                        padding={0}
                    />
                )}
            </View>
            <View style={styles.accountRight}>
                {/* Note: In the new theme, positive amounts shouldn't always be green unless strictly necessary. We use the True Black contrast. */}
                <Text style={[styles.accountBalance, item.balance < 0 ? { color: colors.danger } : { color: colors.text }]}>
                    ${item.balance.toFixed(2)}
                </Text>
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {isAdding ? (
                <View style={[styles.addForm, { backgroundColor: colors.card }]}>
                    <Text style={[styles.formTitle, { color: colors.text }]}>Add New Account</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholderTextColor={colors.subText}
                        placeholder="Account Name (e.g. Chase Sapphire)"
                        value={newAccountName}
                        onChangeText={setNewAccountName}
                    />
                    <View style={styles.typeSelector}>
                        {['cash', 'bank', 'wallet', 'custom'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.typeBtn, { backgroundColor: colors.border }, newAccountType === t && { backgroundColor: colors.primary }]}
                                onPress={() => setNewAccountType(t as any)}
                            >
                                <Text style={[styles.typeBtnText, { color: colors.subText }, newAccountType === t && { color: '#FFF' }]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholderTextColor={colors.subText}
                        placeholder="Initial Balance"
                        keyboardType="decimal-pad"
                        value={newAccountBalance}
                        onChangeText={setNewAccountBalance}
                    />
                    <View style={styles.formActions}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setIsAdding(false)}>
                            <Text style={[styles.cancelBtnText, { color: colors.subText }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAddAccount}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <FlatList
                        data={accounts}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderAccount}
                        contentContainerStyle={[styles.list, { paddingBottom: 160 }]}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No accounts found. Create one to start tracking!</Text>
                        }
                    />
                    <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => setIsAdding(true)}>
                        <Ionicons name="add" size={24} color="#FFF" />
                        <Text style={styles.addButtonText}>Add Account</Text>
                    </TouchableOpacity>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    list: { padding: 16 },
    accountCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    accountInfo: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E9ECEF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    accountName: { fontSize: 16, fontWeight: '900' }, // Heavy text mapping
    accountType: { fontSize: 12, marginTop: 4, fontWeight: '300' }, // Light metadata
    accountRight: { alignItems: 'flex-end', flexDirection: 'row' },
    accountBalance: { fontSize: 18, fontWeight: '900', marginRight: 16 },
    deleteButton: { padding: 8 },
    addButton: {
        margin: 16,
        backgroundColor: '#8A2BE2', // Electric Violet (from colors.ts)
        borderRadius: 24, // Bento radius mapping
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8A2BE2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 100, // accommodate the new Floating Bottom Dock
    },
    addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 32 },
    addForm: { padding: 16, backgroundColor: '#FFF', margin: 16, borderRadius: 12, elevation: 4 },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    typeSelector: { flexDirection: 'row', marginBottom: 16, gap: 8, flexWrap: 'wrap' },
    typeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#E9ECEF' },
    typeBtnActive: { backgroundColor: '#4682B4' },
    typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
    typeBtnTextActive: { color: '#FFF' },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    actionBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    cancelBtn: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DDD' },
    saveBtn: { backgroundColor: '#4682B4' },
    cancelBtnText: { color: '#666', fontWeight: '600' },
    saveBtnText: { color: '#FFF', fontWeight: 'bold' }
});
