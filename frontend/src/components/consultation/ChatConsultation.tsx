import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import type { Consultation, ConsultationMessage } from '../../services/consultationService';
import { io, Socket } from 'socket.io-client';

interface ChatConsultationProps {
  consultation: Consultation;
  onEnd?: () => void;
}

const ChatConsultation: React.FC<ChatConsultationProps> = ({ consultation, onEnd }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDoctor = user?.walletAddress?.toLowerCase() === consultation.doctorWallet.toLowerCase();
  const otherParty = isDoctor ? consultation.patient : consultation.doctor;
  const otherName = otherParty?.firstName || (isDoctor ? 'Patient' : 'Doctor');

  // Initialize socket connection
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3003', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🔌 Chat socket connected');
      socket.emit('identify', user?.walletAddress);
      socket.emit('join_chat', consultation.chatRoomId);
    });

    socket.on('consultation_message', (message: ConsultationMessage) => {
      if (message.consultationId === consultation.id) {
        setMessages(prev => [...prev, message]);
        // Mark as read if from other party
        if (message.senderWallet.toLowerCase() !== user?.walletAddress?.toLowerCase()) {
          consultationService.markMessagesRead(consultation.id, user?.walletAddress || '');
        }
      }
    });

    socket.on('typing_indicator', (data: { consultationId: string; isTyping: boolean }) => {
      if (data.consultationId === consultation.id) {
        setOtherTyping(data.isTyping);
      }
    });

    socket.on('messages_read', () => {
      // Could update UI to show read receipts
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [consultation.id, consultation.chatRoomId, user?.walletAddress]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await consultationService.getMessages(
          consultation.id,
          user?.walletAddress || ''
        );
        setMessages(response.data || []);
        // Mark as read
        await consultationService.markMessagesRead(consultation.id, user?.walletAddress || '');
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [consultation.id, user?.walletAddress]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update time remaining
  useEffect(() => {
    if (!consultation.expiresAt) return;

    const updateTime = () => {
      const now = new Date();
      const expires = new Date(consultation.expiresAt!);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [consultation.expiresAt]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      consultationService.sendTypingIndicator(consultation.id, user?.walletAddress || '', true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      consultationService.sendTypingIndicator(consultation.id, user?.walletAddress || '', false);
    }, 2000);
  }, [consultation.id, user?.walletAddress, isTyping]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await consultationService.sendMessage(consultation.id, {
        senderWallet: user?.walletAddress || '',
        content: newMessage.trim(),
        messageType: 'text'
      });
      setNewMessage('');
      setIsTyping(false);
      consultationService.sendTypingIndicator(consultation.id, user?.walletAddress || '', false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // End consultation
  const handleEnd = async () => {
    if (window.confirm('Are you sure you want to end this consultation?')) {
      try {
        await consultationService.endConsultation(consultation.id, {
          userWallet: user?.walletAddress || ''
        });
        onEnd?.();
      } catch (error) {
        console.error('Failed to end consultation:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg">💬</span>
          </div>
          <div>
            <h3 className="font-semibold">{otherName}</h3>
            <p className="text-sm text-blue-100">
              {otherTyping ? 'Typing...' : timeRemaining}
            </p>
          </div>
        </div>
        <button
          onClick={handleEnd}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
        >
          End Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMine 
                    ? 'bg-blue-600 text-white rounded-br-md' 
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                    {isMine && msg.isRead && ' ✓✓'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-2xl px-4 py-2 rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConsultation;
