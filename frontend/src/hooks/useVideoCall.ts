import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import videoCallService from '../services/videoCallService';
import type { VideoCall } from '../services/videoCallService';
import { io, Socket } from 'socket.io-client';

interface UseVideoCallOptions {
  onIncomingCall?: (call: VideoCall) => void;
  onCallAnswered?: (callId: string) => void;
  onCallRejected?: (callId: string, reason?: string) => void;
  onCallEnded?: (callId: string, reason?: string) => void;
  onParticipantJoined?: (callId: string, userId: string) => void;
  onParticipantLeft?: (callId: string, userId: string) => void;
}

export const useVideoCall = (options: UseVideoCallOptions = {}) => {
  const { user } = useAuth();
  const [activeCalls, setActiveCalls] = useState<VideoCall[]>([]);
  const [incomingCall, setIncomingCall] = useState<VideoCall | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.walletAddress) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003';
      const socket = io(apiUrl, {
        auth: {
          walletAddress: user.walletAddress
        },
        timeout: 10000, // 10 second timeout
        transports: ['websocket', 'polling'] // Fallback transports
      });

      socketRef.current = socket;

    // Join user's room for notifications
    socket.emit('join_room', user.walletAddress.toLowerCase());

    // Handle incoming call
    socket.on('incoming_call', (data: any) => {
      console.log('📞 Incoming call:', data);
      
      // Create VideoCall object from socket data
      const call: VideoCall = {
        id: data.callId,
        initiatorWallet: data.initiatorWallet,
        receiverWallet: user.walletAddress.toLowerCase(),
        roomId: data.roomId,
        status: 'initiated',
        appointmentId: data.appointmentId,
        metadata: {
          scheduledTime: data.scheduledTime,
          durationMinutes: data.durationMinutes,
          dailyRoom: data.dailyRoomUrl ? {
            roomName: data.roomId,
            roomUrl: data.dailyRoomUrl,
            expiresAt: ''
          } : undefined,
          initiatorRole: data.initiatorRole
        },
        initiator: {
          walletAddress: data.initiatorWallet,
          profileData: {
            fullName: data.initiatorName,
            firstName: data.initiatorName
          },
          role: data.initiatorRole
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setIncomingCall(call);
      options.onIncomingCall?.(call);
    });

    // Handle call answered
    socket.on('call_answered', (data: any) => {
      console.log('✅ Call answered:', data);
      setIncomingCall(null);
      options.onCallAnswered?.(data.callId);
    });

    // Handle call rejected
    socket.on('call_rejected', (data: any) => {
      console.log('❌ Call rejected:', data);
      setIncomingCall(null);
      options.onCallRejected?.(data.callId, data.reason);
    });

    // Handle call ended
    socket.on('call_ended', (data: any) => {
      console.log('🔚 Call ended:', data);
      setIncomingCall(null);
      setActiveCalls(prev => prev.filter(call => call.id !== data.callId));
      options.onCallEnded?.(data.callId, data.reason);
    });

    // Handle participant events
    socket.on('participant_joined', (data: any) => {
      console.log('👤 Participant joined:', data);
      options.onParticipantJoined?.(data.callId, data.userId);
    });

    socket.on('participant_left', (data: any) => {
      console.log('👋 Participant left:', data);
      options.onParticipantLeft?.(data.callId, data.userId);
    });

      // Handle connection errors
      socket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error);
        setError('Connection failed. Video calls may not work properly.');
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.connect();
        }
      });

      return () => {
        try {
          socket.disconnect();
          socketRef.current = null;
        } catch (err) {
          console.warn('Error disconnecting socket:', err);
        }
      };
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      setError('Failed to initialize real-time connection');
    }
  }, [user?.walletAddress, options]);

  // Load active calls
  const loadActiveCalls = useCallback(async () => {
    if (!user?.walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await videoCallService.getActiveCalls(user.walletAddress);
      setActiveCalls(response.data || []);
    } catch (err: any) {
      console.error('Failed to load active calls:', err);
      setError(err.message || 'Failed to load active calls');
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // Load active calls on mount
  useEffect(() => {
    loadActiveCalls();
  }, [loadActiveCalls]);

  // Initiate a video call
  const initiateCall = useCallback(async (
    receiverWallet: string,
    options: {
      appointmentId?: string;
      consultationId?: string;
      scheduledTime?: string;
      durationMinutes?: number;
    } = {}
  ) => {
    if (!user?.walletAddress) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await videoCallService.initiateCall({
        initiatorWallet: user.walletAddress,
        receiverWallet,
        ...options
      });

      const newCall = response.data;
      setActiveCalls(prev => [...prev, newCall]);
      
      return newCall;
    } catch (err: any) {
      console.error('Failed to initiate call:', err);
      setError(err.message || 'Failed to initiate call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // Answer an incoming call
  const answerCall = useCallback(async (callId: string) => {
    if (!user?.walletAddress) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await videoCallService.answerCall(callId, user.walletAddress);
      
      setIncomingCall(null);
      setActiveCalls(prev => {
        const updated = prev.map(call => 
          call.id === callId ? { ...call, status: 'active' as const } : call
        );
        
        // Add to active calls if not already there
        if (!updated.find(call => call.id === callId)) {
          updated.push(response.data);
        }
        
        return updated;
      });

      return response.data;
    } catch (err: any) {
      console.error('Failed to answer call:', err);
      setError(err.message || 'Failed to answer call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // Reject an incoming call
  const rejectCall = useCallback(async (callId: string, reason?: string) => {
    if (!user?.walletAddress) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      await videoCallService.rejectCall(callId, user.walletAddress, reason);
      
      setIncomingCall(null);
      setActiveCalls(prev => prev.filter(call => call.id !== callId));
    } catch (err: any) {
      console.error('Failed to reject call:', err);
      setError(err.message || 'Failed to reject call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // End an active call
  const endCall = useCallback(async (
    callId: string, 
    reason?: string, 
    quality?: any, 
    callSummary?: string
  ) => {
    if (!user?.walletAddress) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      await videoCallService.endCall(callId, user.walletAddress, reason, quality, callSummary);
      
      setActiveCalls(prev => prev.filter(call => call.id !== callId));
    } catch (err: any) {
      console.error('Failed to end call:', err);
      setError(err.message || 'Failed to end call');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // Get call history
  const getCallHistory = useCallback(async (params?: { limit?: number; status?: string }) => {
    if (!user?.walletAddress) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await videoCallService.getCallHistory(user.walletAddress, params);
      return response.data || [];
    } catch (err: any) {
      console.error('Failed to get call history:', err);
      setError(err.message || 'Failed to get call history');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.walletAddress]);

  // Clear incoming call
  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    activeCalls,
    incomingCall,
    isLoading,
    error,

    // Actions
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    getCallHistory,
    loadActiveCalls,
    clearIncomingCall,
    clearError,

    // Computed
    hasActiveCalls: activeCalls.length > 0,
    hasIncomingCall: !!incomingCall
  };
};