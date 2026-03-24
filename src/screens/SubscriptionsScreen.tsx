import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, Switch, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarList } from 'react-native-calendars';
import { BlurView } from 'expo-blur';
import { useAppStore } from '../store/useAppStore';
import { Subscription } from '../database/types';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { getColors, getContrastColor, getReadableColor } from '../theme/colors';

export default function SubscriptionsScreen() {
    const route = useRoute<any>();
    const { subscriptions, addSubscription, deleteSubscription, isDarkMode, themeColor, showAlert } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const contrastColor = getContrastColor(colors.primary);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [cycle, setCycle] = useState<'monthly' | 'annual' | 'weekly'>('monthly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [tenureDays, setTenureDays] = useState('30');
    const [isRecurring, setIsRecurring] = useState(true);
    const [reminderDays, setReminderDays] = useState('3');

    useEffect(() => {
        if (route.params?.intentData) {
            const intent = route.params.intentData;
            if (intent.action === 'ADD_SUBSCRIPTION') {
                setModalVisible(true);
                if (intent.title) setName(intent.title);
                if (intent.amount !== undefined) setAmount(intent.amount.toString());
                if (intent.tenureDays !== undefined) {
                    setTenureDays(intent.tenureDays.toString());
                    if (intent.tenureDays >= 360) setCycle('annual');
                    else if (intent.tenureDays <= 14) setCycle('weekly');
                    else setCycle('monthly');
                } else if (intent.cycle) {
                    setCycle(intent.cycle === 'yearly' ? 'annual' : 'monthly');
                    setTenureDays(intent.cycle === 'yearly' ? '365' : '30');
                }
                if (intent.date) {
                    try {
                        const parsedDate = new Date(intent.date);
                        if (!isNaN(parsedDate.getTime())) setStartDate(intent.date);
                    } catch {}
                }
            }
        }
    }, [route.params?.intentData]);

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
        // Fallback or explicit mapping for older subscriptions without 'tenure_days'
        const tenure = sub.tenure_days || (
            sub.billing_cycle === 'weekly' ? 7 :
                sub.billing_cycle === 'annual' ? 365 :
                    30
        );
        // Calculate the daily cost and normalize it to a 30-day "monthly" metric
        const dailyCost = sub.amount / tenure;
        return total + (dailyCost * 30);
    }, 0);

    const handleSave = async () => {
        const tenure = parseInt(tenureDays, 10);
        const reminders = parseInt(reminderDays, 10);

        if (!name || !amount || isNaN(Number(amount)) || isNaN(tenure) || tenure <= 0 || isNaN(reminders) || reminders < 0) {
            showAlert('Invalid', 'Please enter valid values for all fields.', [{ text: 'OK', style: 'default' }]);
            return;
        }

        const start = parseISO(startDate);
        // By default, assume the next billing date is exactly "tenure" days from the start date if they just created it.
        // However, if the user explicitly picks a startDate in the past, or future, the next billing date is simply start + tenure.
        const nextBilling = addDays(start, tenure);

        // Map the custom tenure into a generic cycle format for legacy fallback purposes in UI
        let computedCycle: 'weekly' | 'monthly' | 'annual' = 'monthly';
        if (tenure <= 14) computedCycle = 'weekly';
        else if (tenure >= 360) computedCycle = 'annual';

        await addSubscription(
            name,
            Number(amount),
            computedCycle, // Legacy fallback
            format(start, 'yyyy-MM-dd'),
            format(nextBilling, 'yyyy-MM-dd'),
            reminders,
            tenure,
            isRecurring ? 1 : 0
        );

        setModalVisible(false);
        // Reset form
        setName('');
        setAmount('');
        setTenureDays('30');
        setIsRecurring(true);
        setReminderDays('3');
        setStartDate(new Date().toISOString().split('T')[0]);
    };

    const confirmDelete = (id: number, subName: string) => {
        showAlert('Cancel Subscription', `Stop tracking ${subName}?`, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(id) }
        ]);
    };

    const renderItem = ({ item }: { item: Subscription }) => {
        const tenureDisplay = item.tenure_days === 30 ? '/mo' :
            item.tenure_days === 7 ? '/wk' :
                item.tenure_days === 365 ? '/yr' :
                    `/${item.tenure_days}d`;

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.subName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.subAmount, { color: readablePrimary }]}>
                        ${item.amount.toFixed(2)}
                        <Text style={[styles.cycleText, { color: colors.subText }]}> {tenureDisplay}</Text>
                    </Text>
                </View>
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.nextBilling, { color: colors.subText }]}>
                        Next: {format(parseISO(item.next_billing_date), 'MMM dd, yyyy')}
                        {!item.is_recurring && " (One-time)"}
                    </Text>
                    <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.headerTitle, { color: colors.subText }]}>Total Monthly Fixed Costs</Text>
                <Text style={[styles.headerTotal, { color: readablePrimary }]}>${monthlyTotal.toFixed(2)}</Text>
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

            <TouchableOpacity style={[styles.addButton, { backgroundColor: readablePrimary, shadowColor: readablePrimary }]} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={24} color={getContrastColor(readablePrimary)} />
                <Text style={[styles.addButtonText, { color: getContrastColor(readablePrimary) }]}>Add Subscription</Text>
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

                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setDatePickerVisible(true)}>
                        <Text style={{ color: colors.text }}>
                            Start Date: {format(parseISO(startDate), 'MMM dd, yyyy')}
                        </Text>
                    </TouchableOpacity>

                    {/* Custom Calendar Overlay */}
                    <Modal visible={isDatePickerVisible} transparent animationType="fade">
                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.calendarOverlay}>
                            <View style={[styles.calendarContent, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                                <CalendarList
                                    horizontal={true}
                                    pagingEnabled={false}
                                    snapToAlignment="center"
                                    snapToInterval={Dimensions.get('window').width - 48}
                                    decelerationRate="fast"
                                    disableIntervalMomentum={true}
                                    showsHorizontalScrollIndicator={false}
                                    calendarWidth={Dimensions.get('window').width - 48}
                                    current={startDate}
                                    markedDates={{
                                        [format(new Date(), 'yyyy-MM-dd')]: { selected: true, selectedColor: readablePrimary, selectedTextColor: getContrastColor(readablePrimary) },
                                        [startDate]: { selected: true, selectedColor: readablePrimary, selectedTextColor: getContrastColor(readablePrimary) }
                                    }}
                                    onDayPress={(day: any) => {
                                        setStartDate(day.dateString);
                                        setDatePickerVisible(false);
                                    }}
                                    theme={{
                                        calendarBackground: colors.card,
                                        textSectionTitleColor: colors.subText,
                                        selectedDayBackgroundColor: readablePrimary,
                                        selectedDayTextColor: getContrastColor(readablePrimary),
                                        todayTextColor: readablePrimary,
                                        dayTextColor: colors.text,
                                        textDisabledColor: colors.border,
                                        dotColor: readablePrimary,
                                        selectedDotColor: getContrastColor(readablePrimary),
                                        arrowColor: readablePrimary,
                                        disabledArrowColor: colors.border,
                                        monthTextColor: colors.text,
                                        indicatorColor: readablePrimary,
                                        textDayFontWeight: '500',
                                        textMonthFontWeight: 'bold',
                                        textDayHeaderFontWeight: '500',
                                        textDayFontSize: 16,
                                        textMonthFontSize: 18,
                                        textDayHeaderFontSize: 14
                                    }}
                                />
                                <TouchableOpacity
                                    style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border }}
                                    onPress={() => setDatePickerVisible(false)}
                                >
                                    <Text style={{ color: colors.subText, fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </Modal>

                    <View style={styles.inputRow}>
                        <View style={styles.inputFlex}>
                            <Text style={[styles.inputLabel, { color: colors.subText }]}>Billing Cycle (Days)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholderTextColor={colors.subText}
                                placeholder="e.g. 30"
                                keyboardType="number-pad"
                                value={tenureDays}
                                onChangeText={setTenureDays}
                            />
                        </View>
                        <View style={styles.inputFlex}>
                            <Text style={[styles.inputLabel, { color: colors.subText }]}>Remind Me (Days Prior)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholderTextColor={colors.subText}
                                placeholder="e.g. 3"
                                keyboardType="number-pad"
                                value={reminderDays}
                                onChangeText={setReminderDays}
                            />
                        </View>
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>Recurring Subscription?</Text>
                        <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ false: colors.border, true: readablePrimary }}
                            thumbColor="#FFF"
                        />
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                            <Text style={[styles.cancelText, { color: colors.subText }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: readablePrimary }]}>
                            <Text style={[styles.saveText, { color: getContrastColor(readablePrimary) }]}>Save</Text>
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
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputFlex: { flex: 1 },
    inputLabel: { fontSize: 12, marginBottom: 6, fontWeight: '500', marginLeft: 4 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
    switchLabel: { fontSize: 16, fontWeight: '500' },
    calendarOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    calendarContent: {
        width: '90%',
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
    cancelBtn: { padding: 16 },
    cancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
    saveBtn: { backgroundColor: '#4682B4', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 8 },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
