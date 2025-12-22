import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useApp } from '../App';

interface Message {
    id: string;
    sender_type: 'user' | 'admin' | 'system';
    sender_name: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

interface Conversation {
    id: string;
    status: string;
    unread_count_user: number;
}

const LiveChat: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get auth user
    useEffect(() => {
        const getAuthUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setAuthUser({ id: user.id, email: user.email || '' });
            }
        };
        getAuthUser();
    }, []);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load or create conversation
    useEffect(() => {
        if (!authUser) return;

        const loadConversation = async () => {
            try {
                // Check for existing open conversation
                const { data: existingConv, error: findError } = await supabase
                    .from('support_conversations')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .in('status', ['open', 'waiting'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (existingConv) {
                    setConversation(existingConv);
                    await loadMessages(existingConv.id);
                    await markAsRead(existingConv.id);
                } else {
                    // Create new conversation
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('first_name, last_name')
                        .eq('id', authUser.id)
                        .single();

                    const userName = profile?.first_name
                        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                        : authUser.email?.split('@')[0] || 'User';

                    const { data: newConv, error: createError } = await supabase
                        .from('support_conversations')
                        .insert({
                            user_id: authUser.id,
                            user_name: userName,
                            user_email: authUser.email,
                            subject: 'Yeni Destek Talebi'
                        })
                        .select()
                        .single();

                    if (newConv) {
                        setConversation(newConv);
                        // Add welcome message
                        await supabase.from('support_messages').insert({
                            conversation_id: newConv.id,
                            sender_type: 'system',
                            sender_name: 'Sistem',
                            message: 'Merhaba! NUSD destek ekibine hoş geldiniz. Size nasıl yardımcı olabiliriz?'
                        });
                        await loadMessages(newConv.id);
                    }
                }
            } catch (error) {
                console.error('Conversation error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadConversation();
    }, [authUser]);

    // Load messages
    const loadMessages = async (convId: string) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
        }
    };

    // Mark messages as read
    const markAsRead = async (convId: string) => {
        await supabase.rpc('mark_messages_read', {
            p_conversation_id: convId,
            p_reader_type: 'user'
        });
    };

    // Subscribe to new messages
    useEffect(() => {
        if (!conversation?.id) return;

        const channel = supabase
            .channel(`support_messages:${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `conversation_id=eq.${conversation.id}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);

                    // Mark as read if from admin
                    if (newMsg.sender_type === 'admin') {
                        markAsRead(conversation.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversation?.id]);

    // Send message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !conversation?.id || isSending) return;

        setIsSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase.from('support_messages').insert({
                conversation_id: conversation.id,
                sender_type: 'user',
                sender_id: authUser?.id,
                sender_name: authUser?.email?.split('@')[0] || 'User',
                message: messageText
            });

            if (error) {
                console.error('Send error:', error);
                setNewMessage(messageText); // Restore message on error
            }
        } catch (error) {
            console.error('Send error:', error);
            setNewMessage(messageText);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Bugün';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Dün';
        } else {
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
        }
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = formatDate(message.created_at);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {} as Record<string, Message[]>);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex flex-col">
            {/* Header */}
            <div className="bg-emerald-700/50 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-white font-bold">Canlı Destek</h1>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-emerald-200 text-sm">Çevrimiçi</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">support_agent</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                            <span className="bg-white/20 text-white/70 text-xs px-3 py-1 rounded-full">
                                {date}
                            </span>
                        </div>

                        {/* Messages for this date */}
                        {msgs.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.sender_type === 'user'
                                        ? 'bg-white text-gray-800 rounded-br-md'
                                        : msg.sender_type === 'system'
                                            ? 'bg-emerald-500/30 text-white/90 rounded-bl-md'
                                            : 'bg-emerald-500/50 text-white rounded-bl-md'
                                        }`}
                                >
                                    {msg.sender_type !== 'user' && (
                                        <p className="text-xs font-medium text-emerald-200 mb-1">
                                            {msg.sender_type === 'system' ? '🤖 Sistem' : '👤 Destek'}
                                        </p>
                                    )}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                    <div className={`flex items-center gap-1 mt-1 ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'
                                        }`}>
                                        <span className={`text-xs ${msg.sender_type === 'user' ? 'text-gray-400' : 'text-white/50'
                                            }`}>
                                            {formatTime(msg.created_at)}
                                        </span>
                                        {msg.sender_type === 'user' && (
                                            <span className="material-symbols-outlined text-xs text-emerald-500">
                                                {msg.is_read ? 'done_all' : 'done'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-emerald-700/50 backdrop-blur-sm border-t border-white/10 p-3">
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full flex items-center px-4">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Mesajınızı yazın..."
                            className="flex-1 bg-transparent text-white placeholder-white/50 py-3 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${newMessage.trim() && !isSending
                            ? 'bg-white text-emerald-600 shadow-lg active:scale-95'
                            : 'bg-white/20 text-white/50'
                            }`}
                    >
                        <span className="material-symbols-outlined">
                            {isSending ? 'hourglass_empty' : 'send'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
