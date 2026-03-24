import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import SummaryCard from '../components/SummaryCard';
import TransactionItem from '../components/TransactionItem';
import FAB from '../components/FAB';
import VoiceAssistantFAB from '../components/VoiceAssistantFAB';
import { isSameDay, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { getColors, getReadableColor } from '../theme/colors';
import { VictoryPie } from 'victory-native';

type TimePeriod = 'Daily' | 'Weekly' | 'Monthly';

export default function HomeScreen() {
    const { transactions, categories, isDarkMode, themeColor } = useAppStore();
    const [period, setPeriod] = useState<TimePeriod>('Monthly');
    const colors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    const { income, expense, net } = useMemo(() => {
        let inc = 0;
        let exp = 0;
        const now = new Date();

        transactions.forEach(tx => {
            const txDate = parseISO(tx.date);
            let isIncluded = false;

            if (period === 'Daily') isIncluded = isSameDay(txDate, now);
            else if (period === 'Weekly') isIncluded = isSameWeek(txDate, now, { weekStartsOn: 1 });
            else if (period === 'Monthly') isIncluded = isSameMonth(txDate, now);

            if (isIncluded) {
                if (tx.type === 'income') inc += tx.amount;
                else if (tx.type === 'expense') exp += tx.amount;
            }
        });

        return { income: inc, expense: exp, net: inc - exp };
    }, [transactions, period]);

    const allTransactions = useMemo(() => transactions, [transactions]);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Period Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}>
                {(['Daily', 'Weekly', 'Monthly'] as TimePeriod[]).map(p => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.toggleButton, period === p && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2, borderRadius: 20 }]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text style={[styles.toggleText, { color: colors.subText }, period === p && { color: colors.text, fontWeight: '900' }]}>{p}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                <SummaryCard label="Income" amount={income} type="positive" />
                <SummaryCard label="Expenses" amount={expense} type="negative" />
                <SummaryCard label="Net" amount={net} type="neutral" />
            </View>

            {/* Dynamic Circular Progress Ring */}
            <View style={[styles.ringContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={styles.ringLeft}>
                    <Text style={[styles.ringTitle, { color: colors.text }]}>Cash Flow</Text>
                    <Text style={[styles.ringSub, { color: colors.subText }]}>{income > 0 ? ((expense / income) * 100).toFixed(0) : '0'}% of Income spent</Text>
                </View>
                <View pointerEvents="none" style={styles.ringChart}>
                    <VictoryPie
                        data={[{ x: 'Spent', y: expense }, { x: 'Remaining', y: Math.max(0, income - expense) }]}
                        colorScale={[readablePrimary, colors.cardAlt]}
                        innerRadius={25}
                        radius={35}
                        width={80}
                        height={80}
                        padding={0}
                        labels={() => null}
                    />
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={allTransactions}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    const category = categories.find(c => c.id === item.category_id);
                    return <TransactionItem transaction={item} category={category} />;
                }}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 160 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No transactions yet.</Text>
                        <Text style={[styles.emptySubText, { color: colors.subText }]}>Tap the + button to add one.</Text>
                    </View>
                }
            />
            <VoiceAssistantFAB />
            <FAB />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    headerContainer: { padding: 16 },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    toggleText: { fontSize: 14, fontWeight: '300' },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    ringContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    ringLeft: { flex: 1 },
    ringTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    ringSub: { fontSize: 14, fontWeight: '300' },
    ringChart: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900', // Heavy Variable font spec
        marginBottom: 12,
        marginLeft: 4,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    emptySubText: {
        fontSize: 14,
        fontWeight: '300', // Light spec
    }
});
