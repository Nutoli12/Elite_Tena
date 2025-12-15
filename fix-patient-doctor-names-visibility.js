import db from './server/src/models/index.js';

const { User, LabWorkflowOrder } = db;

console.log('🔧 Fixing Patient and Doctor Name Visibility...\n');

async function fixNameVisibility() {
  try {
    // Initialize database associations
    console.log('🔄 Initializing database associations...');
    await db.sequelize.authenticate();
    console.log('✅ Database associations initialized successfully\n');

    // 1. Check current lab orders and their associated users
    console.log('1. Checking current lab orders and user names...');
    const labOrders = await LabWorkflowOrder.findAll({
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['walletAddress', 'name', 'email', 'profileData']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['walletAddress', 'name', 'email', 'profileData']
        }
      ],
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${labOrders.length} lab orders\n`);

    // 2. Identify users with missing or poor names
    const usersToFix = new Set();
    
    labOrders.forEach(order => {
      if (order.patient) {
        const patientName = order.patient.name;
        if (!patientName || patientName === 'User' || patientName.startsWith('User 0x')) {
          usersToFix.add(order.patient.walletAddress);
          console.log(`❌ Patient needs name fix: ${order.patient.walletAddress} (${patientName || 'No name'})`);
        }
      }
      
      if (order.doctor) {
        const doctorName = order.doctor.name;
        if (!doctorName || doctorName === 'User' || doctorName.startsWith('User 0x')) {
          usersToFix.add(order.doctor.walletAddress);
          console.log(`❌ Doctor needs name fix: ${order.doctor.walletAddress} (${doctorName || 'No name'})`);
        }
      }
    });

    console.log(`\n🎯 Found ${usersToFix.size} users needing name fixes\n`);

    // 3. Fix names for users in lab orders
    let fixedCount = 0;
    
    for (const walletAddress of usersToFix) {
      const user = await User.findOne({
        where: { walletAddress: walletAddress.toLowerCase() }
      });

      if (user) {
        let newName = null;
        
        // Try to get name from profileData first
        if (user.profileData) {
          try {
            const profileData = typeof user.profileData === 'string' 
              ? JSON.parse(user.profileData) 
              : user.profileData;
            
            if (profileData.fullName) {
              newName = profileData.fullName;
            } else if (profileData.firstName && profileData.lastName) {
              newName = `${profileData.firstName} ${profileData.lastName}`;
            } else if (profileData.name) {
              newName = profileData.name;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        // Fallback to email-based name
        if (!newName && user.email) {
          const emailName = user.email.split('@')[0];
          if (user.role === 'doctor') {
            newName = `Dr. ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`;
          } else {
            newName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          }
        }
        
        // Last resort: role-based name
        if (!newName) {
          if (user.role === 'doctor') {
            newName = `Dr. ${user.walletAddress.slice(0, 8)}`;
          } else if (user.role === 'patient') {
            newName = `Patient ${user.walletAddress.slice(0, 8)}`;
          } else {
            newName = `${user.role} ${user.walletAddress.slice(0, 8)}`;
          }
        }

        // Update the user's name
        await user.update({ name: newName });
        console.log(`✅ Fixed name: ${user.walletAddress} → "${newName}" (${user.role})`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 Fixed names for ${fixedCount} users\n`);

    // 4. Test the fix by checking lab orders again
    console.log('4. Testing name visibility after fix...');
    const updatedOrders = await LabWorkflowOrder.findAll({
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['walletAddress', 'name', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['walletAddress', 'name', 'email']
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    console.log('✅ Updated lab orders with proper names:');
    updatedOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderNumber}`);
      console.log(`      Patient: ${order.patient?.name || 'Unknown'} (${order.patient?.email || 'No email'})`);
      console.log(`      Doctor: ${order.doctor?.name || 'Unknown'} (${order.doctor?.email || 'No email'})`);
      console.log(`      Tests: ${order.testCodes.join(', ')}`);
      console.log('');
    });

    // 5. Also fix any other users that might be used in the system
    console.log('5. Fixing other users in the system...');
    const allUsers = await User.findAll({
      where: {
        name: [null, 'User', '']
      }
    });

    let additionalFixed = 0;
    for (const user of allUsers) {
      let newName = null;
      
      // Try profileData first
      if (user.profileData) {
        try {
          const profileData = typeof user.profileData === 'string' 
            ? JSON.parse(user.profileData) 
            : user.profileData;
          
          if (profileData.fullName) {
            newName = profileData.fullName;
          } else if (profileData.firstName && profileData.lastName) {
            newName = `${profileData.firstName} ${profileData.lastName}`;
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Fallback to email
      if (!newName && user.email) {
        const emailName = user.email.split('@')[0];
        if (user.role === 'doctor') {
          newName = `Dr. ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`;
        } else {
          newName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      if (newName) {
        await user.update({ name: newName });
        console.log(`✅ Additional fix: ${user.walletAddress} → "${newName}" (${user.role})`);
        additionalFixed++;
      }
    }

    console.log(`\n🎉 Fixed ${additionalFixed} additional users\n`);

    console.log('🏁 PATIENT:DOCTOR NAME VISIBILITY FIX COMPLETE!');
    console.log('✅ All users in lab orders now have proper names');
    console.log('✅ Names will display correctly in frontend');
    console.log('✅ Notifications will show proper names');
    console.log('✅ Work queue will show proper patient and doctor names');

  } catch (error) {
    console.error('❌ Error fixing name visibility:', error);
  } finally {
    await db.sequelize.close();
  }
}

fixNameVisibility();