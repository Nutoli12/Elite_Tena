import db from "../models/index.js";
const { Doctor, User, Appointment } = db;

/**
 * 🆕 PHASE 2: Get all doctors with filtering
 */
export const getDoctors = async (req, res) => {
  try {
    const { 
      department, 
      available, 
      acceptingPatients, 
      search,
      serviceType 
    } = req.query;

    console.log('🔍 Fetching doctors with filters:', { department, available, acceptingPatients, search });

    const where = {};

    // Filter by department
    if (department) {
      where.department = department;
    }

    // Filter by availability
    if (available === 'true') {
      where.isAvailable = true;
    }

    // Filter by accepting patients
    if (acceptingPatients === 'true') {
      where.isAcceptingPatients = true;
    }

    // Search by name (through User model)
    const include = [{
      model: User,
      as: 'user',
      attributes: ['email', 'profileData', 'role'],
      required: false
    }];

    const doctors = await Doctor.findAll({
      where,
      include,
      order: [['rating', 'DESC'], ['reviewCount', 'DESC']]
    });

    // Filter by service type if specified
    let filteredDoctors = doctors;
    if (serviceType) {
      filteredDoctors = doctors.filter(doctor => {
        const services = doctor.availableServices || {};
        return services[serviceType]?.available === true;
      });
    }

    // Search filter (by name in profileData)
    if (search) {
      filteredDoctors = filteredDoctors.filter(doctor => {
        const fullName = doctor.user?.profileData?.fullName || '';
        return fullName.toLowerCase().includes(search.toLowerCase());
      });
    }

    console.log(`✅ Found ${filteredDoctors.length} doctors`);

    res.json({
      success: true,
      data: filteredDoctors,
      count: filteredDoctors.length,
      filters: { department, available, acceptingPatients, search, serviceType }
    });

  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors',
      message: error.message
    });
  }
};

/**
 * Get individual doctor by ID or wallet address
 */
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    let doctor;
    
    // Clean the wallet address - remove newlines and trim
    const cleanId = id.trim().replace(/\n/g, '');
    
    console.log('🔍 Fetching doctor:', cleanId);

    // Check if it's a wallet address (starts with 0x)
    if (cleanId.startsWith('0x')) {
      // Use case-insensitive search for wallet addresses
      doctor = await Doctor.findOne({ 
        where: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
          db.sequelize.fn('LOWER', cleanId)
        ),
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'profileData', 'role', 'createdAt']
        }]
      });
    } else {
      doctor = await Doctor.findByPk(cleanId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'profileData', 'role', 'createdAt']
        }]
      });
    }
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found',
        message: `No doctor found with ID/wallet: ${cleanId}`
      });
    }

    // Get doctor's appointment statistics
    const appointmentStats = await Appointment.count({
      where: { doctorWalletAddress: doctor.walletAddress }
    });

    console.log('✅ Doctor found');
    
    res.json({
      success: true,
      data: {
        ...doctor.toJSON(),
        appointmentCount: appointmentStats
      }
    });
    
  } catch (error) {
    console.error('❌ Get doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 2: Get doctors by department
 */
export const getDoctorsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    console.log('🔍 Fetching doctors in department:', department);

    const doctors = await Doctor.findAll({
      where: {
        department,
        isAvailable: true,
        isAcceptingPatients: true
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'profileData']
      }],
      order: [['rating', 'DESC']]
    });

    console.log(`✅ Found ${doctors.length} doctors in ${department}`);

    res.json({
      success: true,
      data: doctors,
      count: doctors.length,
      department
    });

  } catch (error) {
    console.error('❌ Get doctors by department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 2: Get available departments
 */
export const getDepartments = async (req, res) => {
  try {
    console.log('🔍 Fetching available departments');

    // Get unique departments from doctors table
    const departments = await Doctor.findAll({
      attributes: [
        [db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']
      ],
      where: {
        isAvailable: true
      },
      raw: true
    });

    const departmentList = departments.map(d => d.department).filter(Boolean);

    // Add standard departments if not in database
    const standardDepartments = [
      'Cardiology',
      'Dermatology',
      'Pediatrics',
      'Internal Medicine',
      'Surgery',
      'Orthopedics',
      'Neurology',
      'Psychiatry',
      'Obstetrics & Gynecology',
      'Ophthalmology',
      'ENT (Ear, Nose, Throat)',
      'General Practice'
    ];

    const allDepartments = [...new Set([...departmentList, ...standardDepartments])].sort();

    console.log(`✅ Found ${allDepartments.length} departments`);

    res.json({
      success: true,
      data: allDepartments,
      count: allDepartments.length
    });

  } catch (error) {
    console.error('❌ Get departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      message: error.message
    });
  }
};

/**
 * Create a new doctor (admin only)
 */
export const createDoctor = async (req, res) => {
  try {
    const doctorData = req.body;

    console.log('📝 Creating doctor:', doctorData.walletAddress);

    const doctor = await Doctor.create(doctorData);

    console.log('✅ Doctor created successfully');

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor
    });

  } catch (error) {
    console.error('❌ Create doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create doctor',
      message: error.message
    });
  }
};

/**
 * Update doctor information
 */
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating doctor:', id);

    const doctor = await Doctor.findByPk(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    await doctor.update(updates);

    console.log('✅ Doctor updated successfully');

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });

  } catch (error) {
    console.error('❌ Update doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update doctor',
      message: error.message
    });
  }
};

/**
 * Delete doctor
 */
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting doctor:', id);

    const doctor = await Doctor.findByPk(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    await doctor.destroy();

    console.log('✅ Doctor deleted successfully');

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete doctor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete doctor',
      message: error.message
    });
  }
};
