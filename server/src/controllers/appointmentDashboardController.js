import db from '../models/index.js';
const { Appointment, Patient, Doctor, User } = db;

/**
 * Get appointments for a specific doctor (Doctor Dashboard)
 */
export const getDoctorAppointments = async (req, res) => {
    try {
        const { doctorWallet } = req.params;
        const { status, date, serviceType } = req.query;

        console.log('🔍 Fetching appointments for doctor:', doctorWallet);

        const whereClause = {
            doctorWalletAddress: doctorWallet.toLowerCase()
        };

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        // Filter by service type if provided
        if (serviceType) {
            whereClause.serviceType = serviceType;
        }

        // Filter by date if provided
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            whereClause.appointmentDate = {
                [db.Sequelize.Op.between]: [startOfDay, endOfDay]
            };
        }

        const appointments = await Appointment.findAll({
            where: whereClause,
            include: [
                {
                    model: Patient,
                    as: 'patientDetails',
                    attributes: ['walletAddress', 'bloodType', 'allergies', 'emergencyContact']
                },
                {
                    model: User,
                    as: 'patientUser',
                    attributes: ['walletAddress', 'email', 'profileData']
                }
            ],
            order: [['appointmentDate', 'ASC'], ['queueNumber', 'ASC']]
        });

        console.log(`✅ Found ${appointments.length} appointments for doctor`);

        res.json({
            success: true,
            data: appointments,
            count: appointments.length
        });
    } catch (error) {
        console.error('❌ Get doctor appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch doctor appointments',
            message: error.message
        });
    }
};

/**
 * Get appointments for a specific patient (Patient Dashboard)
 */
export const getPatientAppointments = async (req, res) => {
    try {
        const { patientWallet } = req.params;
        const { status, upcoming } = req.query;

        console.log('🔍 Fetching appointments for patient:', patientWallet);

        const whereClause = {
            patientWalletAddress: patientWallet.toLowerCase()
        };

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        // Filter for upcoming appointments
        if (upcoming === 'true') {
            whereClause.appointmentDate = {
                [db.Sequelize.Op.gte]: new Date()
            };
            whereClause.status = {
                [db.Sequelize.Op.notIn]: ['cancelled', 'completed']
            };
        }

        const appointments = await Appointment.findAll({
            where: whereClause,
            include: [
                {
                    model: Doctor,
                    as: 'doctorDetails',
                    attributes: ['walletAddress', 'specialization', 'licenseNumber']
                },
                {
                    model: User,
                    as: 'doctorUser',
                    attributes: ['walletAddress', 'email', 'profileData']
                }
            ],
            order: [['appointmentDate', 'DESC']]
        });

        console.log(`✅ Found ${appointments.length} appointments for patient`);

        res.json({
            success: true,
            data: appointments,
            count: appointments.length
        });
    } catch (error) {
        console.error('❌ Get patient appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patient appointments',
            message: error.message
        });
    }
};

/**
 * Get today's appointments for doctor (Dashboard quick view)
 */
export const getTodayAppointments = async (req, res) => {
    try {
        const { doctorWallet } = req.params;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const appointments = await Appointment.findAll({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                appointmentDate: {
                    [db.Sequelize.Op.between]: [today, tomorrow]
                },
                status: {
                    [db.Sequelize.Op.notIn]: ['cancelled']
                }
            },
            include: [
                {
                    model: Patient,
                    as: 'patientDetails'
                },
                {
                    model: User,
                    as: 'patientUser',
                    attributes: ['walletAddress', 'profileData']
                }
            ],
            order: [['appointmentDate', 'ASC'], ['queueNumber', 'ASC']]
        });

        res.json({
            success: true,
            data: appointments,
            count: appointments.length
        });
    } catch (error) {
        console.error('❌ Get today appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch today appointments',
            message: error.message
        });
    }
};

/**
 * Get appointment statistics for doctor
 */
export const getDoctorStats = async (req, res) => {
    try {
        const { doctorWallet } = req.params;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's stats
        const todayAppointments = await Appointment.count({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                appointmentDate: {
                    [db.Sequelize.Op.between]: [today, tomorrow]
                }
            }
        });

        const completedToday = await Appointment.count({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                appointmentDate: {
                    [db.Sequelize.Op.between]: [today, tomorrow]
                },
                status: 'completed'
            }
        });

        const pendingApprovals = await Appointment.count({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                requiresApproval: true,
                approvalStatus: 'pending'
            }
        });

        const checkedInPatients = await Appointment.count({
            where: {
                doctorWalletAddress: doctorWallet.toLowerCase(),
                appointmentDate: {
                    [db.Sequelize.Op.between]: [today, tomorrow]
                },
                checkInStatus: {
                    [db.Sequelize.Op.in]: ['checked_in', 'waiting']
                }
            }
        });

        console.log('📊 Doctor Stats:', {
            doctor: doctorWallet,
            todayTotal: todayAppointments,
            pendingApprovals,
            checkedInPatients
        });

        res.json({
            success: true,
            data: {
                todayTotal: todayAppointments,
                completedToday,
                pendingApprovals,
                checkedInPatients
            }
        });
    } catch (error) {
        console.error('❌ Get doctor stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch doctor statistics',
            message: error.message
        });
    }
};
