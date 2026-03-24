import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CalendarList } from 'react-native-calendars';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { parseReceiptWithGemini } from '../utils/gemini';
import { getColors, getContrastColor, getReadableColor } from '../theme/colors';

const PREDEFINED_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#F1C40F', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E67E22', '#2ECC71', '#1ABC9C', '#8A2BE2'
];

export default function AddTransactionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { accounts, categories, addTransaction, addCategory, deleteCategory, isDarkMode, themeColor, showAlert, geminiApiKey } = useAppStore();
    const colors = getColors(isDarkMode, themeColor);
    const contrastColor = getContrastColor(colors.primary);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(accounts[0]?.id || null);
    const [toAccount, setToAccount] = useState<number | null>(accounts.length > 1 ? accounts[1].id : null);
    const [note, setNote] = useState('');

    // Custom Category State
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState(colors.primary);

    // Batch Entry State
    const [isPinned, setIsPinned] = useState(false);

    // Calculator State
    const [showCalculator, setShowCalculator] = useState(false);

    // Date Picker State
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (route.params?.intentData) {
            const intent = route.params.intentData;
            
            if (intent.transactionType) setType(intent.transactionType);
            
            if (intent.amount) setAmount(intent.amount.toString());
            if (intent.title) setNote(intent.title);
            
            if (intent.categoryType) {
                const normalized = intent.categoryType.toLowerCase();
                const matchedCat = categories.find(c => c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase()));
                if (matchedCat) setSelectedCategory(matchedCat.id);
            }
            
            if (intent.accountName) {
                const normalized = intent.accountName.toLowerCase();
                const matchedAcc = accounts.find(a => a.name.toLowerCase().includes(normalized) || normalized.includes(a.name.toLowerCase()));
                if (matchedAcc) setSelectedAccount(matchedAcc.id);
            }

            if (intent.toAccountName && intent.transactionType === 'transfer') {
                const normalized = intent.toAccountName.toLowerCase();
                const matchedToAcc = accounts.find(a => a.name.toLowerCase().includes(normalized) || normalized.includes(a.name.toLowerCase()));
                if (matchedToAcc) setToAccount(matchedToAcc.id);
            }
            
            if (intent.date) {
                try {
                    const parsedDate = new Date(intent.date);
                    if (!isNaN(parsedDate.getTime())) setDate(parsedDate);
                } catch {}
            }
        }
    }, [route.params?.intentData]);

    const processReceiptImage = async (uri: string) => {
        try {
            setIsAnalyzing(true);
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            if (!manipResult.base64) throw new Error("Failed to encode image");

            const parsedData = await parseReceiptWithGemini(manipResult.base64, geminiApiKey!);
            
            if (parsedData.amount) setAmount(parsedData.amount.toString());
            if (parsedData.title) setNote(parsedData.title);
            if (parsedData.date) {
                try {
                    const parsedDate = new Date(parsedData.date);
                    if (!isNaN(parsedDate.getTime())) setDate(parsedDate);
                } catch { }
            }

            if (parsedData.categoryType) {
                const normalizedGuessedCat = parsedData.categoryType.toLowerCase();
                const matchedCat = categories.find(c => c.name.toLowerCase().includes(normalizedGuessedCat) || normalizedGuessedCat.includes(c.name.toLowerCase()));
                if (matchedCat) setSelectedCategory(matchedCat.id);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            showAlert('AI Processing Failed', error.message || 'Unable to scan receipt.', [{ text: 'OK', style: 'default' }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const launchPicker = async (useCamera: boolean) => {
        try {
            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            };

            const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                processReceiptImage(result.assets[0].uri);
            }
        } catch (error) {
            showAlert('Camera Error', 'An error occurred while launching the camera.', [{ text: 'OK', style: 'default' }]);
        }
    };

    const handleScanReceipt = async () => {
        if (!geminiApiKey) {
            showAlert('API Key Required', 'Please configure your Gemini API Key in Settings > Developer & AI Settings before using the AI Scanner.', [{ text: 'OK', style: 'default' }]);
            return;
        }

        showAlert(
            'Scan Receipt',
            'How would you like to attach your receipt?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Photo Gallery',
                    style: 'default',
                    onPress: async () => {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (permission.granted) launchPicker(false);
                        else showAlert('Permission Denied', 'Gallery access is required.', [{ text: 'OK', style: 'default' }]);
                    }
                },
                {
                    text: 'Camera',
                    style: 'default',
                    onPress: async () => {
                        const permission = await ImagePicker.requestCameraPermissionsAsync();
                        if (permission.granted) launchPicker(true);
                        else showAlert('Permission Denied', 'Camera access is required.', [{ text: 'OK', style: 'default' }]);
                    }
                }
            ]
        );
    };

    const handleCalculatorPress = (val: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (val === 'C') {
            setAmount('');
        } else if (val === '⌫') {
            setAmount(prev => prev.slice(0, -1));
        } else if (val === '=') {
            try {
                // Basic safe evaluation (only matching math expressions)
                if (/^[\d+\-*/.() ]+$/.test(amount)) {
                    // eslint-disable-next-line no-eval
                    let result = eval(amount);
                    if (!Number.isFinite(result) || Number.isNaN(result)) {
                        result = 0;
                    }
                    const formatted = Number(result).toFixed(2);
                    setAmount(formatted.endsWith('.00') ? String(Number(result)) : formatted);
                }
            } catch (e) {
                // Ignore invalid intermediate math
            }
            setShowCalculator(false);
        } else {
            setAmount(prev => prev + val);
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount)) || !selectedAccount) {
            showAlert('Invalid Input', 'Please enter a valid amount and select an account.', [{ text: 'OK', style: 'default' }]);
            return;
        }

        if (type === 'transfer' && (!toAccount || selectedAccount === toAccount)) {
            showAlert('Invalid Transfer', 'Please ensure you have selected two different accounts for the transfer.', [{ text: 'OK', style: 'default' }]);
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
                navigation.navigate('MainTabs', { screen: 'Home' });
            }
        } catch (error: any) {
            showAlert('Database Error', error.message || 'Failed to save transaction.', [{ text: 'OK', style: 'default' }]);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            showAlert('Missing Name', 'Please enter a name for the new category.', [{ text: 'OK', style: 'default' }]);
            return;
        }
        await addCategory(newCategoryName.trim(), 'pricetag-outline', newCategoryColor, type === 'transfer' ? 'expense' : type);
        setIsAddingCategory(false);
        setNewCategoryName('');
        setNewCategoryColor(colors.primary);
    };

    const handleLongPressCategory = (cat: any) => {
        if (cat.is_default === 1) {
            showAlert('System Category', 'Default categories cannot be deleted.', [{ text: 'OK', style: 'default' }]);
            return;
        }

        showAlert(
            'Delete Category',
            `Are you sure you want to delete "${cat.name}"? Transactions using this category will become uncategorized.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(cat.id);
                            if (selectedCategory === cat.id) {
                                setSelectedCategory(null);
                            }
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error: any) {
                            showAlert('Error', error.message || 'Failed to delete category.', [{ text: 'OK', style: 'default' }]);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background, paddingVertical: 20 }]}>
                <Text style={[styles.title, { color: colors.text }]}>New Transaction</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={handleScanReceipt} style={[styles.pinButton, { backgroundColor: colors.cardAlt }]}>
                        <Ionicons name="scan" size={20} color={readablePrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsPinned(!isPinned)} style={[styles.pinButton, isPinned && { backgroundColor: colors.cardAlt }]}>
                        <Ionicons name="pin" size={20} color={isPinned ? readablePrimary : colors.subText} />
                    </TouchableOpacity>
                </View>
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
                    <View style={styles.amountContainer}>
                        <TextInput
                            style={[styles.amountInput, { color: colors.text, borderBottomColor: colors.border }]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType={showCalculator ? "default" : "decimal-pad"}
                            placeholderTextColor={colors.subText}
                            placeholder="0.00"
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.calcToggle, { backgroundColor: showCalculator ? readablePrimary : colors.cardAlt, borderColor: colors.border }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowCalculator(!showCalculator);
                            }}
                        >
                            <Ionicons name="calculator" size={24} color={showCalculator ? getContrastColor(readablePrimary) : readablePrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Inline Calculator Overlay */}
                    {showCalculator && (
                        <View style={[styles.calculatorGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {[['C', '⌫', '(', ')'], ['7', '8', '9', '/'], ['4', '5', '6', '*'], ['1', '2', '3', '-'], ['0', '.', '=', '+']].map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.calculatorRow}>
                                    {row.map((btn, colIndex) => {
                                        const isEquals = btn === '=';

                                        return (
                                            <TouchableOpacity
                                                key={colIndex}
                                                style={[
                                                    styles.calcBtn,
                                                    { backgroundColor: colors.background, borderColor: colors.border },
                                                    ['/', '*', '-', '+', '(', ')'].includes(btn) && { backgroundColor: colors.cardAlt },
                                                    isEquals && { backgroundColor: readablePrimary }
                                                ]}
                                                onPress={() => handleCalculatorPress(btn)}
                                            >
                                                <View style={['C', '(', ')', '⌫'].includes(btn) ? { paddingTop: 2 } : { paddingBottom: 2 }}>
                                                    <Text style={[
                                                        styles.calcBtnText,
                                                        { color: colors.text },
                                                        isEquals && { color: getContrastColor(readablePrimary) },
                                                        ['C', '⌫'].includes(btn) && { color: colors.danger }
                                                    ]}>{btn}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            ))}
                        </View>
                    )}
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
                                    current={format(date, 'yyyy-MM-dd')}
                                    markedDates={{
                                        [format(new Date(), 'yyyy-MM-dd')]: { selected: true, selectedColor: readablePrimary, selectedTextColor: getContrastColor(readablePrimary) },
                                        [format(date, 'yyyy-MM-dd')]: { selected: true, selectedColor: readablePrimary, selectedTextColor: getContrastColor(readablePrimary) }
                                    }}
                                    onDayPress={(day: any) => {
                                        setDate(new Date(day.timestamp));
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
                </View>

                {/* Category Pick (Chips) */}
                {type !== 'transfer' && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>Category</Text>
                        <View style={styles.chipsRow}>
                            {categories.filter(c => c.type === type).map((cat) => {
                                const activeColor = getReadableColor(cat.color || colors.primary, isDarkMode);
                                return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selectedCategory === cat.id && { backgroundColor: activeColor, borderColor: activeColor }]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    onLongPress={() => handleLongPressCategory(cat)}
                                >
                                    <Ionicons name={cat.icon as any || 'ellipse'} size={16} color={selectedCategory === cat.id ? getContrastColor(activeColor) : colors.text} />
                                    <Text style={[styles.chipText, { color: colors.text }, selectedCategory === cat.id && { color: getContrastColor(activeColor) }]}>{cat.name}</Text>
                                </TouchableOpacity>
                                );
                            })}

                            {/* Add Custom Category Chip */}
                            <TouchableOpacity
                                style={[styles.chip, { backgroundColor: 'transparent', borderColor: colors.border, borderStyle: 'dashed' }]}
                                onPress={() => setIsAddingCategory(true)}
                            >
                                <Ionicons name="add" size={16} color={colors.subText} />
                                <Text style={[styles.chipText, { color: colors.subText }]}>Custom</Text>
                            </TouchableOpacity>
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
                                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selectedAccount === acc.id && { backgroundColor: readablePrimary, borderColor: readablePrimary }]}
                                onPress={() => setSelectedAccount(acc.id)}
                            >
                                <Text style={[styles.chipText, { color: colors.text }, selectedAccount === acc.id && { color: getContrastColor(readablePrimary) }]}>{acc.name}</Text>
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
                                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border, opacity: selectedAccount === acc.id ? 0.5 : 1 }, toAccount === acc.id && { backgroundColor: readablePrimary, borderColor: readablePrimary }]}
                                    onPress={() => setToAccount(acc.id)}
                                    disabled={selectedAccount === acc.id}
                                >
                                    <Text style={[styles.chipText, { color: selectedAccount === acc.id ? colors.subText : colors.text }, toAccount === acc.id && { color: getContrastColor(readablePrimary) }]}>{acc.name}</Text>
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
                <TouchableOpacity
                    style={[styles.actionBtn, styles.saveBtn, { backgroundColor: isAddingCategory ? colors.border : readablePrimary, shadowColor: isAddingCategory ? 'transparent' : readablePrimary }]}
                    onPress={handleSave}
                    disabled={isAddingCategory}
                >
                    <Text style={[styles.saveBtnText, !isAddingCategory && { color: getContrastColor(readablePrimary) }, isAddingCategory && { color: colors.subText }]}>
                        {isAddingCategory ? "Save Category First" : "Save Transaction"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* New Category Modal */}
            <Modal visible={isAddingCategory} transparent animationType="fade">
                <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>New Custom Category</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subText }]}>Category Name</Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                placeholder="e.g. Subscriptions"
                                placeholderTextColor={colors.subText}
                                autoFocus
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subText }]}>Category Color</Text>
                            <View style={styles.colorPalette}>
                                {PREDEFINED_COLORS.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: color },
                                            newCategoryColor === color && styles.colorCircleSelected
                                        ]}
                                        onPress={() => setNewCategoryColor(color)}
                                    >
                                        {newCategoryColor === color && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>Or Custom Hex Code</Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                value={newCategoryColor}
                                onChangeText={setNewCategoryColor}
                                placeholder="#HEX"
                                placeholderTextColor={colors.subText}
                                autoCapitalize="characters"
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.subText }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.saveBtn, { flex: 1.5, backgroundColor: readablePrimary, shadowColor: readablePrimary }]}
                                onPress={handleAddCategory}
                            >
                                <Text style={[styles.saveBtnText, { color: getContrastColor(readablePrimary) }]}>Save Category</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>
            {/* AI Analyzing Overlay */}
            {isAnalyzing && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                    <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 24, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 }}>
                        <Ionicons name="sparkles" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Gemini is reading...</Text>
                        <Text style={{ color: colors.subText, fontSize: 14, marginTop: 8 }}>Extracting amounts and categories</Text>
                    </View>
                </View>
            )}
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
    },
    calcToggle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginLeft: 16,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
    },
    calculatorGrid: {
        padding: 8,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 1,
        gap: 8,
    },
    calculatorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    calcBtn: {
        width: '22%',
        aspectRatio: 1.3,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    calcBtnText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        // Text naturally positioned by calcBtn's alignItems and justifyContent
    },
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
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    colorPalette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    colorCircleSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    }
});
