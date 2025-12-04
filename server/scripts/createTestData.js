// backend/scripts/createTestData.js
import { User, Appointment, FileMetadata, Payment } from '../models/index.js';

const createTestData = async () => {
  try {
    console.log('🧪 Creating test data...');

    // Create test users
    const patient = await User.create({
      email: 'patient@elitetena.com',
      password: 'securepassword123',
      role: 'patient',
      name: 'Test Patient',
      walletAddress: '0x742E4C2F4C4D2F4C4D2F4C4D2F4C4D2F4C4D2F4C4D'
    });

    const doctor = await User.create({
      email: 'doctor@elitetena.com', 
      password: 'securepassword123',
      role: 'doctor',
      name: 'Dr. Test Doctor',
      specialization: 'Cardiology'
    });

    // Create test appointment
    const appointment = await Appointment.create({
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'scheduled',
      notes: 'Regular checkup'
    });

    // Create test file metadata
    const file = await FileMetadata.create({
      userId: patient.id,
      fileName: 'medical_report.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      ipfsHash: 'QmTestHash123456789',
      description: 'Medical test results'
    });

    // Create test payment
    const payment = await Payment.create({
      userId: patient.id,
      amount: 150.00,
      currency: 'ETB',
      status: 'completed',
      paymentMethod: 'chapa',
      transactionId: 'chapa_txn_123456'
    });

    console.log('✅ Test data created successfully!');
    console.log(`   Patient: ${patient.email}`);
    console.log(`   Doctor: ${doctor.name}`);
    console.log(`   Appointment: ${appointment.id}`);
    console.log(`   Files: ${file.fileName}`);
    console.log(`   Payments: ${payment.transactionId}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData();
}

export default createTestData;