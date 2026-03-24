import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy evaluate Notifications to prevent early crash in Expo Go SDK 53+
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.warn('Failed to load expo-notifications', e);
    }
}

// Configure notification behavior ONLY if we successfully loaded the module
if (Notifications && !isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export async function requestNotificationPermissions() {
    if (isExpoGo || !Notifications) {
        console.log('Push notifications are not supported in Expo Go SDK 53+ without a dev client.');
        return false;
    }

    if (!Platform.isTV && Platform.OS !== 'web') {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            return finalStatus === 'granted';
        } catch (error) {
            console.log('Push notifications are not supported safely on this device.', error);
            return false;
        }
    }
    return false;
}

export async function scheduleSubscriptionReminder(
    subscriptionId: number,
    subscriptionName: string,
    amount: number,
    reminderDays: number,
    nextBillingDateIso: string
) {
    if (!Notifications) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const billingDate = new Date(nextBillingDateIso);
    const reminderDate = new Date(billingDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);
    reminderDate.setHours(9, 0, 0, 0); // 9:00 AM

    // Cancel existing reminder for this subscription if it exists
    await cancelSubscriptionReminder(subscriptionId);

    // Only schedule if reminder is in the future and reminderDays > 0
    if (reminderDays > 0 && reminderDate > new Date()) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Subscription Reminder 🗓',
                    body: `Your ${subscriptionName} subscription for $${amount.toFixed(2)} is due in ${reminderDays} day(s).`,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: reminderDate,
                },
                identifier: `sub_${subscriptionId}`,
            });
        } catch (error) {
            console.log('Failed to schedule notification. Expo Go SDK 53+ does not support this without a dev client.', error);
        }
    }
}

export async function cancelSubscriptionReminder(subscriptionId: number) {
    if (!Notifications) return;
    try {
        await Notifications.cancelScheduledNotificationAsync(`sub_${subscriptionId}`);
    } catch (error) {
        console.log('Cancel skipped (Expo Go limit)');
    }
}

export async function cancelAllNotifications() {
    if (!Notifications) return;
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Cancel all skipped (Expo Go limit)');
    }
}
