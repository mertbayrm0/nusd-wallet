import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { supabase } from './supabase';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJaPbNCAJogBZ-bFts865P553o0urEqVA",
    authDomain: "nubit-a690c.firebaseapp.com",
    projectId: "nubit-a690c",
    storageBucket: "nubit-a690c.firebasestorage.app",
    messagingSenderId: "38156040204",
    appId: "1:38156040204:web:8a700adf63c952b13f5629",
    measurementId: "G-NYWFHBE00W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Messaging instance (only available in browser with service worker support)
let messaging: Messaging | null = null;

// Check if notifications are supported
export const isNotificationsSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator;
};

// Initialize messaging
const initMessaging = async () => {
    if (!isNotificationsSupported()) {
        console.log('Push notifications not supported');
        return null;
    }

    try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        messaging = getMessaging(app);
        return messaging;
    } catch (error) {
        console.error('Failed to initialize messaging:', error);
        return null;
    }
};

// Request notification permission and get token
export const requestNotificationPermission = async (): Promise<string | null> => {
    if (!isNotificationsSupported()) {
        console.log('Notifications not supported');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        if (!messaging) {
            await initMessaging();
        }

        if (!messaging) return null;

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: 'BLBz6PiZXoxE7yFYF9HS_Xz3Ly6QqXrCOv7x3CQ4vOE_wMgWsLfGMqMgCf3LPHLzRCQfkNKi8kBWOSv8nZMJ1Jw' // You need to generate this in Firebase Console
        });

        if (token) {
            console.log('FCM Token:', token);
            await saveTokenToDatabase(token);
            return token;
        }

        return null;
    } catch (error) {
        console.error('Error getting notification permission:', error);
        return null;
    }
};

// Save token to Supabase
const saveTokenToDatabase = async (token: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if token already exists
        const { data: existing } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('user_id', user.id)
            .eq('token', token)
            .single();

        if (!existing) {
            await supabase
                .from('push_tokens')
                .insert({
                    user_id: user.id,
                    token,
                    platform: 'web'
                });
        }
    } catch (error) {
        console.error('Error saving push token:', error);
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
    if (!messaging) {
        initMessaging().then(() => {
            if (messaging) {
                onMessage(messaging, callback);
            }
        });
    } else {
        onMessage(messaging, callback);
    }
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
    if (!isNotificationsSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
};

// Check if user has push token saved
export const hasPushToken = async (): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        return (data?.length || 0) > 0;
    } catch (error) {
        return false;
    }
};

// Remove push token (when user logs out)
export const removePushToken = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', user.id);
    } catch (error) {
        console.error('Error removing push token:', error);
    }
};

export { app };
