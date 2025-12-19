import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { NOTIFICATION_TEMPLATES, NotificationType } from '../types/notifications';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    data: any;
    read: boolean;
    created_at: string;
}

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await api.getNotificationHistory();
        setNotifications(data);
        setLoading(false);
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Okundu işaretle
        if (!notification.read) {
            await api.markNotificationAsRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
            );
        }

        // İlgili sayfaya yönlendir
        if (notification.type.startsWith('p2p_')) {
            navigate('/dashboard');
        } else if (notification.type === 'balance_received' || notification.type === 'balance_sent') {
            navigate('/dashboard');
        }
    };

    const handleMarkAllAsRead = async () => {
        await api.markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const getIcon = (type: NotificationType) => {
        const template = NOTIFICATION_TEMPLATES[type];
        return template?.icon || 'notifications';
    };

    const getTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dakika önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return date.toLocaleDateString('tr-TR');
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <button onClick={() => navigate(-1)} className="text-white">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-white text-lg font-bold">Bildirimler</h1>
                <div className="w-8" />
            </div>

            {/* Mark all as read */}
            {unreadCount > 0 && (
                <div className="p-4 border-b border-gray-800">
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-lime-400 text-sm flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        Tümünü okundu işaretle ({unreadCount})
                    </button>
                </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 text-gray-500">
                        <span className="material-symbols-outlined text-5xl mb-2">notifications_off</span>
                        <p>Henüz bildirim yok</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors ${!notification.read ? 'bg-lime-500/5' : ''
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-lime-500/20' : 'bg-gray-800'
                                    }`}>
                                    <span className={`material-symbols-outlined ${!notification.read ? 'text-lime-400' : 'text-gray-400'
                                        }`}>
                                        {getIcon(notification.type)}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-medium truncate ${!notification.read ? 'text-white' : 'text-gray-400'
                                            }`}>
                                            {notification.title}
                                        </h3>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-lime-400 rounded-full flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {getTimeAgo(notification.created_at)}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <span className="material-symbols-outlined text-gray-600">
                                    chevron_right
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
