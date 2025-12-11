import db from '../models/index.js';
const { User, Patient, Doctor, Pharmacist } = db;

/**
 * Get all users with their profiles
 */
export const getAllUsers = async (req, res) => {
  try {
    console.log('🔍 Admin: Fetching all users...');

    const users = await User.findAll({
      attributes: ['walletAddress', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${users.length} users`);

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
};

/**
 * Get user by wallet address
 */
export const getUserByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const normalizedWallet = walletAddress.toLowerCase().trim();

    console.log('🔍 Admin: Fetching user:', normalizedWallet);

    const user = await User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
        normalizedWallet
      )
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `No user found with wallet: ${normalizedWallet}`
      });
    }

    // Get role-specific profile
    let profile = null;
    switch (user.role) {
      case 'patient':
        profile = await Patient.findOne({ where: { walletAddress: user.walletAddress } });
        break;
      case 'doctor':
        profile = await Doctor.findOne({ where: { walletAddress: user.walletAddress } });
        break;
      case 'pharmacist':
        profile = await Pharmacist.findOne({ where: { walletAddress: user.walletAddress } });
        break;
    }

    res.json({
      success: true,
      data: {
        user,
        profile,
        hasProfile: !!profile
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
};

/**
 * Update user status (activate/deactivate)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { isActive } = req.body;
    const normalizedWallet = walletAddress.toLowerCase().trim();

    console.log('🔄 Admin: Updating user status:', normalizedWallet, 'to', isActive);

    const user = await User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
        normalizedWallet
      )
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.update({ isActive });

    console.log('✅ User status updated');

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    console.error('❌ Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      message: error.message
    });
  }
};

/**
 * Delete user and associated profile
 */
export const deleteUser = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { walletAddress } = req.params;
    const normalizedWallet = walletAddress.toLowerCase().trim();

    console.log('🗑️ Admin: Deleting user:', normalizedWallet);

    const user = await User.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
        normalizedWallet
      ),
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete role-specific profile (cascade should handle this, but being explicit)
    switch (user.role) {
      case 'patient':
        await Patient.destroy({ where: { walletAddress: user.walletAddress }, transaction });
        break;
      case 'doctor':
        await Doctor.destroy({ where: { walletAddress: user.walletAddress }, transaction });
        break;
      case 'pharmacist':
        await Pharmacist.destroy({ where: { walletAddress: user.walletAddress }, transaction });
        break;
    }

    await user.destroy({ transaction });
    await transaction.commit();

    console.log('✅ User deleted successfully');

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
};

/**
 * Get system statistics
 */
export const getSystemStats = async (req, res) => {
  try {
    console.log('📊 Admin: Fetching system statistics...');

    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalPharmacists,
      activeUsers,
      recentUsers
    ] = await Promise.all([
      User.count(),
      Patient.count(),
      Doctor.count(),
      Pharmacist.count(),
      User.count({ where: { isActive: true } }),
      User.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['walletAddress', 'email', 'role', 'createdAt']
      })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        roles: {
          patients: totalPatients,
          doctors: totalDoctors,
          pharmacists: totalPharmacists
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('❌ Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics',
      message: error.message
    });
  }
};

/**
 * Get audit logs (recent user activities)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { limit = 50, action, userWallet } = req.query;

    console.log('📋 Admin: Fetching audit logs...');

    // For now, return recent user registrations and updates as audit logs
    // In a production system, you'd have a dedicated audit_logs table
    const where = {};
    if (userWallet) {
      where.walletAddress = userWallet.toLowerCase();
    }

    const recentUsers = await User.findAll({
      where,
      limit: parseInt(limit),
      order: [['updatedAt', 'DESC']],
      attributes: ['walletAddress', 'email', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    // Format as audit logs
    const auditLogs = recentUsers.map(user => ({
      id: `log-${user.walletAddress}-${user.updatedAt.getTime()}`,
      timestamp: user.updatedAt,
      action: user.createdAt.getTime() === user.updatedAt.getTime() ? 'USER_REGISTERED' : 'USER_UPDATED',
      userWallet: user.walletAddress,
      userRole: user.role,
      details: {
        email: user.email,
        isActive: user.isActive
      }
    }));

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      message: 'Note: This is a simplified audit log. For production, implement a dedicated audit_logs table.'
    });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
};

/**
 * Register a new doctor
 */
export const registerDoctor = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { email, password, fullName, phoneNumber, walletAddress, specialization, licenseNumber } = req.body;

    console.log('👨‍⚕️ Admin: Registering doctor:', email);

    // Validate required fields
    if (!email || !password || !fullName || !specialization || !licenseNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email, password, fullName, specialization, and licenseNumber are required'
      });
    }

    // Generate wallet if not provided
    const finalWallet = walletAddress || `0x${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Check for existing user
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email is already registered'
      });
    }

    // Create user
    const user = await User.create({
      walletAddress: finalWallet.toLowerCase(),
      email: email.toLowerCase(),
      role: 'doctor',
      isActive: true,
      profileData: {
        fullName,
        phone: phoneNumber || '',
        password // Store temporarily for email notification
      }
    }, { transaction });

    // Create doctor profile
    const doctor = await Doctor.create({
      walletAddress: finalWallet.toLowerCase(),
      specialization,
      licenseNumber,
      department: specialization, // Use specialization as department
      isAvailable: true,
      isAcceptingPatients: true,
      availableServices: {
        inPerson: { available: true, fee: 0 },
        videoCall: { available: true, fee: 500 },
        chat: { available: true, fee: 300 }
      }
    }, { transaction });

    await transaction.commit();

    console.log('✅ Doctor registered successfully:', user.email);

    res.status(201).json({
      success: true,
      message: 'Doctor registered successfully',
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          fullName
        },
        doctor: {
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber
        },
        credentials: {
          email: user.email,
          temporaryPassword: password
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Register doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register doctor',
      message: error.message
    });
  }
};

/**
 * Register a new lab technician
 */
export const registerLabTechnician = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { email, password, fullName, phoneNumber, walletAddress, department } = req.body;

    console.log('🔬 Admin: Registering lab technician:', email);

    // Validate required fields
    if (!email || !password || !fullName || !department) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email, password, fullName, and department are required'
      });
    }

    // Generate wallet if not provided
    const finalWallet = walletAddress || `0x${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Check for existing user
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email is already registered'
      });
    }

    // Create user
    const user = await User.create({
      walletAddress: finalWallet.toLowerCase(),
      email: email.toLowerCase(),
      role: 'lab_technician',
      isActive: true,
      profileData: {
        fullName,
        phone: phoneNumber || '',
        department,
        password
      }
    }, { transaction });

    await transaction.commit();

    console.log('✅ Lab technician registered successfully:', user.email);

    res.status(201).json({
      success: true,
      message: 'Lab technician registered successfully',
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          fullName,
          department
        },
        credentials: {
          email: user.email,
          temporaryPassword: password
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Register lab technician error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register lab technician',
      message: error.message
    });
  }
};

/**
 * Register a new pharmacist
 */
export const registerPharmacist = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { email, password, fullName, phoneNumber, walletAddress, licenseNumber } = req.body;

    console.log('💊 Admin: Registering pharmacist:', email);

    // Validate required fields
    if (!email || !password || !fullName || !licenseNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email, password, fullName, and licenseNumber are required'
      });
    }

    // Generate wallet if not provided
    const finalWallet = walletAddress || `0x${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Check for existing user
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email is already registered'
      });
    }

    // Create user
    const user = await User.create({
      walletAddress: finalWallet.toLowerCase(),
      email: email.toLowerCase(),
      role: 'pharmacist',
      isActive: true,
      profileData: {
        fullName,
        phone: phoneNumber || '',
        password
      }
    }, { transaction });

    // Create pharmacist profile
    const pharmacist = await Pharmacist.create({
      walletAddress: finalWallet.toLowerCase(),
      licenseNumber
    }, { transaction });

    await transaction.commit();

    console.log('✅ Pharmacist registered successfully:', user.email);

    res.status(201).json({
      success: true,
      message: 'Pharmacist registered successfully',
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          fullName
        },
        pharmacist: {
          licenseNumber: pharmacist.licenseNumber
        },
        credentials: {
          email: user.email,
          temporaryPassword: password
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Register pharmacist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register pharmacist',
      message: error.message
    });
  }
};

/**
 * Update all doctors with available services (migration helper)
 */
export const updateAllDoctorServices = async (req, res) => {
  try {
    console.log('🔧 Updating all doctors with available services...');

    const doctors = await Doctor.findAll();
    let updatedCount = 0;

    for (const doctor of doctors) {
      await doctor.update({
        department: doctor.department || doctor.specialization || 'General Practice',
        isAvailable: true,
        isAcceptingPatients: true,
        availableServices: {
          inPerson: { available: true, fee: 0 },
          videoCall: { available: true, fee: 500 },
          chat: { available: true, fee: 300 }
        }
      });
      updatedCount++;
    }

    console.log(`✅ Updated ${updatedCount} doctors`);

    res.json({
      success: true,
      message: `Updated ${updatedCount} doctors with available services`,
      data: {
        updatedCount,
        services: {
          inPerson: { available: true, fee: 0 },
          videoCall: { available: true, fee: 500 },
          chat: { available: true, fee: 300 }
        }
      }
    });

  } catch (error) {
    console.error('❌ Update doctor services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update doctor services',
      message: error.message
    });
  }
};

/**
 * Register staff member (alias for specific registration functions)
 */
export const registerStaff = async (req, res) => {
  try {
    const { role } = req.body;

    // Route to specific registration function based on role
    switch (role) {
      case 'doctor':
        return await registerDoctor(req, res);
      case 'pharmacist':
        return await registerPharmacist(req, res);
      case 'lab_technician':
        return await registerLabTechnician(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Role must be doctor, pharmacist, or lab_technician'
        });
    }
  } catch (error) {
    console.error('❌ Register staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register staff member',
      message: error.message
    });
  }
};

/**
 * Get analytics data
 */
export const getAnalytics = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    console.log('📊 Admin: Fetching analytics data for:', timeRange);

    // Get basic user counts
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const patientCount = await User.count({ where: { role: 'patient' } });
    const doctorCount = await User.count({ where: { role: 'doctor' } });
    const pharmacistCount = await User.count({ where: { role: 'pharmacist' } });

    // Mock user growth data (in production, this would be real data)
    const userGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      userGrowth.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(totalUsers * (0.7 + (6 - i) * 0.05))
      });
    }

    // Mock appointment statistics
    const appointmentStats = {
      total: Math.floor(totalUsers * 1.5),
      completed: Math.floor(totalUsers * 1.2),
      cancelled: Math.floor(totalUsers * 0.1),
      pending: Math.floor(totalUsers * 0.2)
    };

    console.log('✅ Analytics data fetched successfully');

    res.json({
      success: true,
      data: {
        userGrowth,
        appointmentStats,
        systemUsage: {
          dailyActiveUsers: Math.floor(activeUsers * 0.3),
          totalSessions: Math.floor(activeUsers * 2.5),
          averageSessionTime: 12
        },
        userCounts: {
          total: totalUsers,
          active: activeUsers,
          patients: patientCount,
          doctors: doctorCount,
          pharmacists: pharmacistCount
        }
      }
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      message: error.message
    });
  }
};