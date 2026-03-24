import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

export async function scheduleSubscriptionReminder(
    subscriptionName: string,
    amount: number,
    reminderDays: number,
    nextBillingDateIso: string
) {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const billingDate = new Date(nextBillingDateIso);
    const reminderDate = new Date(billingDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);
    reminderDate.setHours(9, 0, 0, 0); // 9:00 AM

    // Only schedule if reminder is in the future
    if (reminderDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Subscription Reminder 🗓',
                body: `Your ${subscriptionName} subscription for $${amount.toFixed(2)} is due in ${reminderDays} days.`,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
    }
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
