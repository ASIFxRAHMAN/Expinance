import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { VictoryPie, VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory-native';
import { parseISO, format, subMonths, isSameMonth, subDays, isSameDay } from 'date-fns';
import InteractiveChart from '../components/InteractiveChart';
import { getColors, getReadableColor } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
    const { transactions, categories, isDarkMode, themeColor } = useAppStore();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const colors = getColors(isDarkMode, themeColor);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    const { categoryData, totalExpensesThisMonth, monthlyTrendData, dailyTrendData } = useMemo(() => {
        // 1. Category Pie Data for Selected Month (Expenses Only)
        const expensesThisMonth = transactions.filter(t => t.type === 'expense' && isSameMonth(parseISO(t.date), selectedMonth));

        const categoryTotals: Record<number, number> = {};
        expensesThisMonth.forEach(tx => {
            const catId = tx.category_id || -1;
            categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.amount;
        });

        const categoryData = Object.keys(categoryTotals).map(catIdStr => {
            const catId = Number(catIdStr);
            const category = categories.find(c => c.id === catId);
            return {
                x: category ? category.name : 'Other',
                y: categoryTotals[catId],
                color: category?.color || '#808080'
            };
        }).sort((a, b) => b.y - a.y); // Sort by highest expense

        const totalExpensesThisMonth = categoryData.reduce((sum, item) => sum + item.y, 0);

        // 2. Trend Line Data (Last 6 MonthsNet/Expenses)
        const trendData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const txsInMonth = transactions.filter(t => isSameMonth(parseISO(t.date), monthDate));

            const totalExpense = txsInMonth.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            trendData.push({
                label: format(monthDate, 'MMM'),
                value: totalExpense,
                fullDate: format(monthDate, 'MMMM yyyy')
            });
        }

        // 3. Daily Trend Data (Last 30 Days)
        const dailyData = [];
        for (let i = 29; i >= 0; i--) {
            const dayDate = subDays(new Date(), i);
            const txsInDay = transactions.filter(t => isSameDay(parseISO(t.date), dayDate));
            const totalExpense = txsInDay.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

            let label = '';
            if (i === 29 || i === 0 || i === 15) {
                label = format(dayDate, 'MMM d');
            }

            dailyData.push({
                label,
                value: totalExpense,
                fullDate: format(dayDate, 'MMM do, yyyy')
            });
        }

        return { categoryData, totalExpensesThisMonth, monthlyTrendData: trendData, dailyTrendData: dailyData };
    }, [transactions, categories, selectedMonth]);

    const topCategory = categoryData[0];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Smart Insights */}
                <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Insights</Text>
                    {topCategory ? (
                        <View style={[styles.insightCard, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[styles.insightText, { color: colors.text }]}>
                                Your top spending category this month is <Text style={{ fontWeight: 'bold', color: topCategory.color }}>{topCategory.x}</Text> at ${topCategory.y.toFixed(2)}.
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[styles.insightText, { color: colors.text }]}>Not enough data for insights this month.</Text>
                        </View>
                    )}
                </View>

                {/* Expense Pie Chart */}
                <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Spending by Category</Text>
                    {categoryData.length > 0 ? (
                        <View style={{ width: '100%' }}>
                            <VictoryPie
                                data={categoryData}
                                colorScale={categoryData.map(c => c.color)}
                                width={screenWidth - 80}
                                height={250}
                                innerRadius={60}
                                padAngle={2}
                                labels={() => null} // Disable floating labels completely
                            />

                            {/* Legend Table */}
                            <View style={styles.legendContainer}>
                                {categoryData.map((item, index) => {
                                    const percentage = ((item.y / totalExpensesThisMonth) * 100).toFixed(1);
                                    return (
                                        <View key={index} style={[styles.legendRow, { borderBottomColor: colors.border }]}>
                                            <View style={styles.legendLabelGroup}>
                                                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                                <Text style={[styles.legendText, { color: colors.text }]}>{item.x}</Text>
                                            </View>
                                            <View style={styles.legendValueGroup}>
                                                <Text style={[styles.legendPercentage, { color: colors.subText }]}>{percentage}%</Text>
                                                <Text style={[styles.legendAmount, { color: colors.text }]}>${item.y.toFixed(2)}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.noDataText}>No expenses this month</Text>
                    )}
                </View>

                {/* Trend Line Chart */}
                <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 0, paddingBottom: 16 }]}>
                    <Text style={[styles.chartTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Expense Trend</Text>
                    <InteractiveChart
                        monthlyData={monthlyTrendData}
                        dailyData={dailyTrendData}
                        width={screenWidth - 34} // Account for borders
                        height={250}
                        color={readablePrimary}
                        textColor={colors.subText}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    insightsContainer: { padding: 16 },
    sectionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 16, marginLeft: 4 },
    insightCard: {
        borderRadius: 24,
        padding: 24,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    insightText: { fontSize: 14, color: '#495057', lineHeight: 20 },
    chartContainer: {
        margin: 16,
        marginTop: 0,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    chartTitle: { fontSize: 18, fontWeight: '900', alignSelf: 'center', marginBottom: 16 },
    noDataText: { marginTop: 40, color: '#888', fontStyle: 'italic' },
    legendContainer: { width: '100%', marginTop: 8 },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth
    },
    legendLabelGroup: { flexDirection: 'row', alignItems: 'center' },
    colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
    legendText: { fontSize: 15, fontWeight: '600' },
    legendValueGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    legendPercentage: { fontSize: 14, fontWeight: '500', minWidth: 45, textAlign: 'right' },
    legendAmount: { fontSize: 15, fontWeight: 'bold', minWidth: 70, textAlign: 'right' }
});
