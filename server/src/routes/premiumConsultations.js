import express from 'express';
import * as consultationController from '../controllers/premiumConsultationController.js';
import * as chatController from '../controllers/consultationChatController.js';

const router = express.Router();

/**
 * 💬🎥 PREMIUM CONSULTATIONS ROUTES
 * Chat and Video consultation endpoints
 */

// ==================== CONSULTATION MANAGEMENT ====================

// Get unified consultation history (consultations + video calls) - MUST be FIRST
router.get('/unified-history', consultationController.getUnifiedConsultationHistory);

// Request new consultation
router.post('/request', consultationController.requestConsultation);

// Get user's consultations
router.get('/', consultationController.getUserConsultations);

// Get specific consultation
router.get('/:id', consultationController.getConsultation);

// ==================== PAYMENT ====================

// Submit P2P payment reference
router.post('/:id/submit-payment', consultationController.submitPaymentReference);

// Initialize Chapa payment
router.post('/:id/pay-chapa', consultationController.initializeChapaPayment);

// Doctor verifies payment
router.post('/:id/verify-payment', consultationController.verifyPayment);

// ==================== SESSION MANAGEMENT ====================

// Join consultation
router.post('/:id/join', consultationController.joinConsultation);

// End consultation
router.post('/:id/end', consultationController.endConsultation);

// Rate consultation
router.post('/:id/rate', consultationController.rateConsultation);

// ==================== CHAT MESSAGES ====================

// Send message
router.post('/:id/messages', chatController.sendMessage);

// Get messages
router.get('/:id/messages', chatController.getMessages);

// Mark messages as read
router.post('/:id/messages/read', chatController.markMessagesRead);

// Get unread count
router.get('/:id/messages/unread', chatController.getUnreadCount);

// Typing indicator
router.post('/:id/typing', chatController.sendTypingIndicator);

// ==================== VIDEO CALL INTEGRATION ====================

// Start video call for consultation
router.post('/:id/start-video', consultationController.startVideoCall);

// Get video call details
router.get('/:id/video-call', consultationController.getVideoCallDetails);

export default router;
