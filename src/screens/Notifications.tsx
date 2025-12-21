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
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-white text-lg font-bold">Bildirimler</h1>
                <div className="w-10" />
            </div>

            {/* Mark all as read */}
            {unreadCount > 0 && (
                <div className="px-4 pb-4">
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
            <div className="flex-1 overflow-y-auto px-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 text-emerald-300">
                        <span className="material-symbols-outlined text-5xl mb-2">notifications_off</span>
                        <p>Henüz bildirim yok</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 rounded-2xl flex items-start gap-3 cursor-pointer transition-colors ${!notification.read ? 'bg-white shadow-lg' : 'bg-white/90 shadow'}`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!notification.read ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <span className="material-symbols-outlined">
                                        {getIcon(notification.type)}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold truncate ${!notification.read ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {notification.title}
                                        </h3>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {getTimeAgo(notification.created_at)}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <span className="material-symbols-outlined text-gray-400">
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
