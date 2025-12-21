// Firebase Cloud Messaging Service Worker
// This file must be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBJaPbNCAJogBZ-bFts865P553o0urEqVA",
    authDomain: "nubit-a690c.firebaseapp.com",
    projectId: "nubit-a690c",
    storageBucket: "nubit-a690c.firebasestorage.app",
    messagingSenderId: "38156040204",
    appId: "1:38156040204:web:8a700adf63c952b13f5629"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'NUSD Wallet';
    const notificationOptions = {
        body: payload.notification?.body || 'Yeni bir bildiriminiz var',
        icon: '/nusd-icon.png',
        badge: '/nusd-badge.png',
        tag: payload.data?.tag || 'default',
        data: payload.data,
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open', title: 'Aç' },
            { action: 'dismiss', title: 'Kapat' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
