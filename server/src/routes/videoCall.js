import express from 'express';
import {
  initiateCall,
  answerCall,
  rejectCall,
  endCall,
  getCall,
  getCallHistory,
  updateCallQuality
} from '../controllers/videoCallController.js';

const router = express.Router();

/**
 * 📹 VIDEO CALL ROUTES
 * WebRTC-based video consultations
 */

// Call management
router.post('/initiate', initiateCall);
router.post('/:callId/answer', answerCall);
router.post('/:callId/reject', rejectCall);
router.post('/:callId/end', endCall);

// Call information
router.get('/:callId', getCall);
router.get('/history/:userWallet', getCallHistory);

// Call quality
router.put('/:callId/quality', updateCallQuality);

export default router;
