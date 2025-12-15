import express from 'express';
import {
  initiateCall,
  answerCall,
  rejectCall,
  endCall,
  getCall,
  getCallHistory,
  updateCallQuality,
  getJitsiUrl,
  handleJitsiWebhook,
  getActiveCalls
} from '../controllers/videoCallController.js';

const router = express.Router();

/**
 * 📹 VIDEO CALL ROUTES
 * Enhanced video consultations with Jitsi Meet integration (FREE!)
 */

// Call management
router.post('/initiate', initiateCall);
router.post('/:callId/answer', answerCall);
router.post('/:callId/reject', rejectCall);
router.post('/:callId/end', endCall);

// Call information
router.get('/:callId', getCall);
router.get('/history/:userWallet', getCallHistory);
router.get('/active/:userWallet', getActiveCalls);

// Jitsi Meet integration
router.get('/:callId/jitsi-url', getJitsiUrl);
router.post('/jitsi-webhook', handleJitsiWebhook);

// Call quality and monitoring
router.put('/:callId/quality', updateCallQuality);

export default router;
