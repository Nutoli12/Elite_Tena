import express from 'express';
import {
    getPaymentSettings,
    updatePaymentSettings,
    getPendingApprovalsCount
} from '../controllers/premiumServicesController.js';

const router = express.Router();

// Get payment settings for a doctor
router.get('/payment-settings/:doctorWallet', getPaymentSettings);

// Update payment settings for a doctor
router.put('/payment-settings/:doctorWallet', updatePaymentSettings);

// Get pending approvals count for dashboard
router.get('/doctor/:doctorWallet/pending-approvals', getPendingApprovalsCount);

export default router;
