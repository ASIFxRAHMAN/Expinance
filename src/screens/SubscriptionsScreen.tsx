import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { Subscription } from '../database/types';
import { format, parseISO, addMonths, addWeeks, addYears } from 'date-fns';
import { getColors } from '../theme/colors';

export default function SubscriptionsScreen() {
    const { subscriptions, addSubscription, deleteSubscription, isDarkMode } = useAppStore();
    const colors = getColors(isDarkMode);
    const [isModalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [cycle, setCycle] = useState<'monthly' | 'annual' | 'weekly'>('monthly');
    const [startDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
        if (sub.billing_cycle === 'monthly') return total + sub.amount;
        if (sub.billing_cycle === 'weekly') return total + (sub.amount * 4.33);
        if (sub.billing_cycle === 'annual') return total + (sub.amount / 12);
        return total;
    }, 0);

    const handleSave = async () => {
        if (!name || !amount || isNaN(Number(amount))) {
            Alert.alert('Invalid', 'Please enter a valid name and amount.');
            return;
        }

        const start = parseISO(startDate);
        let nextBilling = start;
        if (cycle === 'monthly') nextBilling = addMonths(start, 1);
        else if (cycle === 'weekly') nextBilling = addWeeks(start, 1);
        else if (cycle === 'annual') nextBilling = addYears(start, 1);

        await addSubscription(
            name,
            Number(amount),
            cycle,
            format(start, 'yyyy-MM-dd'),
            format(nextBilling, 'yyyy-MM-dd'),
            3 // Reminder 3 days before initially
        );
        setModalVisible(false);
        setName('');
        setAmount('');
    };

    const confirmDelete = (id: number, subName: string) => {
        Alert.alert('Cancel Subscription', `Stop tracking ${subName}?`, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(id) }
        ]);
    };

    const renderItem = ({ item }: { item: Subscription }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.subName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.subAmount, { color: colors.primary }]}>${item.amount.toFixed(2)} <Text style={[styles.cycleText, { color: colors.subText }]}>/{item.billing_cycle === 'monthly' ? 'mo' : item.billing_cycle === 'weekly' ? 'wk' : 'yr'}</Text></Text>
            </View>
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.nextBilling, { color: colors.subText }]}>Next: {format(parseISO(item.next_billing_date), 'MMM dd, yyyy')}</Text>
                <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.headerTitle, { color: colors.subText }]}>Total Monthly Fixed Costs</Text>
                <Text style={[styles.headerTotal, { color: colors.primary }]}>${monthlyTotal.toFixed(2)}</Text>
            </View>

            <FlatList
                data={subscriptions}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingBottom: 160 }]}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.subText }]}>No active subscriptions found.</Text>
                }
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>Add Subscription</Text>
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>New Subscription</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        placeholderTextColor={colors.subText}
                        placeholder="Service Name (e.g. Netflix)"
                        value={name}
                        onChangeText={setName}
                    />
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        placeholderTextColor={colors.subText}
                        placeholder="Amount"
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <View style={styles.cycleSelector}>
                        {['weekly', 'monthly', 'annual'].map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.cycleBtn, { backgroundColor: colors.border }, cycle === c && { backgroundColor: colors.primary }]}
                                onPress={() => setCycle(c as any)}
                            >
                                <Text style={[styles.cycleTextBtn, { color: colors.subText }, cycle === c && { color: '#FFF' }]}>
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                            <Text style={[styles.cancelText, { color: colors.subText }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '300' },
    headerTotal: { fontSize: 44, fontWeight: '900', marginTop: 8 },
    list: { padding: 16 },
    card: {
        borderRadius: 24,
        padding: 20, // Increased padding for Bento style
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    subName: { fontSize: 18, fontWeight: '900' }, // Heavy mapping
    subAmount: { fontSize: 20, fontWeight: '900' },
    cycleText: { fontSize: 12, color: '#888', fontWeight: 'normal' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F3F5', paddingTop: 12 },
    nextBilling: { fontSize: 14, color: '#6C757D', fontWeight: '500' },
    addButton: {
        margin: 16,
        borderRadius: 24, // Bento radius
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 100, // Clearance for Dock
    },
    addButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 32 },
    modalContainer: { flex: 1, padding: 24, backgroundColor: '#F8F9FA' },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
    input: { backgroundColor: '#FFF', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#DDD' },
    cycleSelector: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    cycleBtn: { flex: 1, padding: 12, backgroundColor: '#E9ECEF', borderRadius: 8, alignItems: 'center' },
    cycleBtnActive: { backgroundColor: '#4682B4' },
    cycleTextBtn: { fontWeight: '600', color: '#666' },
    cycleTextBtnActive: { color: '#FFF' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
    cancelBtn: { padding: 16 },
    cancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
    saveBtn: { backgroundColor: '#4682B4', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 8 },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
