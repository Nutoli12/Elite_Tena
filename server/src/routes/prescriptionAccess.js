import express from 'express';
import {
  quickApprove,
  manualGrant,
  generateQRCode,
  regenerateQRCode,
  scanQRCode,
  revokeAccess,
  getAccessGrants,
  emergencyAccess,
  getAccessiblePrescriptions
} from '../controllers/prescriptionAccessController.js';

const router = express.Router();

/**
 * 🔐 PRESCRIPTION ACCESS CONTROL ROUTES
 * Patient-controlled access to prescriptions
 */

// Patient Actions
router.post('/:prescriptionId/access/quick-approve', quickApprove);
router.post('/:prescriptionId/access/manual-grant', manualGrant);
router.post('/:prescriptionId/access/qr-generate', generateQRCode);
router.post('/:prescriptionId/access/qr-regenerate', regenerateQRCode);
router.delete('/access/:grantId', revokeAccess);
router.get('/:prescriptionId/access', getAccessGrants);

// Pharmacist Actions
router.post('/access/qr-scan', scanQRCode);
router.post('/:prescriptionId/access/emergency', emergencyAccess);
router.get('/pharmacist/:pharmacistWalletAddress/accessible', getAccessiblePrescriptions);

export default router;
