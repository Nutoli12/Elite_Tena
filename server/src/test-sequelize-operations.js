import sequelize from './config/db.js';
import { User, Session, FileMetadata, Appointment } from './models/index.js';

async function testSequelizeOperations() {
  try {
    console.log('Ì∑™ TESTING SEQUELIZE OPERATIONS...\n');

    // 1. Test Database Connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('‚úÖ Database connected successfully');

    // 2. Test User Creation
    console.log('\n2. Creating test user...');
    const user = await User.create({
      walletAddress: '0xTestWallet' + Date.now(),
      role: 'patient',
      email: 'test' + Date.now() + '@elitetena.com',
      specialization: null
    });
    console.log('‚úÖ User created:', user.walletAddress);

    // 3. Test Session Creation
    console.log('\n3. Creating test session...');
    const session = await Session.create({
      walletAddress: user.walletAddress,
      tokenHash: 'test_token_' + Date.now(),
      role: user.role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    console.log('‚úÖ Session created for:', session.walletAddress);

    // 4. Test File Creation
    console.log('\n4. Creating test file metadata...');
    const file = await FileMetadata.create({
      cid: 'QmTestFile' + Date.now(),
      walletAddress: user.walletAddress,
      originalFilename: 'test_document.pdf',
      fileSize: 2048000,
      fileType: 'application/pdf',
      description: 'Test medical document'
    });
    console.log('‚úÖ File created:', file.originalFilename);

    // 5. Test Data Retrieval
    console.log('\n5. Testing data retrieval...');
    const foundUser = await User.findOne({
      where: { walletAddress: user.walletAddress },
      include: [Session, FileMetadata]
    });
    console.log('‚úÖ User retrieved with relations:');
    console.log('   - Sessions:', foundUser.Sessions.length);
    console.log('   - Files:', foundUser.FileMetadata.length);

    // 6. Test Counting
    console.log('\n6. Testing record counting...');
    const userCount = await User.count();
    const sessionCount = await Session.count();
    const fileCount = await FileMetadata.count();
    console.log(`Ì≥ä Total Users: ${userCount}`);
    console.log(`Ì≥ä Total Sessions: ${sessionCount}`);
    console.log(`Ì≥ä Total Files: ${fileCount}`);

    console.log('\nÌæâ ALL SEQUELIZE OPERATIONS COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('‚ùå Error during operations:', error);
  } finally {
    await sequelize.close();
  }
}

testSequelizeOperations();
