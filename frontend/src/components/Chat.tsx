import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Image, File, X, Check, CheckCheck, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/axios';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { ipfsService } from '../services/ipfs';

interface Message {
  id: string;
  senderWallet: string;
  receiverWallet: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';
  read: boolean;
  readAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  createdAt: string;
  sender?: {
    walletAddress: string;
    profileData?: { fullName?: string };
    role?: string;
  };
}

interface ChatProps {
  appointmentId?: string;
  otherUserWallet: string;
  otherUserName: string;
}

export const Chat: React.FC<ChatProps> = ({ appointmentId, otherUserWallet, otherUserName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize socket and load messages
  useEffect(() => {
    if (!user?.walletAddress) return;

    // Connect to socket
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3003', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Identify user
    socket.emit('identify', user.walletAddress);

    // Join appointment room if applicable
    if (appointmentId) {
      socket.emit('join_chat', appointmentId);
    }

    // Listen for new messages
    socket.on('receive_message', (message: Message) => {
      console.log('💬 New message received:', message);
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for typing indicators
    socket.on('user_typing', (data: { senderWallet: string }) => {
      if (data.senderWallet.toLowerCase() === otherUserWallet.toLowerCase()) {
        setIsTyping(true);
      }
    });

    socket.on('user_stopped_typing', (data: { senderWallet: string }) => {
      if (data.senderWallet.toLowerCase() === otherUserWallet.toLowerCase()) {
        setIsTyping(false);
      }
    });

    // Listen for read receipts
    socket.on('message_read', (data: { messageId: string; readAt: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, read: true, readAt: data.readAt } : msg
        )
      );
    });

    // Load initial messages
    loadMessages();

    return () => {
      socket.disconnect();
    };
  }, [user?.walletAddress, appointmentId, otherUserWallet]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const endpoint = appointmentId
        ? `/chat/appointment/${appointmentId}`
        : `/chat/direct/${user?.walletAddress}/${otherUserWallet}`;

      console.log('💬 Loading messages from:', endpoint);
      console.log('💬 User wallet:', user?.walletAddress);
      console.log('💬 Other wallet:', otherUserWallet);

      const response = await axios.get(endpoint);

      console.log('💬 Messages response:', response.data);

      if (response.data.success) {
        setMessages(response.data.data);
        console.log('✅ Loaded', response.data.data.length, 'messages');
        
        // Mark messages as read
        markMessagesAsRead();
      }
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await axios.put(`/chat/read-all/${user?.walletAddress}`, {
        otherUserId: otherUserWallet,
        appointmentId
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      console.log('📤 Sending message:', {
        senderWallet: user?.walletAddress,
        receiverWallet: otherUserWallet,
        content: input
      });

      const response = await axios.post('/chat/send', {
        senderWallet: user?.walletAddress,
        receiverWallet: otherUserWallet,
        appointmentId,
        content: input,
        type: 'text'
      });

      console.log('📤 Send response:', response.data);

      if (response.data.success) {
        setInput('');
        stopTyping();
        console.log('✅ Message sent successfully');
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || uploading) return;

    setUploading(true);
    try {
      console.log('📤 Uploading file to IPFS...');

      // Upload to IPFS
      const uploadResult = await ipfsService.uploadFile(file, {
        name: `chat-${Date.now()}-${file.name}`,
        keyvalues: {
          type: 'chat-attachment',
          senderWallet: user?.walletAddress || '',
          receiverWallet: otherUserWallet,
          appointmentId: appointmentId || ''
        }
      });

      if (!uploadResult.success) {
        throw new Error('IPFS upload failed');
      }

      // Determine message type based on file
      let messageType: 'image' | 'file' | 'video' | 'audio' = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';

      // Send message with file
      const response = await axios.post('/chat/send', {
        senderWallet: user?.walletAddress,
        receiverWallet: otherUserWallet,
        appointmentId,
        content: file.name,
        type: messageType,
        fileUrl: uploadResult.ipfsUrl,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type
      });

      if (response.data.success) {
        console.log('✅ File message sent');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = () => {
    if (!socketRef.current) return;

    // Emit typing start
    socketRef.current.emit('typing_start', {
      senderWallet: user?.walletAddress,
      receiverWallet: otherUserWallet,
      appointmentId
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const stopTyping = () => {
    if (!socketRef.current) return;

    socketRef.current.emit('typing_stop', {
      senderWallet: user?.walletAddress,
      receiverWallet: otherUserWallet,
      appointmentId
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    const isSent = message.senderWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
    const senderName = message.sender?.profileData?.fullName || 'Unknown';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
          {!isSent && (
            <span className="text-xs text-gray-500 mb-1 px-2">{senderName}</span>
          )}
          
          <div
            className={`rounded-2xl px-4 py-2 ${
              isSent
                ? 'bg-medical-500 text-white rounded-br-none'
                : 'bg-gray-200 text-gray-900 rounded-bl-none'
            }`}
          >
            {message.type === 'text' && <p className="whitespace-pre-wrap">{message.content}</p>}
            
            {message.type === 'image' && message.fileUrl && (
              <div>
                <img
                  src={message.fileUrl}
                  alt={message.fileName}
                  className="max-w-full rounded-lg mb-2"
                />
                <p className="text-sm opacity-75">{message.fileName}</p>
              </div>
            )}
            
            {(message.type === 'file' || message.type === 'video' || message.type === 'audio') && message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <File className="w-4 h-4" />
                <span>{message.fileName}</span>
                {message.fileSize && (
                  <span className="text-xs opacity-75">
                    ({(message.fileSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </a>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 px-2">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {isSent && (
              <span className="text-xs">
                {message.read ? (
                  <CheckCheck className="w-3 h-3 text-blue-500" title="Read" />
                ) : (
                  <Check className="w-3 h-3 text-gray-400" title="Sent" />
                )}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{otherUserName}</h3>
          {isTyping && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-medical-600"
            >
              typing...
            </motion.p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-medical-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm text-center">
              Start the conversation with {otherUserName}!<br />
              Type your message below and press Enter to send.
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-gray-600 hover:text-medical-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Attach file"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-none"
            disabled={sending}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="p-2 bg-medical-500 text-white rounded-lg hover:bg-medical-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
