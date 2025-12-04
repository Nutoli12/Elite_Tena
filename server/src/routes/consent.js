import express from 'express';
import { grantConsent, revokeConsent, getConsents } from '../controllers/consentController.js';

const router = express.Router();

// Grant consent
router.post('/grant', grantConsent);

// Revoke consent
router.post('/revoke', revokeConsent);

// Get consents for a patient
router.get('/:patientWallet', getConsents);

export default router;

// Root consent endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Consent API is working',
    endpoints: {
      grant: 'POST /api/consent/grant',
      revoke: 'POST /api/consent/revoke', 
      getConsents: 'GET /api/consent/:patientWallet'
    }
  });
});

// Root consent endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Consent API is working',
    endpoints: {
      grant: 'POST /api/consent/grant',
      revoke: 'POST /api/consent/revoke', 
      getConsents: 'GET /api/consent/:patientWallet'
    }
  });
});
