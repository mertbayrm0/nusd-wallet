import { useState, useEffect, useCallback } from 'react';
import {
    requestNotificationPermission,
    onForegroundMessage,
    getNotificationPermission,
    isNotificationsSupported,
    hasPushToken
} from '../services/firebase';

interface NotificationPayload {
    notification?: {
        title?: string;
        body?: string;
    };
    data?: Record<string, string>;
}

interface UseNotificationsReturn {
    permission: NotificationPermission | 'unsupported';
    isSupported: boolean;
    hasToken: boolean;
    isLoading: boolean;
    requestPermission: () => Promise<boolean>;
    lastNotification: NotificationPayload | null;
}

export const useNotifications = (): UseNotificationsReturn => {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isSupported, setIsSupported] = useState(false);
    const [hasToken, setHasToken] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);

    useEffect(() => {
        const init = async () => {
            const supported = isNotificationsSupported();
            setIsSupported(supported);

            if (supported) {
                setPermission(getNotificationPermission());
                const tokenExists = await hasPushToken();
                setHasToken(tokenExists);

                // Listen for foreground messages
                onForegroundMessage((payload) => {
                    console.log('Foreground message received:', payload);
                    setLastNotification(payload);

                    // Show toast notification
                    if (payload.notification?.title) {
                        showToast(payload.notification.title, payload.notification.body || '');
                    }
                });
            }

            setIsLoading(false);
        };

        init();
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const token = await requestNotificationPermission();
            const newPermission = getNotificationPermission();
            setPermission(newPermission);
            setHasToken(!!token);
            return !!token;
        } catch (error) {
            console.error('Error requesting permission:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        permission,
        isSupported,
        hasToken,
        isLoading,
        requestPermission,
        lastNotification
    };
};

// Simple toast notification for foreground messages
const showToast = (title: string, body: string) => {
    // Check if we already have a toast container
    let container = document.getElementById('notification-toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-toast-container';
        container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    max-width: 300px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
  `;

    toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 20px;">🔔</span>
      </div>
      <div style="flex: 1;">
        <p style="font-weight: bold; color: #111; margin: 0 0 4px 0; font-size: 14px;">${title}</p>
        <p style="color: #666; margin: 0; font-size: 13px;">${body}</p>
      </div>
    </div>
  `;

    container.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
};

// Add animation styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
    document.head.appendChild(style);
}
