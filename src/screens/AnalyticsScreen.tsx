import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { VictoryPie, VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory-native';
import { parseISO, format, subMonths, isSameMonth } from 'date-fns';
import { getColors } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
    const { transactions, categories, isDarkMode } = useAppStore();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const colors = getColors(isDarkMode);

    const { categoryData, monthlyTrendData } = useMemo(() => {
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

        // 2. Trend Line Data (Last 6 MonthsNet/Expenses)
        const trendData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const txsInMonth = transactions.filter(t => isSameMonth(parseISO(t.date), monthDate));

            const totalExpense = txsInMonth.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            trendData.push({
                x: format(monthDate, 'MMM'),
                y: totalExpense
            });
        }

        return { categoryData, monthlyTrendData: trendData };
    }, [transactions, categories, selectedMonth]);

    const topCategory = categoryData[0];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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
                        <VictoryPie
                            data={categoryData}
                            colorScale={categoryData.map(c => c.color)}
                            width={screenWidth - 32}
                            height={250}
                            innerRadius={50}
                            padAngle={2}
                            style={{
                                labels: { fill: colors.text, fontSize: 12, fontWeight: 'bold' }
                            }}
                        />
                    ) : (
                        <Text style={styles.noDataText}>No expenses this month</Text>
                    )}
                </View>

                {/* Trend Line Chart */}
                <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Trend (6 Months)</Text>
                    <VictoryChart width={screenWidth - 32} height={250} theme={VictoryTheme.material}>
                        <VictoryAxis tickFormat={(t) => t} style={{ tickLabels: { fill: colors.text }, axis: { stroke: colors.text } }} />
                        <VictoryAxis dependentAxis tickFormat={(x) => `$${x}`} style={{ tickLabels: { fill: colors.text }, axis: { stroke: colors.text } }} />
                        <VictoryLine
                            data={monthlyTrendData}
                            style={{
                                data: { stroke: colors.danger, strokeWidth: 3 },
                            }}
                            animate={{
                                duration: 500,
                                onLoad: { duration: 500 }
                            }}
                        />
                    </VictoryChart>
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
    chartTitle: { fontSize: 18, fontWeight: '900', alignSelf: 'flex-start', marginBottom: 16 },
    noDataText: { marginTop: 40, color: '#888', fontStyle: 'italic' }
});
