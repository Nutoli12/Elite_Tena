const axios = require('axios');

async function testEnhancedAppointmentDisplay() {
  console.log('🧪 Testing Enhanced Appointment Display System...\n');

  try {
    // Test 1: Fetch appointments with enhanced patient data
    console.log('1️⃣ Testing appointment fetch with enhanced patient information...');
    
    const response = await axios.get('http://localhost:3001/api/appointments', {
      params: {
        userRole: 'doctor',
        userId: '0x17653745c2e5b8a54b5b3d4c8f9e2a1b3c4d5e6f' // Sample doctor wallet
      }
    });

    if (response.data.success) {
      const appointments = response.data.data;
      console.log(`✅ Fetched ${appointments.length} appointments`);
      
      // Check if patient information is properly included
      appointments.forEach((apt, index) => {
        console.log(`\n📋 Appointment ${index + 1}:`);
        console.log(`   Patient Wallet: ${apt.patientWalletAddress}`);
        console.log(`   Patient Name: ${apt.patientDetails?.name || 'Not set'}`);
        console.log(`   Patient User Data: ${apt.patientDetails?.user?.profileData?.fullName || 'Not available'}`);
        console.log(`   Patient Age: ${apt.patientDetails?.dateOfBirth ? 
          Math.floor((new Date() - new Date(apt.patientDetails.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'} years`);
        console.log(`   Blood Type: ${apt.patientDetails?.bloodType || 'Unknown'}`);
        console.log(`   Allergies: ${apt.patientDetails?.allergies?.join(', ') || 'None listed'}`);
        console.log(`   Current Medications: ${apt.patientDetails?.currentMedications?.join(', ') || 'None listed'}`);
        console.log(`   Reason: ${apt.reason || 'General consultation'}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Workflow State: ${apt.workflowState || 'Not set'}`);
        console.log(`   Check-in Status: ${apt.checkInStatus || 'Not checked in'}`);
        console.log(`   Service Type: ${apt.serviceType}`);
        console.log(`   Fee: ${apt.fee} Birr`);
        
        if (apt.vitalSigns) {
          console.log(`   Vital Signs: ${JSON.stringify(apt.vitalSigns)}`);
        }
        
        if (apt.checkedInAt) {
          const waitTime = Math.floor((new Date() - new Date(apt.checkedInAt)) / (1000 * 60));
          console.log(`   Wait Time: ${waitTime} minutes`);
        }
      });
      
      // Test urgency level calculation
      console.log('\n2️⃣ Testing urgency level detection...');
      appointments.forEach((apt, index) => {
        const reason = apt.reason?.toLowerCase() || '';
        let urgency = 'low';
        let urgencyLabel = '✅ Routine';
        
        if (reason.includes('emergency') || reason.includes('urgent') || reason.includes('chest pain')) {
          urgency = 'high';
          urgencyLabel = '🚨 Emergency';
        } else if (reason.includes('pain') || reason.includes('fever') || reason.includes('bleeding')) {
          urgency = 'medium';
          urgencyLabel = '⚠️ Moderate';
        }
        
        console.log(`   Appointment ${index + 1}: ${urgencyLabel} (${apt.reason || 'No reason'})`);
      });
      
      // Test queue organization
      console.log('\n3️⃣ Testing queue organization...');
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointments.filter(apt => apt.appointmentDate.startsWith(today));
      
      const currentConsultation = todayAppointments.find(apt => 
        apt.workflowState === 'consultation_started' || apt.workflowState === 'video_call_active'
      );
      
      const waitingPatients = todayAppointments
        .filter(apt => apt.checkInStatus === 'checked_in' || apt.checkInStatus === 'waiting')
        .sort((a, b) => new Date(a.checkedInAt || a.appointmentDate) - new Date(b.checkedInAt || b.appointmentDate));
      
      const upcomingPatients = todayAppointments
        .filter(apt => !apt.checkInStatus || apt.checkInStatus === 'not_checked_in')
        .filter(apt => new Date(apt.appointmentDate) > new Date())
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
      
      console.log(`   Today's appointments: ${todayAppointments.length}`);
      console.log(`   Current consultation: ${currentConsultation ? 'Yes' : 'None'}`);
      console.log(`   Waiting patients: ${waitingPatients.length}`);
      console.log(`   Upcoming patients: ${upcomingPatients.length}`);
      
      if (currentConsultation) {
        console.log(`   🟢 Currently consulting: ${currentConsultation.patientDetails?.name || 'Unknown Patient'}`);
      }
      
      waitingPatients.forEach((apt, index) => {
        const waitTime = apt.checkedInAt ? 
          Math.floor((new Date() - new Date(apt.checkedInAt)) / (1000 * 60)) : 0;
        console.log(`   🟡 Queue #${index + 1}: ${apt.patientDetails?.name || 'Unknown Patient'} (waiting ${waitTime} min)`);
      });
      
      upcomingPatients.slice(0, 3).forEach((apt, index) => {
        console.log(`   ⚪ Upcoming: ${apt.patientDetails?.name || 'Unknown Patient'} at ${new Date(apt.appointmentDate).toLocaleTimeString()}`);
      });
      
    } else {
      console.log('❌ Failed to fetch appointments:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEnhancedAppointmentDisplay();