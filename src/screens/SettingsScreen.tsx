import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppStore } from '../store/useAppStore';
import { getDB } from '../database/db';
import { getColors } from '../theme/colors';

export default function SettingsScreen() {
    const { transactions, accounts, categories, isDarkMode, setDarkMode } = useAppStore();

    const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
    const [hasBiometrics, setHasBiometrics] = useState(false);

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setHasBiometrics(compatible && enrolled);

            try {
                const db = await getDB();
                const lockSetting = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'app_lock'");
                if (lockSetting && lockSetting.value === 'true') {
                    setIsAppLockEnabled(true);
                }
            } catch (e) {
                // Settings table might be missing the key, default to false
                console.log('App Lock setting not found or uninitialized');
            }
        })();
    }, []);

    const toggleAppLock = async (value: boolean) => {
        if (value && hasBiometrics) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable App Lock',
            });
            if (!result.success) return;
        } else if (value && !hasBiometrics) {
            Alert.alert('Unavailable', 'Device does not support biometric auth or none is enrolled.');
            return;
        }

        setIsAppLockEnabled(value);
        const db = await getDB();
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['app_lock', value ? 'true' : 'false']);
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

    const colors = getColors(isDarkMode);

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
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Preferences</Text>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="finger-print" size={24} color={colors.primary} />
                            <View>
                                <Text style={[styles.rowText, { color: colors.text }]}>Biometric App Lock</Text>
                                <Text style={[styles.subText, { color: colors.subText }]}>Require fingerprint/face on open</Text>
                            </View>
                        </View>
                        <Switch
                            value={isAppLockEnabled}
                            onValueChange={toggleAppLock}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            disabled={!hasBiometrics}
                        />
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Data Management</Text>

                    <TouchableOpacity style={[styles.actionRow, { borderBottomColor: colors.border }]} onPress={exportCSV}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="document-text-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Export to CSV</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionRow, { borderBottomColor: colors.border }]} onPress={exportJSON}>
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

                <View style={{ alignItems: 'center', marginVertical: 32 }}>
                    <Text style={{ color: colors.subText, fontSize: 12, fontWeight: '300' }}>Expinance Redesign v2.0 • The Frictionless Flow</Text>
                </View>
            </ScrollView>
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
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#333', // Subtle separator
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
        borderBottomWidth: StyleSheet.hairlineWidth,
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
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionText: { fontSize: 16, fontWeight: 'bold' }
});
