import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  File, 
  Check, 
  CheckCheck, 
  Loader2, 
  MessageSquare,
  Smile,
  Phone,
  MoreVertical,
  Download,
  Eye,
  Clock,
  User,
  Heart,
  Shield,
  Zap,
  Mic,
  MicOff,
  Play,
  Square,
  UserX,
  Flag,
  Archive,
  Volume2,
  Info,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/axios';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { ipfsService } from '../services/ipfs';
import { Modal } from '../services/modalService';

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
  metadata?: {
    duration?: number;
    waveform?: number[];
  };
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [microphoneSupported, setMicrophoneSupported] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker') && !target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
      if (!target.closest('.three-dots-menu') && !target.closest('.three-dots-button')) {
        setShowThreeDotsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check microphone support on mount
  useEffect(() => {
    const checkMicrophoneSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneSupported(false);
        console.warn('🎤 Microphone not supported in this browser');
      }
    };

    checkMicrophoneSupport();
  }, []);

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
      Modal.showError({
        title: 'Message Failed',
        message: 'Failed to send message. Please try again.',
        showRetry: true,
        onRetry: () => sendMessage()
      });
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
      Modal.showError({
        title: 'Upload Failed',
        message: 'Failed to upload file. Please try again.',
        showRetry: true,
        onRetry: () => handleFileUpload(file)
      });
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleVoiceUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      
      let errorMessage = 'Failed to access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.message === 'Permission denied') {
        errorMessage += 'Please allow microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is already in use by another application.';
      } else if (error.message === 'MEDIA_NOT_SUPPORTED') {
        errorMessage += 'Voice recording is not supported in this browser.';
      } else {
        errorMessage += 'Please check your microphone settings and try again.';
      }
      
      // Use a more user-friendly notification instead of alert
      console.warn('🎤 Voice recording error:', errorMessage);
      
      // You could replace this with a toast notification or modal
      Modal.showError({
        title: 'Download Failed',
        message: errorMessage
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleVoiceUpload = async (audioBlob: Blob) => {
    setUploading(true);
    try {
      // Create a file from the blob
      const fileName = `voice-${Date.now()}.wav`;
      const audioFile = Object.assign(audioBlob, {
        name: fileName,
        lastModified: Date.now()
      }) as File;

      // Upload to IPFS
      const uploadResult = await ipfsService.uploadFile(audioFile, {
        name: `voice-${Date.now()}-${audioFile.name}`,
        keyvalues: {
          type: 'voice-message',
          senderWallet: user?.walletAddress || '',
          receiverWallet: otherUserWallet,
          appointmentId: appointmentId || ''
        }
      });

      if (!uploadResult.success) {
        throw new Error('IPFS upload failed');
      }

      // Send voice message
      const response = await axios.post('/chat/send', {
        senderWallet: user?.walletAddress,
        receiverWallet: otherUserWallet,
        appointmentId,
        content: `Voice message (${recordingTime}s)`,
        type: 'audio',
        fileUrl: uploadResult.ipfsUrl,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileMimeType: audioFile.type,
        metadata: {
          duration: recordingTime
        }
      });

      if (response.data.success) {
        console.log('✅ Voice message sent');
      }
    } catch (error) {
      console.error('Failed to upload voice message:', error);
      Modal.showError({
        title: 'Voice Message Failed',
        message: 'Failed to send voice message. Please try again.',
        showRetry: true
      });
    } finally {
      setUploading(false);
      setRecordingTime(0);
    }
  };

  const playAudio = (messageId: string, audioUrl: string) => {
    if (playingAudio === messageId) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingAudio(null);
    } else {
      // Play new audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => setPlayingAudio(null);
      audio.onerror = () => {
        setPlayingAudio(null);
        Modal.showError({
          title: 'Playback Failed',
          message: 'Failed to play audio message'
        });
      };
      
      audio.play();
      setPlayingAudio(messageId);
    }
  };

  const makeVoiceCall = () => {
    // Implement voice call functionality
    Modal.showInfo({
      title: 'Voice Call',
      message: `Initiating voice call with ${otherUserName}...`
    });
    // This would integrate with your voice calling service
  };

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Popular emojis for healthcare context
  const popularEmojis = [
    '😊', '😷', '👍', '❤️', '🙏', '💊', '🩺', '🏥', 
    '😔', '😌', '🤒', '🤕', '💉', '🧬', '⚕️', '🚑',
    '👨‍⚕️', '👩‍⚕️', '🔬', '🩹', '💙', '🌟', '✨', '🙂'
  ];

  const renderMessage = (message: Message, index: number) => {
    const isSent = message.senderWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
    const senderName = message.sender?.profileData?.fullName || 'Unknown';
    const isDoctor = message.sender?.role === 'doctor';
    const messageTime = new Date(message.createdAt);
    
    // Show date separator if this is the first message of a new day
    const showDateSeparator = index === 0 || 
      format(messageTime, 'yyyy-MM-dd') !== format(new Date(messages[index - 1]?.createdAt), 'yyyy-MM-dd');

    return (
      <React.Fragment key={message.id}>
        {/* Date Separator */}
        {showDateSeparator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center my-8"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-600 text-sm px-4 py-2 rounded-full font-medium shadow-sm border border-gray-100">
              {format(messageTime, 'EEEE, MMMM d, yyyy')}
            </div>
          </motion.div>
        )}

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            delay: index * 0.03 
          }}
          className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-6 group`}
        >
          {/* Avatar for received messages */}
          {!isSent && (
            <motion.div 
              className="flex-shrink-0 mr-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg ${
                isDoctor 
                  ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600' 
                  : 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600'
              }`}>
                {isDoctor ? '👨‍⚕️' : senderName.charAt(0)}
              </div>
            </motion.div>
          )}

          <div className={`max-w-[75%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Sender name for received messages */}
            {!isSent && (
              <motion.div 
                className="flex items-center gap-3 mb-2 px-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className={`text-sm font-bold ${
                  isDoctor ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                  {senderName}
                </span>
                {isDoctor && (
                  <motion.span 
                    className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Shield className="w-3 h-3" />
                    Doctor
                  </motion.span>
                )}
              </motion.div>
            )}
            
            {/* Message bubble */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400 }}
              className={`relative rounded-3xl px-6 py-4 shadow-lg backdrop-blur-sm ${
                isSent
                  ? 'bg-gradient-to-br from-medical-500 via-medical-600 to-blue-600 text-white rounded-br-lg'
                  : 'bg-gradient-to-br from-white via-gray-50 to-blue-50 border-2 border-gray-100 text-gray-800 rounded-bl-lg'
              }`}
            >
              {/* Message content */}
              {message.type === 'text' && (
                <p className="leading-relaxed text-base">{message.content}</p>
              )}
              
              {message.type === 'image' && message.fileUrl && (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="cursor-pointer group"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={message.fileUrl}
                      alt={message.fileName}
                      className="max-w-full rounded-2xl shadow-md transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
                  </div>
                  <div className="flex items-center justify-between mt-3 p-2 bg-black/5 rounded-xl">
                    <p className="text-sm font-medium opacity-80">{message.fileName}</p>
                    <Eye className="w-4 h-4 opacity-60" />
                  </div>
                </motion.div>
              )}
              
              {message.type === 'audio' && message.fileUrl && (
                <motion.div
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.button
                    onClick={() => playAudio(message.id, message.fileUrl!)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      playingAudio === message.id
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {playingAudio === message.id ? (
                      <Square className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </motion.button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Voice Message</span>
                    </div>
                    
                    {/* Audio waveform visualization */}
                    <div className="flex items-center gap-1 h-8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={`w-1 bg-purple-400 rounded-full ${
                            playingAudio === message.id ? 'animate-pulse' : ''
                          }`}
                          style={{ 
                            height: `${Math.random() * 20 + 8}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                          animate={playingAudio === message.id ? {
                            scaleY: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          } : {}}
                          transition={{ 
                            repeat: playingAudio === message.id ? Infinity : 0,
                            duration: 0.8,
                            delay: i * 0.05
                          }}
                        />
                      ))}
                    </div>
                    
                    <p className="text-xs text-purple-600 mt-1">
                      Duration: {message.metadata?.duration || 0}s
                    </p>
                  </div>
                </motion.div>
              )}

              {(message.type === 'file' || message.type === 'video') && message.fileUrl && (
                <motion.a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 bg-medical-100 rounded-2xl flex items-center justify-center group-hover:bg-medical-200 transition-colors">
                    <File className="w-6 h-6 text-medical-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{message.fileName}</p>
                    {message.fileSize && (
                      <p className="text-sm text-gray-600 mt-1">
                        {(message.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <Download className="w-5 h-5 text-gray-500 group-hover:text-medical-600 transition-colors" />
                </motion.a>
              )}

              {/* Message tail */}
              <div className={`absolute bottom-0 ${
                isSent 
                  ? 'right-0 translate-x-2 border-l-[12px] border-l-medical-600 border-t-[12px] border-t-transparent' 
                  : 'left-0 -translate-x-2 border-r-[12px] border-r-white border-t-[12px] border-t-transparent'
              } w-0 h-0`} />
            </motion.div>

            {/* Message metadata */}
            <motion.div 
              className={`flex items-center gap-3 mt-2 px-2 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {format(messageTime, 'h:mm a')}
              </span>
              
              {isSent && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.4 }}
                  className="flex items-center"
                >
                  {message.read ? (
                    <div className="flex items-center gap-1 text-blue-500">
                      <CheckCheck className="w-4 h-4" />
                      <span className="text-xs font-medium">Read</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Sent</span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Avatar for sent messages */}
          {isSent && (
            <motion.div 
              className="flex-shrink-0 ml-4"
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-500 via-medical-600 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            </motion.div>
          )}
        </motion.div>
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-3xl shadow-2xl border border-white/50 overflow-hidden backdrop-blur-sm">
      {/* Enhanced Header */}
      <motion.div 
        className="bg-gradient-to-r from-medical-500 via-blue-600 to-indigo-600 text-white p-6 shadow-2xl relative overflow-hidden"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30"
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <User className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h3 className="font-bold text-xl">{otherUserName}</h3>
              <AnimatePresence mode="wait">
                {isTyping ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-white/90"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-white/70 rounded-full"
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.2, 
                            delay: i * 0.2 
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">typing...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="online"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-white/90 flex items-center gap-2"
                  >
                    <motion.div 
                      className="w-3 h-3 bg-green-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Secure Chat
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative">
            <motion.button
              onClick={makeVoiceCall}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 hover:bg-green-500/20 transition-all duration-200"
              title="Voice call"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Phone className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="three-dots-button p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 hover:bg-purple-500/20 transition-all duration-200"
              title="More options"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>

            {/* Three Dots Menu */}
            <AnimatePresence>
              {showThreeDotsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="three-dots-menu absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                >
                  {[
                    { icon: Info, label: "Chat Info", action: () => Modal.info('Chat info coming soon', 'Coming Soon') },
                    { icon: Search, label: "Search Messages", action: () => Modal.info('Search coming soon', 'Coming Soon') },
                    { icon: Bell, label: "Mute Notifications", action: () => Modal.info('Mute notifications', 'Coming Soon') },
                    { icon: Archive, label: "Archive Chat", action: () => Modal.info('Archive chat', 'Coming Soon') },
                    { icon: Flag, label: "Report User", action: () => Modal.warning('Report user functionality coming soon', 'Coming Soon'), danger: true },
                    { icon: UserX, label: "Block User", action: () => Modal.warning('Block user functionality coming soon', 'Coming Soon'), danger: true }
                  ].map(({ icon: Icon, label, action, danger }) => (
                    <motion.button
                      key={label}
                      onClick={() => {
                        action();
                        setShowThreeDotsMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent via-white/30 to-white/50 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <div className="relative mb-6">
                <motion.div
                  className="w-16 h-16 border-4 border-medical-200 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-2 w-12 h-12 border-4 border-medical-500 border-t-transparent rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-medical-500" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Loading your conversation</h3>
              <p className="text-gray-500">Securing your healthcare messages...</p>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center p-8"
            >
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="mb-8 relative"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-medical-100 to-blue-100 rounded-3xl flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-12 h-12 text-medical-500" />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-4 h-4 text-white" />
                </motion.div>
              </motion.div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Start Your Secure Conversation</h3>
              <p className="text-gray-600 max-w-md leading-relaxed mb-6">
                Begin a secure, encrypted healthcare conversation with{' '}
                <span className="font-semibold text-medical-600">{otherUserName}</span>.
                All messages are protected and HIPAA compliant.
              </p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>HIPAA compliant</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Input Area */}
      <motion.div 
        className="p-6 bg-white/80 backdrop-blur-md border-t border-white/50 shadow-2xl"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-end gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          
          {/* Action Buttons */}
          <div className="flex gap-2 relative">
            {[
              { 
                icon: Paperclip, 
                action: () => fileInputRef.current?.click(), 
                loading: uploading,
                color: "hover:bg-blue-50 hover:text-blue-600",
                tooltip: "Attach file",
                className: "",
                disabled: false
              },
              { 
                icon: Smile, 
                action: () => setShowEmojiPicker(!showEmojiPicker), 
                loading: false,
                color: "hover:bg-yellow-50 hover:text-yellow-600",
                tooltip: "Add emoji",
                className: "emoji-button",
                disabled: false
              },
              { 
                icon: isRecording ? MicOff : Mic, 
                action: isRecording ? stopRecording : startRecording, 
                loading: false,
                color: !microphoneSupported 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : isRecording 
                    ? "bg-red-100 text-red-600 hover:bg-red-200" 
                    : "hover:bg-purple-50 hover:text-purple-600",
                tooltip: !microphoneSupported 
                  ? "Voice recording not supported" 
                  : isRecording 
                    ? "Stop recording" 
                    : "Record voice message",
                className: "",
                disabled: !microphoneSupported
              }
            ].map(({ icon: Icon, action, loading, color, tooltip, className, disabled }) => (
              <motion.button
                key={tooltip}
                onClick={disabled ? undefined : action}
                disabled={loading || disabled}
                className={`p-3 text-gray-600 ${color} rounded-2xl transition-all duration-200 disabled:opacity-50 group shadow-sm border border-gray-200 ${
                  isRecording && tooltip.includes('recording') ? 'animate-pulse' : ''
                } ${className || ''}`}
                title={tooltip}
                whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
                whileTap={disabled ? {} : { scale: 0.95 }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
              </motion.button>
            ))}

            {/* Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="emoji-picker absolute bottom-full left-0 mb-2 p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
                >
                  <div className="grid grid-cols-8 gap-2 max-w-xs">
                    {popularEmojis.map((emoji, index) => (
                      <motion.button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <motion.textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your secure message..."
              rows={1}
              className="w-full px-6 py-4 pr-16 border-2 border-gray-200 rounded-3xl focus:ring-2 focus:ring-medical-500 focus:border-medical-500 resize-none transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-sm placeholder-gray-400"
              disabled={sending}
              style={{ minHeight: '56px', maxHeight: '120px' }}
              whileFocus={{ scale: 1.02 }}
            />
            
            {/* Character count for long messages */}
            <AnimatePresence>
              {input.length > 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-2 right-16 text-xs text-gray-400 bg-white px-2 py-1 rounded-full shadow-sm"
                >
                  {input.length}/1000
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Send Button */}
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || sending || isRecording}
            className="p-4 bg-gradient-to-r from-medical-500 via-blue-600 to-indigo-600 text-white rounded-3xl hover:from-medical-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl border border-white/20"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            title="Send secure message"
          >
            {sending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-6 h-6" />
              </motion.div>
            ) : (
              <Send className="w-6 h-6" />
            )}
          </motion.button>
        </div>

        {/* Recording Indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                  <span className="text-sm text-red-700 font-medium">Recording voice message...</span>
                  <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <motion.button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Stop & Send
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-5 h-5 text-blue-600" />
                </motion.div>
                <span className="text-sm text-blue-700 font-medium">Securely uploading file...</span>
                <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};