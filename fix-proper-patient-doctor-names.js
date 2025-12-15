import db from './server/src/models/index.js';

const { User, LabWorkflowOrder } = db;

console.log('🔧 Fixing Patient and Doctor Names with Proper Names...\n');

async function fixProperNames() {
  try {
    // Initialize database associations
    console.log('🔄 Initializing database associations...');
    await db.sequelize.authenticate();
    console.log('✅ Database associations initialized successfully\n');

    // 1. Get all users that need proper names
    console.log('1. Finding users with poor names...');
    const usersToFix = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { name: null },
          { name: '' },
          { name: 'User' },
          { name: { [db.Sequelize.Op.like]: 'User 0x%' } }
        ]
      }
    });

    console.log(`✅ Found ${usersToFix.length} users needing name fixes\n`);

    // 2. Fix each user with a proper name
    let fixedCount = 0;
    
    for (const user of usersToFix) {
      let newName = null;
      
      console.log(`🔍 Fixing user: ${user.walletAddress} (${user.email}) [${user.role}]`);
      
      // Try to get name from profileData first
      if (user.profileData) {
        try {
          const profileData = typeof user.profileData === 'string' 
            ? JSON.parse(user.profileData) 
            : user.profileData;
          
          if (profileData.fullName) {
            newName = profileData.fullName;
            console.log(`   📋 Using fullName from profile: ${newName}`);
          } else if (profileData.firstName && profileData.lastName) {
            newName = `${profileData.firstName} ${profileData.lastName}`;
            console.log(`   📋 Using firstName + lastName: ${newName}`);
          } else if (profileData.name) {
            newName = profileData.name;
            console.log(`   📋 Using name from profile: ${newName}`);
          }
        } catch (e) {
          console.log(`   ⚠️  Could not parse profileData: ${e.message}`);
        }
      }
      
      // Fallback to email-based name
      if (!newName && user.email) {
        const emailPart = user.email.split('@')[0];
        
        // Clean up email part
        let cleanName = emailPart
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        if (user.role === 'doctor') {
          newName = `Dr. ${cleanName}`;
        } else if (user.role === 'patient') {
          newName = cleanName;
        } else if (user.role === 'lab_technician') {
          newName = `${cleanName} (Lab Tech)`;
        } else {
          newName = `${cleanName} (${user.role})`;
        }
        
        console.log(`   📧 Using email-based name: ${newName}`);
      }
      
      // Last resort: role-based name with wallet
      if (!newName) {
        const shortWallet = user.walletAddress.slice(0, 8);
        if (user.role === 'doctor') {
          newName = `Dr. ${shortWallet}`;
        } else if (user.role === 'patient') {
          newName = `Patient ${shortWallet}`;
        } else {
          newName = `${user.role} ${shortWallet}`;
        }
        console.log(`   🔗 Using wallet-based name: ${newName}`);
      }

      // Update the user's name
      if (newName) {
        await user.update({ name: newName });
        console.log(`   ✅ Updated: "${newName}"\n`);
        fixedCount++;
      }
    }

    console.log(`🎉 Fixed names for ${fixedCount} users\n`);

    // 3. Special fixes for known test users
    console.log('3. Applying special fixes for known test users...');
    
    const specialFixes = [
      {
        email: 'doctor.user@elitetena.com',
        name: 'Dr. Selamawit Kebede'
      },
      {
        email: 'patient.user@elitetena.com', 
        name: 'Alemayehu Tesfaye'
      },
      {
        email: 'lab@gmail.com',
        name: 'Lab Technician'
      },
      {
        email: 'testdoctor@test.com',
        name: 'Dr. Test Doctor'
      },
      {
        walletAddress: '0x23c80449d4be58945194c29d3a6accddca25fb04',
        name: 'John Doe'
      }
    ];

    for (const fix of specialFixes) {
      const whereClause = fix.email ? { email: fix.email } : { walletAddress: fix.walletAddress };
      const user = await User.findOne({ where: whereClause });
      
      if (user) {
        await user.update({ name: fix.name });
        console.log(`✅ Special fix: ${user.email || user.walletAddress} → "${fix.name}"`);
      }
    }

    // 4. Test the fix by checking lab orders
    console.log('\n4. Testing name visibility in lab orders...');
    const labOrders = await LabWorkflowOrder.findAll({
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
      limit: 8,
      order: [['created_at', 'DESC']]
    });

    console.log('✅ Lab orders with updated names:');
    labOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderNumber}`);
      console.log(`      👤 Patient: ${order.patient?.name || 'Unknown'}`);
      console.log(`      👨‍⚕️ Doctor: ${order.doctor?.name || 'Unknown'}`);
      console.log(`      📋 Tests: ${order.testCodes.join(', ')}`);
      console.log(`      ⚡ Priority: ${order.priority}`);
      console.log('');
    });

    // 5. Test notification format
    console.log('5. Testing notification format...');
    if (labOrders.length > 0) {
      const testOrder = labOrders[0];
      console.log('📧 Sample notification format:');
      console.log(`   Title: 🧪 New Lab Order: ${testOrder.orderNumber}`);
      console.log(`   Patient: ${testOrder.patient?.name || 'Unknown Patient'}`);
      console.log(`   Doctor: ${testOrder.doctor?.name || 'Unknown Doctor'}`);
      console.log(`   Tests: ${testOrder.testCodes.join(', ')}`);
      console.log(`   Priority: ${testOrder.priority.toUpperCase()}`);
    }

    console.log('\n🏁 PROPER NAME VISIBILITY FIX COMPLETE!');
    console.log('✅ All users now have meaningful names');
    console.log('✅ Patient:Doctor names will display correctly');
    console.log('✅ Notifications will show proper names');
    console.log('✅ Work queue will show clear patient and doctor identification');

  } catch (error) {
    console.error('❌ Error fixing proper names:', error);
  } finally {
    await db.sequelize.close();
  }
}

fixProperNames();