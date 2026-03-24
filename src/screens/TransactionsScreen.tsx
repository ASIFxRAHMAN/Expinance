import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import TransactionItem from '../components/TransactionItem';
import FAB from '../components/FAB';
import { getColors } from '../theme/colors';

export default function TransactionsScreen() {
    const { transactions, categories, deleteTransaction, isDarkMode } = useAppStore();
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
    const colors = getColors(isDarkMode);

    const filteredTransactions = useMemo(() => {
        if (filterType === 'all') return transactions;
        return transactions.filter(t => t.type === filterType);
    }, [transactions, filterType]);

    const confirmDelete = (id: number) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={[styles.chipContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}>
                    {['all', 'income', 'expense', 'transfer'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filterType === f && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2, borderRadius: 20 }]}
                            onPress={() => setFilterType(f as any)}
                        >
                            <Text style={[styles.filterText, { color: colors.subText }, filterType === f && { color: colors.text, fontWeight: '900' }]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                data={filteredTransactions}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    const category = categories.find(c => c.id === item.category_id);
                    return (
                        <TouchableOpacity onLongPress={() => confirmDelete(item.id)} delayLongPress={500}>
                            <TransactionItem transaction={item} category={category} />
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ paddingBottom: 160 }}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.subText }]}>No transactions found for this filter.</Text>
                }
            />
            <FAB />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 24,
    },
    chipContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
    },
    filterChip: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '300',
    },
    emptyText: {
        textAlign: 'center',
        fontWeight: '300',
        marginTop: 32,
        fontSize: 16,
    }
});
