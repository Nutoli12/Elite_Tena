import sequelize from './config/db.js';
import User from '../models/user.js';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!');
    
    // Test creating a user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'patient'
    });
    console.log('✅ User created:', user.toJSON());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

test();
