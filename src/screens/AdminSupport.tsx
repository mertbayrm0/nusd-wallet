import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface Conversation {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    status: 'open' | 'waiting' | 'resolved' | 'closed';
    priority: string;
    subject: string;
    last_message_at: string;
    unread_count_admin: number;
    created_at: string;
}

interface Message {
    id: string;
    sender_type: 'user' | 'admin' | 'system';
    sender_name: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

const AdminSupport: React.FC = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open' | 'waiting' | 'resolved'>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversations
    useEffect(() => {
        loadConversations();

        // Subscribe to new conversations
        const channel = supabase
            .channel('support_conversations_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_conversations' },
                () => loadConversations()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadConversations = async () => {
        const { data, error } = await supabase
            .from('support_conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (data) {
            setConversations(data);
        }
        setIsLoading(false);
    };

    // Load messages when conversation selected
    useEffect(() => {
        if (!selectedConv) return;

        loadMessages(selectedConv.id);
        markAsRead(selectedConv.id);

        // Subscribe to new messages
        const channel = supabase
            .channel(`admin_messages:${selectedConv.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `conversation_id=eq.${selectedConv.id}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);
                    if (newMsg.sender_type === 'user') {
                        markAsRead(selectedConv.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConv?.id]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async (convId: string) => {
        const { data } = await supabase
            .from('support_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data);
    };

    const markAsRead = async (convId: string) => {
        await supabase.rpc('mark_messages_read', {
            p_conversation_id: convId,
            p_reader_type: 'admin'
        });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConv || isSending) return;

        setIsSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('support_messages').insert({
            conversation_id: selectedConv.id,
            sender_type: 'admin',
            sender_id: user?.id,
            sender_name: 'Destek Ekibi',
            message: messageText
        });

        if (error) {
            console.error('Send error:', error);
            setNewMessage(messageText);
        }

        setIsSending(false);
    };

    const updateStatus = async (status: string) => {
        if (!selectedConv) return;

        await supabase
            .from('support_conversations')
            .update({ status })
            .eq('id', selectedConv.id);

        setSelectedConv({ ...selectedConv, status: status as any });
        loadConversations();
    };

    const filteredConversations = conversations.filter(c =>
        filter === 'all' || c.status === filter
    );

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Şimdi';
        if (diffMins < 60) return `${diffMins}dk`;
        if (diffHours < 24) return `${diffHours}sa`;
        return `${diffDays}g`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return { bg: 'bg-red-500', text: 'Açık' };
            case 'waiting': return { bg: 'bg-yellow-500', text: 'Bekliyor' };
            case 'resolved': return { bg: 'bg-green-500', text: 'Çözüldü' };
            case 'closed': return { bg: 'bg-gray-500', text: 'Kapalı' };
            default: return { bg: 'bg-gray-500', text: status };
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Canlı Destek</h1>
                        <p className="text-sm text-gray-400">{conversations.length} konuşma</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['all', 'open', 'waiting', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {f === 'all' ? 'Tümü' : getStatusBadge(f).text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversations List */}
                <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">chat</span>
                            <p>Henüz konuşma yok</p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConv(conv)}
                                className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${selectedConv?.id === conv.id
                                        ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                                        : 'hover:bg-gray-700/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {conv.user_name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">{conv.user_name}</p>
                                            <p className="text-gray-500 text-xs">{conv.user_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {conv.unread_count_admin > 0 && (
                                            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {conv.unread_count_admin}
                                            </span>
                                        )}
                                        <span className="text-gray-500 text-xs">{formatTime(conv.last_message_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`w-2 h-2 rounded-full ${getStatusBadge(conv.status).bg}`}></span>
                                    <span className="text-gray-400 text-xs">{getStatusBadge(conv.status).text}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-900">
                    {selectedConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <span className="text-white font-medium">
                                            {selectedConv.user_name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{selectedConv.user_name}</p>
                                        <p className="text-gray-400 text-sm">{selectedConv.user_email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateStatus('resolved')}
                                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                                    >
                                        ✓ Çözüldü
                                    </button>
                                    <button
                                        onClick={() => updateStatus('closed')}
                                        className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-lg text-sm hover:bg-gray-500/30 transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.sender_type === 'admin'
                                                    ? 'bg-emerald-500 text-white rounded-br-md'
                                                    : msg.sender_type === 'system'
                                                        ? 'bg-gray-700 text-gray-300 rounded-bl-md'
                                                        : 'bg-gray-700 text-white rounded-bl-md'
                                                }`}
                                        >
                                            {msg.sender_type === 'user' && (
                                                <p className="text-emerald-400 text-xs font-medium mb-1">
                                                    {msg.sender_name}
                                                </p>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-emerald-200' : 'text-gray-500'
                                                }`}>
                                                {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-gray-800 border-t border-gray-700 p-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Mesaj yaz..."
                                        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || isSending}
                                        className={`p-3 rounded-lg transition-all ${newMessage.trim() && !isSending
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                : 'bg-gray-700 text-gray-500'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl mb-4">forum</span>
                                <p className="text-lg">Bir konuşma seçin</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupport;
