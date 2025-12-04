import db from '../models/index.js';
const { User, Patient, Doctor, Pharmacist, LabTechnician } = db;

export class RegistrationService {
  static async registerUser(userData, profileData = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // 1. Create User
      const user = await User.create({
        walletAddress: userData.walletAddress,
        email: userData.email,
        role: userData.role,
        fullName: userData.fullName,
        phone: userData.phone
      }, { transaction });

      // 2. Create Role-specific Profile
      let profile;
      switch (userData.role) {
        case 'patient':
          profile = await Patient.create({
            walletAddress: userData.walletAddress,
            ...profileData
          }, { transaction });
          break;
          
        case 'doctor':
          profile = await Doctor.create({
            walletAddress: userData.walletAddress,
            ...profileData
          }, { transaction });
          break;
          
        case 'pharmacist':
          profile = await Pharmacist.create({
            walletAddress: userData.walletAddress,
            ...profileData
          }, { transaction });
          break;
          
        case 'lab_technician':
          profile = await LabTechnician.create({
            walletAddress: userData.walletAddress,
            ...profileData
          }, { transaction });
          break;
      }

      await transaction.commit();
      
      return {
        success: true,
        user,
        profile
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}