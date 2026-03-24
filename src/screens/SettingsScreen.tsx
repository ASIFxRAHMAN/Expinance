import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { getColors, getReadableColor, getContrastColor } from '../theme/colors';
import PinOverlay from '../components/PinOverlay';

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { 
        transactions, 
        accounts, 
        categories, 
        isDarkMode, 
        themeColor, 
        isPrivacyEnabled, 
        setPrivacyEnabled,
        privacyRevealDuration,
        setPrivacyRevealDuration,
        appLockType, 
        setAppLockType,
        securityPin,
        setSecurityPin,
        geminiApiKey,
        setGeminiApiKey
    } = useAppStore();

    const [isEnteringOldPin, setIsEnteringOldPin] = useState(false);
    const [isSettingNewPin, setIsSettingNewPin] = useState(false);
    const [isConfirmingNewPin, setIsConfirmingNewPin] = useState(false);
    const [tempPin, setTempPin] = useState('');
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [isGeminiModalVisible, setGeminiModalVisible] = useState(false);
    const [tempGeminiKey, setTempGeminiKey] = useState('');

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setHasBiometrics(compatible && enrolled);
        })();
    }, []);

    const togglePrivacyMode = (value: boolean) => {
        setPrivacyEnabled(value);
    };

    const adjustDuration = (delta: number) => {
        let newVal = privacyRevealDuration + delta;
        if (newVal < 1) newVal = 1;
        if (newVal > 60) newVal = 60;
        setPrivacyRevealDuration(newVal);
    };

    const exportCSV = async () => {
        try {
            if (transactions.length === 0) {
                Alert.alert('No Data', 'There are no transactions to export.');
                return;
            }

            const header = 'Date,Type,Category,Amount,Account,Note\n';
            const rows = transactions.map(tx => {
                const catName = categories.find(c => c.id === tx.category_id)?.name || 'Transfer';
                const accName = accounts.find(a => a.id === tx.account_id)?.name || 'Unknown';
                return `${tx.date},${tx.type},${catName},${tx.amount},${accName},"${tx.note || ''}"`;
            }).join('\n');

            const csvString = header + rows;
            const file = new FileSystem.File(FileSystem.Paths.document, 'expinance_export.csv');
            file.create({ overwrite: true });
            file.write(csvString, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
            }
        } catch (error) {
            Alert.alert('Export Failed', 'An error occurred while creating CSV.');
        }
    };

    const exportJSON = async () => {
        try {
            const backupData = {
                accounts,
                categories,
                transactions,
                version: 1,
                exported_at: new Date().toISOString()
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const file = new FileSystem.File(FileSystem.Paths.document, 'expinance_backup.json');
            file.create({ overwrite: true });
            file.write(jsonString, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export JSON Backup' });
            }
        } catch (error) {
            Alert.alert('Export Failed', 'An error occurred while creating JSON backup.');
        }
    };

    const colors = getColors(isDarkMode, themeColor);
    const contrastColor = getContrastColor(colors.primary);
    const readablePrimary = getReadableColor(colors.primary, isDarkMode);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Local Vault Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <View style={styles.vaultHeader}>
                        <Ionicons name="shield-checkmark" size={32} color={colors.success} />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={[styles.vaultTitle, { color: colors.text }]}>Local Vault</Text>
                            <Text style={[styles.vaultSubText, { color: colors.subText }]}>100% Offline • Zero Tracking</Text>
                        </View>
                    </View>
                    <View style={styles.syncRow}>
                        <Ionicons name="cloud-offline" size={16} color={colors.subText} />
                        <Text style={[styles.syncText, { color: colors.subText }]}>Last Saved: Just Now (SQLite)</Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: readablePrimary }]}>Appearance</Text>
                    <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Appearance')}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="color-palette-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>App Appearance</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: readablePrimary }]}>Security & Privacy</Text>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="eye-off-outline" size={24} color={readablePrimary} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>Privacy Mode</Text>
                                <Text style={[styles.subText, { color: colors.subText }]}>Hide sensitive values (***)</Text>
                            </View>
                        </View>
                        <Switch
                            value={isPrivacyEnabled}
                            onValueChange={togglePrivacyMode}
                            trackColor={{ true: readablePrimary, false: colors.border }}
                        />
                    </View>

                    {isPrivacyEnabled && (
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="timer-outline" size={24} color={readablePrimary} />
                                <View>
                                    <Text style={[styles.rowText, { color: colors.text }]}>Reveal Duration</Text>
                                    <Text style={[styles.subText, { color: colors.subText }]}>How long numbers stay visible</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, padding: 4 }}>
                                <TouchableOpacity onPress={() => adjustDuration(-1)} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                                    <Ionicons name="remove" size={16} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={{ width: 40, textAlign: 'center', fontWeight: 'bold', color: colors.text }}>{privacyRevealDuration}s</Text>
                                <TouchableOpacity onPress={() => adjustDuration(1)} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                                    <Ionicons name="add" size={16} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="lock-closed-outline" size={24} color={readablePrimary} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>App Lock (PIN)</Text>
                                <Text style={[styles.subText, { color: colors.subText }]}>Require PIN on startup</Text>
                            </View>
                        </View>
                        <Switch
                            value={appLockType === 'pin'}
                            onValueChange={(val) => setAppLockType(val ? 'pin' : 'none')}
                            trackColor={{ true: readablePrimary, false: colors.border }}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="finger-print" size={24} color={readablePrimary} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>App Lock (Biometrics)</Text>
                                <Text style={[styles.subText, { color: colors.subText }]}>Require Fingerprint/Face ID</Text>
                            </View>
                        </View>
                        <Switch
                            value={appLockType === 'biometric'}
                            onValueChange={(val) => {
                                if (val) {
                                    if (hasBiometrics) {
                                        setAppLockType('biometric');
                                    } else {
                                        Alert.alert('Unavailable', 'Biometrics not enrolled on device.');
                                    }
                                } else {
                                    setAppLockType('none');
                                }
                            }}
                            trackColor={{ true: readablePrimary, false: colors.border }}
                        />
                    </View>

                    <TouchableOpacity style={styles.actionRow} onPress={() => setIsEnteringOldPin(true)}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="keypad-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Change PIN</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: readablePrimary }]}>Data Management</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={exportCSV}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="document-text-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Export to CSV</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={exportJSON}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="cloud-download-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Backup JSON</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Restore', 'Import functionality to be implemented')}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="cloud-upload-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Restore from JSON</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: readablePrimary }]}>Developer & AI Settings</Text>

                    <View style={styles.row}>
                        <View style={[styles.rowLeft, { flex: 1 }]}>
                            <Ionicons name="sparkles" size={24} color={readablePrimary} />
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.rowText, { color: colors.text }]}>Gemini Base64 Vision</Text>
                                <Text style={[styles.subText, { color: colors.subText }]}>{geminiApiKey ? 'API Key Configured • Ready' : 'Personal API Key Required'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={() => { setTempGeminiKey(geminiApiKey || ''); setGeminiModalVisible(true); }}>
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }}>{geminiApiKey ? 'G-***' : 'Set Key'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 32 }}>
                    <Text style={{ color: colors.subText, fontSize: 12, fontWeight: '300' }}>Expinance Redesign v2.0 • The Frictionless Flow</Text>
                </View>
            </ScrollView>

            {/* AI Developer Modal Sequences */}
            <Modal visible={isGeminiModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Gemini Flash API Key</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
                            Expinance is completely offline. To enable Receipt AI, punch in a free Google Studio key. This never leaves your device's SQLite store.
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="AIzaSy..."
                            placeholderTextColor={colors.subText}
                            value={tempGeminiKey}
                            onChangeText={setTempGeminiKey}
                            autoCapitalize="none"
                            secureTextEntry
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={() => setGeminiModalVisible(false)}>
                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                                onPress={() => {
                                    setGeminiApiKey(tempGeminiKey.trim() || null);
                                    setGeminiModalVisible(false);
                                }}
                            >
                                <Text style={{ color: contrastColor, fontWeight: 'bold' }}>Save Key</Text>
                            </TouchableOpacity>
                        </View>
                        {geminiApiKey && (
                            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => { setGeminiApiKey(null); setGeminiModalVisible(false); }}>
                                <Text style={{ color: colors.danger, fontWeight: 'bold' }}>Delete Key From Device</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal Sequences for Resetting PIN */}
            <PinOverlay
                isVisible={isEnteringOldPin}
                title="Verify Current PIN"
                subtitle="Enter your current PIN to continue."
                isDarkMode={isDarkMode}
                themeColor={themeColor}
                onSuccess={(pin) => {
                    if (pin === securityPin) {
                        setIsEnteringOldPin(false);
                        setIsSettingNewPin(true);
                    } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                }}
                onCancel={() => setIsEnteringOldPin(false)}
            />

            <PinOverlay
                isVisible={isSettingNewPin}
                title="Create New PIN"
                subtitle="Enter your new 6-digit security PIN."
                isDarkMode={isDarkMode}
                themeColor={themeColor}
                onSuccess={(pin) => {
                    setTempPin(pin);
                    setIsSettingNewPin(false);
                    setIsConfirmingNewPin(true);
                }}
                onCancel={() => {
                    setIsSettingNewPin(false);
                    setTempPin('');
                }}
            />

            <PinOverlay
                isVisible={isConfirmingNewPin}
                title="Confirm New PIN"
                subtitle="Please re-enter your new PIN."
                isDarkMode={isDarkMode}
                themeColor={themeColor}
                onSuccess={(pin) => {
                    if (pin === tempPin) {
                        setSecurityPin(pin);
                        setIsConfirmingNewPin(false);
                        Alert.alert("Success", "Your security PIN has been updated.");
                    } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        setIsConfirmingNewPin(false);
                        setIsSettingNewPin(true);
                        setTempPin('');
                    }
                }}
                onCancel={() => {
                    setIsConfirmingNewPin(false);
                    setTempPin('');
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    section: {
        marginTop: 24,
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900', // Heavy scaling
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    vaultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    vaultTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    vaultSubText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 2,
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
    },
    syncText: {
        fontSize: 12,
        fontWeight: '300',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    rowText: { fontSize: 16, fontWeight: 'bold' },
    subText: { fontSize: 12, marginTop: 2, fontWeight: '300' },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    actionText: { fontSize: 16, fontWeight: 'bold' },
    miniBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
    modalSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, fontWeight: '300', lineHeight: 20 },
    modalInput: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24, fontWeight: '700' },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }
});
