import axios from '../lib/axios';

/**
 * 🎥 VIDEO CALL SERVICE
 * Enhanced video consultation API calls
 */

export interface VideoCallRequest {
  initiatorWallet: string;
  receiverWallet: string;
  appointmentId?: string;
  consultationId?: string;
  scheduledTime?: string;
  durationMinutes?: number;
}

export interface VideoCall {
  id: string;
  initiatorWallet: string;
  receiverWallet: string;
  appointmentId?: string;
  roomId: string;
  status: 'initiated' | 'ringing' | 'active' | 'ended' | 'missed' | 'rejected' | 'failed';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  endReason?: string;
  quality?: any;
  metadata?: {
    scheduledTime?: string;
    durationMinutes?: number;
    jitsiRoom?: {
      roomName: string;
      roomUrl: string;
      doctorUrl: string;
      patientUrl: string;
      provider: string;
    };
    initiatorRole?: string;
    receiverRole?: string;
    callSummary?: string;
    endedBy?: string;
    qualityMetrics?: any;
  };
  initiator?: any;
  receiver?: any;
  appointment?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CallQualityMetrics {
  bandwidth?: number;
  packetLoss?: number;
  latency?: number;
  videoQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  connectionStability?: 'stable' | 'unstable' | 'poor';
  userRating?: number;
  technicalIssues?: string[];
}

const videoCallService = {
  /**
   * Initiate a new video call
   */
  async initiateCall(data: VideoCallRequest) {
    const response = await axios.post('/video-calls/initiate', data);
    return response.data;
  },

  /**
   * Answer an incoming video call
   */
  async answerCall(callId: string, userWallet: string) {
    const response = await axios.post(`/video-calls/${callId}/answer`, { userWallet });
    return response.data;
  },

  /**
   * Reject an incoming video call
   */
  async rejectCall(callId: string, userWallet: string, reason?: string) {
    const response = await axios.post(`/video-calls/${callId}/reject`, { userWallet, reason });
    return response.data;
  },

  /**
   * End an active video call
   */
  async endCall(callId: string, userWallet: string, reason?: string, quality?: CallQualityMetrics, callSummary?: string) {
    const response = await axios.post(`/video-calls/${callId}/end`, { 
      userWallet, 
      reason, 
      quality,
      callSummary
    });
    return response.data;
  },

  /**
   * Get video call details
   */
  async getCall(callId: string) {
    const response = await axios.get(`/video-calls/${callId}`);
    return response.data;
  },

  /**
   * Get call history for a user
   */
  async getCallHistory(userWallet: string, params?: { limit?: number; status?: string }) {
    const response = await axios.get(`/video-calls/history/${userWallet}`, { params });
    return response.data;
  },

  /**
   * Get active calls for a user
   */
  async getActiveCalls(userWallet: string) {
    const response = await axios.get(`/video-calls/active/${userWallet}`);
    return response.data;
  },

  /**
   * Update call quality metrics
   */
  async updateCallQuality(callId: string, userWallet: string, quality: CallQualityMetrics) {
    const response = await axios.put(`/video-calls/${callId}/quality`, { userWallet, quality });
    return response.data;
  },

  /**
   * Get Jitsi Meet URL for a call
   */
  async getJitsiUrl(callId: string, userWallet: string) {
    const response = await axios.get(`/video-calls/${callId}/jitsi-url`, { 
      params: { userWallet } 
    });
    return response.data;
  },

  /**
   * Start a video call from consultation
   */
  async startConsultationVideoCall(consultationId: string, userWallet: string) {
    // This integrates with the consultation service
    const response = await axios.post(`/premium-consultations/${consultationId}/start-video`, { 
      userWallet 
    });
    return response.data;
  }
};

export default videoCallService;