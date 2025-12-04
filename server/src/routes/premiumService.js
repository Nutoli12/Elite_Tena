import express from 'express';
import {
  getDoctorPaymentSettings,
  updateDoctorPaymentSettings,
  requestPremiumService,
  approvePremiumService,
  rejectPremiumService,
  uploadPaymentReceipt,
  confirmPaymentReceived,
  rejectPaymentProof,
  getDoctorPendingApprovals,
  getDoctorPendingPayments,
  getPatientPremiumRequests
} from '../controllers/premiumServiceController.js';

const router = express.Router();

/**
 * 💰 PREMIUM SERVICE ROUTES (PEER-TO-PEER PAYMENTS)
 * 
 * System facilitates connection only - does NOT process payments
 * Patients pay directly to doctors
 */

// Doctor Payment Settings
router.get('/payment-settings/:doctorWallet', getDoctorPaymentSettings);
router.put('/payment-settings/:doctorWallet', updateDoctorPaymentSettings);

// Premium Service Request Flow
router.post('/request', requestPremiumService);
router.post('/:appointmentId/approve', approvePremiumService);
router.post('/:appointmentId/reject', rejectPremiumService);

// Payment Proof Flow
router.post('/:appointmentId/upload-receipt', uploadPaymentReceipt);
router.post('/:appointmentId/confirm-payment', confirmPaymentReceived);
router.post('/:appointmentId/reject-payment', rejectPaymentProof);

// Doctor Views
router.get('/doctor/:doctorWallet/pending-approvals', getDoctorPendingApprovals);
router.get('/doctor/:doctorWallet/pending-payments', getDoctorPendingPayments);

// Patient Views
router.get('/patient/:patientWallet/requests', getPatientPremiumRequests);

export default router;
