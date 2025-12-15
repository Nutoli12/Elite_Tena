import axios from '../lib/axios';

/**
 * 💬🎥 CONSULTATION SERVICE
 * API calls for premium chat and video consultations
 */

export interface ConsultationRequest {
  patientWallet: string;
  doctorWallet: string;
  consultationType: 'chat' | 'video';
  scheduledTime?: string;
  durationMinutes?: number;
}

export interface PaymentSubmission {
  paymentMethod: string;
  paymentReference: string;
  patientWallet: string;
}

export interface Consultation {
  id: string;
  patientWallet: string;
  doctorWallet: string;
  consultationType: 'chat' | 'video';
  consultationFee: number;
  currency: string;
  status: string;
  paymentStatus: string;
  scheduledTime?: string;
  durationMinutes?: number;
  chatRoomId?: string;
  dailyRoomUrl?: string;
  expiresAt?: string;
  patient?: any;
  doctor?: any;
  patientRating?: number;
  patientFeedback?: string;
  doctorRating?: number;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderWallet: string;
  senderRole: 'patient' | 'doctor';
  messageType: 'text' | 'image' | 'file' | 'prescription' | 'system';
  content: string;
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  createdAt: string;
  sender?: any;
}

const consultationService = {
  // Request a new consultation
  async requestConsultation(data: ConsultationRequest) {
    const response = await axios.post('/premium-consultations/request', data);
    return response.data;
  },

  // Get user's consultations
  async getConsultations(params: { userWallet: string; role?: string; status?: string; type?: string }) {
    const response = await axios.get('/premium-consultations', { params });
    return response.data;
  },

  // Get specific consultation
  async getConsultation(id: string, userWallet: string) {
    const response = await axios.get(`/premium-consultations/${id}`, { params: { userWallet } });
    return response.data;
  },

  // Submit P2P payment reference
  async submitPayment(id: string, data: PaymentSubmission) {
    const response = await axios.post(`/premium-consultations/${id}/submit-payment`, data);
    return response.data;
  },

  // Initialize Chapa payment
  async initializeChapaPayment(id: string, patientWallet: string, returnUrl?: string) {
    const response = await axios.post(`/premium-consultations/${id}/pay-chapa`, {
      patientWallet,
      returnUrl
    });
    return response.data;
  },

  // Doctor verifies payment
  async verifyPayment(id: string, doctorWallet: string) {
    const response = await axios.post(`/premium-consultations/${id}/verify-payment`, { doctorWallet });
    return response.data;
  },

  // Join consultation
  async joinConsultation(id: string, userWallet: string) {
    const response = await axios.post(`/premium-consultations/${id}/join`, { userWallet });
    return response.data;
  },

  // End consultation
  async endConsultation(id: string, data: { userWallet: string; doctorNotes?: string; consultationSummary?: string; followUpRecommended?: boolean }) {
    const response = await axios.post(`/premium-consultations/${id}/end`, data);
    return response.data;
  },

  // Rate consultation
  async rateConsultation(id: string, userWallet: string, rating: number, feedback?: string) {
    const response = await axios.post(`/premium-consultations/${id}/rate`, { userWallet, rating, feedback });
    return response.data;
  },

  // ==================== CHAT MESSAGES ====================

  // Send message
  async sendMessage(consultationId: string, data: { senderWallet: string; content: string; messageType?: string; fileUrl?: string; fileName?: string }) {
    const response = await axios.post(`/premium-consultations/${consultationId}/messages`, data);
    return response.data;
  },

  // Get messages
  async getMessages(consultationId: string, userWallet: string, limit?: number, before?: string) {
    const response = await axios.get(`/premium-consultations/${consultationId}/messages`, {
      params: { userWallet, limit, before }
    });
    return response.data;
  },

  // Mark messages as read
  async markMessagesRead(consultationId: string, userWallet: string) {
    const response = await axios.post(`/premium-consultations/${consultationId}/messages/read`, { userWallet });
    return response.data;
  },

  // Get unread count
  async getUnreadCount(consultationId: string, userWallet: string) {
    const response = await axios.get(`/premium-consultations/${consultationId}/messages/unread`, {
      params: { userWallet }
    });
    return response.data;
  },

  // Send typing indicator
  async sendTypingIndicator(consultationId: string, userWallet: string, isTyping: boolean) {
    const response = await axios.post(`/premium-consultations/${consultationId}/typing`, { userWallet, isTyping });
    return response.data;
  },

  // ==================== VIDEO CALL INTEGRATION ====================

  // Start video call for consultation
  async startVideoCall(consultationId: string, userWallet: string) {
    const response = await axios.post(`/premium-consultations/${consultationId}/start-video`, { userWallet });
    return response.data;
  },

  // Get video call details for consultation
  async getVideoCallDetails(consultationId: string, userWallet: string) {
    const response = await axios.get(`/premium-consultations/${consultationId}/video-call`, { 
      params: { userWallet } 
    });
    return response.data;
  },

  // ==================== UNIFIED CONSULTATION HISTORY ====================

  // Get unified consultation history (both chat and video)
  async getUnifiedConsultationHistory(userWallet: string, role?: string) {
    const response = await axios.get('/premium-consultations/unified-history', {
      params: { userWallet, role }
    });
    return response.data;
  },

  // Get consultation with video call data
  async getConsultationWithVideoData(id: string, userWallet: string) {
    const response = await axios.get(`/premium-consultations/${id}/with-video`, {
      params: { userWallet }
    });
    return response.data;
  }
};

export default consultationService;
