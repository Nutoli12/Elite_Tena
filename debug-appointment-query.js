/**
 * Debug the exact appointment query to see what data is being returned
 */

import db from './server/src/models/index.js';

const debugAppointmentQuery = async () => {
  try {
    console.log('🔍 Debugging appointment query structure...\n');

    const userWallet = '0x1764894943291khtk9h';
    
    // Test the exact query from the controller
    const appointments = await db.Appointment.findAll({
      where: {
        doctorWalletAddress: userWallet.toLowerCase()
      },
      include: [
        {
          model: db.Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress']
        },
        {
          model: db.Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'specialization']
        },
        {
          model: db.User,
          as: 'patient',
          required: false,
          attributes: ['email', 'profileData']
        },
        {
          model: db.User,
          as: 'doctor',
          required: false,
          attributes: ['email', 'profileData']
        }
      ],
      order: [['appointmentDate', 'ASC']],
      limit: 1
    });

    if (appointments.length > 0) {
      const appointment = appointments[0];
      console.log('📅 Raw appointment data:');
      console.log('Keys:', Object.keys(appointment.dataValues));
      
      console.log('\n👨‍⚕️ Doctor-related data:');
      console.log('doctorWalletAddress:', appointment.doctorWalletAddress);
      
      if (appointment.doctorDetails) {
        console.log('doctorDetails found:', {
          walletAddress: appointment.doctorDetails.walletAddress,
          specialization: appointment.doctorDetails.specialization
        });
      } else {
        console.log('❌ No doctorDetails');
      }
      
      if (appointment.doctor) {
        console.log('doctor found:', {
          email: appointment.doctor.email,
          profileData: appointment.doctor.profileData
        });
        
        const profileData = appointment.doctor.profileData;
        console.log('profileData type:', typeof profileData);
        console.log('profileData content:', JSON.stringify(profileData, null, 2));
        
        // Test name extraction
        const extractedName = profileData?.name || 
                             profileData?.fullName || 
                             (profileData?.firstName && profileData?.lastName 
                               ? `${profileData.firstName} ${profileData.lastName}` 
                               : profileData?.firstName || 'Unknown Doctor');
        
        console.log('✅ Extracted name:', extractedName);
      } else {
        console.log('❌ No doctor');
      }
      
      console.log('\n👤 Patient-related data:');
      console.log('patientWalletAddress:', appointment.patientWalletAddress);
      
      if (appointment.patientDetails) {
        console.log('patientDetails found:', {
          walletAddress: appointment.patientDetails.walletAddress
        });
      } else {
        console.log('❌ No patientDetails');
      }
      
      if (appointment.patient) {
        console.log('patient found:', {
          email: appointment.patient.email,
          profileData: appointment.patient.profileData
        });
      } else {
        console.log('❌ No patient');
      }
      
    } else {
      console.log('❌ No appointments found');
    }

  } catch (error) {
    console.error('❌ Error debugging appointment query:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugAppointmentQuery();