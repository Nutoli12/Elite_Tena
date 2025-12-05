import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Paperclip, Check, CheckCheck } from 'lucide-react';
import axios from '../../lib/axios';

interface Message {
    id: string;
    senderWallet: string;
    content: string;
    type: 'text' | 'image' | 'file';
    createdAt: string;
    read: boolean;
}

interface ChatWindowProps {
    appointmentId: string;
    otherUserWallet: string;
    otherUserName: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
    appointmentId,
    otherUserWallet,
    otherUserName
}) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchHistory();

        if (socket) {
            socket.emit('join_chat', appointmentId);

            socket.on('receive_message', (message: Message) => {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            });
        }

        return () => {
            if (socket) {
                socket.off('receive_message');
            }
        };
    }, [appointmentId, socket]);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`/chat/${appointmentId}`);
            if (response.data.success) {
                setMessages(response.data.data);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !user) return;

        const messageData = {
            appointmentId,
            senderWallet: user.walletAddress,
            receiverWallet: otherUserWallet,
            content: newMessage,
            type: 'text'
        };

        socket.emit('send_message', messageData);
        setNewMessage('');
    };

    const isMyMessage = (senderWallet: string) => {
        return senderWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">{otherUserName}</h3>
                    <p className="text-xs text-gray-500">Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-medical-600"></div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id || Math.random().toString()}
                            className={`flex ${isMyMessage(msg.senderWallet) ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMyMessage(msg.senderWallet)
                                        ? 'bg-medical-600 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                    }`}
                            >
                                <p className="text-sm">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMyMessage(msg.senderWallet) ? 'text-medical-200' : 'text-gray-500'
                                    }`}>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMyMessage(msg.senderWallet) && (
                                        msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-medical-600 text-white rounded-full hover:bg-medical-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};
