import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CalendarList } from 'react-native-calendars';
import { isSameDay, parseISO, format } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { getColors, getReadableColor, getContrastColor } from '../theme/colors';
import TransactionItem from '../components/TransactionItem';

type ParamList = {
    AccountDetails: { accountId: number };
};

export default function AccountDetailsScreen() {
    const route = useRoute<RouteProp<ParamList, 'AccountDetails'>>();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { accountId } = route.params;

    const { accounts, transactions, categories, isDarkMode, themeColor } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Get the active account
    const account = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);

    const allAccountTransactions = useMemo(() => {
        return transactions.filter(tx => tx.account_id === accountId || tx.to_account_id === accountId);
    }, [transactions, accountId]);

    const accountTransactions = useMemo(() => {
        if (!filterDate) return allAccountTransactions;
        return allAccountTransactions.filter(tx => isSameDay(parseISO(tx.date), filterDate));
    }, [allAccountTransactions, filterDate]);

    const markedDates = useMemo(() => {
        const marks: any = {};
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        allAccountTransactions.forEach(tx => {
            const dateStr = format(parseISO(tx.date), 'yyyy-MM-dd');
            marks[dateStr] = { marked: true, dotColor: readablePrimary };
        });

        marks[todayStr] = { 
            ...marks[todayStr], 
            selected: true, 
            selectedColor: readablePrimary,
            selectedTextColor: getContrastColor(readablePrimary)
        };

        if (filterDate) {
            const filterStr = format(filterDate, 'yyyy-MM-dd');
            marks[filterStr] = {
                ...marks[filterStr],
                selected: true,
                selectedColor: readablePrimary,
                selectedTextColor: getContrastColor(readablePrimary)
            };
        }

        return marks;
    }, [allAccountTransactions, filterDate, readablePrimary]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFilterDate(selectedDate);
        }
    };

    if (!account) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.text }]}>Account not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.cardAlt }]}>
                    <Ionicons name={account.type === 'cash' ? 'cash' : (account.type === 'wallet' ? 'wallet' : 'card')} size={32} color={readablePrimary} />
                </View>
                <Text style={[styles.accountType, { color: colors.subText }]}>{account.type.toUpperCase()}</Text>
                <Text style={[styles.accountBalance, account.balance < 0 ? { color: colors.danger } : { color: colors.text }]}>
                    ${account.balance.toFixed(2)}
                </Text>
            </View>

            <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>

                <View style={styles.filterActions}>
                    {filterDate && (
                        <TouchableOpacity
                            style={[styles.clearFilterBtn, { backgroundColor: colors.danger + '20' }]}
                            onPress={() => setFilterDate(null)}
                        >
                            <Text style={[styles.clearFilterText, { color: colors.danger }]}>Clear: {format(filterDate, 'MMM d')}</Text>
                            <Ionicons name="close-circle" size={16} color={colors.danger} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.dateFilterBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={readablePrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Bar */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{account.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Transaction List */}
            <FlatList
                data={accountTransactions}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    const category = categories.find(c => c.id === item.category_id);
                    return <TransactionItem transaction={item} category={category} />;
                }}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color={colors.subText} style={{ opacity: 0.5, marginBottom: 16 }} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>No transactions found.</Text>
                        {filterDate && (
                            <Text style={[styles.emptySubText, { color: colors.subText }]}>No activity on this specific date.</Text>
                        )}
                    </View>
                }
            />

            {/* Custom Calendar Overlay */}
            <Modal visible={showDatePicker} transparent animationType="fade">
                <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                        <CalendarList
                            horizontal={true}
                            pagingEnabled={false}
                            snapToAlignment="center"
                            snapToInterval={Dimensions.get('window').width - 48}
                            decelerationRate="fast"
                            disableIntervalMomentum={true}
                            showsHorizontalScrollIndicator={false}
                            calendarWidth={Dimensions.get('window').width - 48}
                            current={format(filterDate || new Date(), 'yyyy-MM-dd')}
                            markedDates={markedDates}
                            onDayPress={(day: any) => {
                                setFilterDate(new Date(day.timestamp));
                                setShowDatePicker(false);
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
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={{ color: colors.subText, fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 0,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent', // Will inherit from theme if needed
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    headerContent: {
        padding: 16,
    },
    balanceCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 24,
        marginBottom: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 3,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    accountType: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },
    accountBalance: {
        fontSize: 36,
        fontWeight: '900',
    },
    filterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        marginLeft: 4,
    },
    filterActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateFilterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    clearFilterText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        fontWeight: '300',
    }
});
