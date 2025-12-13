import express from 'express';
import authRoutes from './auth.js';
import appointmentRoutes from './appointment.js';
import appointmentPaymentRoutes from './appointmentPayment.js';
import chapaPaymentRoutes from './chapaPayment.js';
import paymentFirstRoutes from './paymentFirst.js';
import paymentRoutes from './payment.js';
import prescriptionRoutes from './prescriptions.js';
import notificationRoutes from './notifications.js';
import consentRoutes from './consent.js';
import appointmentConsentRoutes from './appointmentConsent.js';
import fileUploadRoutes from './fileUpload.js';
import databaseRoutes from './database.js';
import labResultRoutes from './labResults.js';
import adminRoutes from './admin.js';
import smartSchedulingRoutes from './smartScheduling.js';
import appointmentWorkflowRoutes from './appointmentWorkflow.js';
import blockchainSyncRoutes from './blockchain-sync.js';
import legacyMigrationRoutes from './legacy-migration.js';
import prescriptionAccessRoutes from './prescriptionAccess.js';
import premiumServiceRoutes from './premiumService.js';
console.log('🔍 Loading two-tier pricing routes...');
import twoTierPricingRoutes from './twoTierPricingMinimal.js';
console.log('✅ Two-tier pricing routes loaded successfully');
import videoCallRoutes from './videoCall.js';
import chatRoutes from './chat.js';
// Enhanced Appointment System
import enhancedAppointmentsRoutes from './enhancedAppointments.js';

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/appointment-payment', appointmentPaymentRoutes); // New payment workflow routes
router.use('/chapa-payment', chapaPaymentRoutes); // Chapa payment integration routes
router.use('/payment-first', paymentFirstRoutes); // Payment-first workflow routes (CORRECT LOGIC)
router.use('/payments', paymentRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/consent', consentRoutes);
router.use('/appointment-consent', appointmentConsentRoutes);
router.use('/upload', fileUploadRoutes);
router.use('/database', databaseRoutes);
router.use('/lab-results', labResultRoutes);
router.use('/admin', adminRoutes);
router.use('/smart-scheduling', smartSchedulingRoutes);
router.use('/appointment-workflow', appointmentWorkflowRoutes);
router.use('/blockchain-sync', blockchainSyncRoutes);
router.use('/legacy-migration', legacyMigrationRoutes);
router.use('/prescription-access', prescriptionAccessRoutes);
router.use('/premium-service', premiumServiceRoutes);
console.log('🔗 Registering two-tier pricing routes at /two-tier-pricing');
router.use('/two-tier-pricing', twoTierPricingRoutes);
console.log('✅ Two-tier pricing routes registered');
router.use('/video-calls', videoCallRoutes);
router.use('/chat', chatRoutes);
// Enhanced Appointment System
router.use('/enhanced-appointments', enhancedAppointmentsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Elite Tena API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

export default router;