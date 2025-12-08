import express from 'express';
import {
  requestAccess,
  getPendingRequests,
  grantConsent,
  denyConsent,
  getActiveConsents,
  revokeConsent,
  getConsentHistory,
  getDoctorConsents,
  checkAccess,
  getConsentStats,
  autoExpireConsents
} from '../controllers/consentController.js';

const router = express.Router();

// 👨‍⚕️ DOCTOR ROUTES
router.post('/request', requestAccess);                                    // Doctor requests access
router.get('/doctor/:doctorWalletAddress', getDoctorConsents);            // Doctor views their consents
router.get('/check/:doctorWalletAddress/:patientWalletAddress', checkAccess); // Check if doctor has access

// 👤 PATIENT ROUTES
router.get('/pending/:patientWalletAddress', getPendingRequests);         // Patient views pending requests
router.post('/:consentId/grant', grantConsent);                           // Patient grants consent
router.post('/:consentId/deny', denyConsent);                             // Patient denies request
router.get('/active/:patientWalletAddress', getActiveConsents);           // Patient views active consents
router.post('/:consentId/revoke', revokeConsent);                         // Patient revokes consent
router.get('/history/:patientWalletAddress', getConsentHistory);          // Patient views full history

// 📊 STATISTICS
router.get('/stats/:role/:walletAddress', getConsentStats);               // Get consent statistics

// 🔄 SYSTEM ROUTES
router.post('/auto-expire', autoExpireConsents);                          // Cron job to expire old consents

export default router;
