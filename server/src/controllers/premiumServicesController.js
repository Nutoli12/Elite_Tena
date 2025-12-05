import db from '../models/index.js';
const { Doctor, DoctorPaymentSettings, User } = db;

/**
 * 💰 PREMIUM SERVICES CONTROLLER
 * Handles doctor payment settings and premium service configuration
 */

/**
 * Get doctor's payment settings
 */
export const getPaymentSettings = async (req, res) => {
    try {
        const { doctorWallet } = req.params;

        console.log('🔍 Fetching payment settings for:', doctorWallet);

        let settings = await DoctorPaymentSettings.findOne({
            where: { doctorWalletAddress: doctorWallet.toLowerCase() }
        });

        if (!settings) {
            // Create default settings if not found
            console.log('⚠️ No settings found, creating default...');
            settings = await DoctorPaymentSettings.create({
                doctorWalletAddress: doctorWallet.toLowerCase(),
                telebirrEnabled: false,
                cbeBirrEnabled: false,
                bankTransferEnabled: false,
                videoCallFee: 500, // Default fee
                chatFee: 300       // Default fee
            });
        }

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('❌ Get payment settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment settings',
            message: error.message
        });
    }
};

/**
 * Update doctor's payment settings
 */
export const updatePaymentSettings = async (req, res) => {
    try {
        const { doctorWallet } = req.params;
        const updates = req.body;

        console.log('📝 Updating payment settings for:', doctorWallet);

        let settings = await DoctorPaymentSettings.findOne({
            where: { doctorWalletAddress: doctorWallet.toLowerCase() }
        });

        if (!settings) {
            settings = await DoctorPaymentSettings.create({
                doctorWalletAddress: doctorWallet.toLowerCase(),
                ...updates
            });
        } else {
            await settings.update(updates);
        }

        // Also update the Doctor model's availableServices JSON to reflect fees
        const doctor = await Doctor.findByPk(doctorWallet.toLowerCase());
        if (doctor) {
            const currentServices = doctor.availableServices || {};

            // Update fees in availableServices
            const updatedServices = {
                ...currentServices,
                videoCall: {
                    ...currentServices.videoCall,
                    fee: updates.videoCallFee || currentServices.videoCall?.fee || 500,
                    available: true // Ensure it's marked available if fee is set
                },
                chat: {
                    ...currentServices.chat,
                    fee: updates.chatFee || currentServices.chat?.fee || 300,
                    available: true
                }
            };

            await doctor.update({ availableServices: updatedServices });
        }

        console.log('✅ Payment settings updated');

        res.json({
            success: true,
            message: 'Payment settings updated successfully',
            data: settings
        });

    } catch (error) {
        console.error('❌ Update payment settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment settings',
            message: error.message
        });
    }
};

/**
 * Get pending approvals count (for dashboard)
 */
export const getPendingApprovalsCount = async (req, res) => {
    try {
        const { doctorWallet } = req.params;

        // Import Appointment model dynamically to avoid circular dependencies if any
        const { Appointment } = db;

        const count = await Appointment.count({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                requiresApproval: true,
                approvalStatus: 'pending'
            }
        });

        res.json({
            success: true,
            count
        });

    } catch (error) {
        console.error('❌ Get pending approvals count error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get count',
            count: 0
        });
    }
};
