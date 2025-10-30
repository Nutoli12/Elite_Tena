import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('‚úÖ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('‚ùå Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
export const initializeDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Ì¥Ñ Initializing database tables...');

    // Users table (complements blockchain data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'patient',
        specialization VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // User sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `);

    // Medical file metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        cid VARCHAR(100) UNIQUE NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_type VARCHAR(100),
        description TEXT,
        encrypted_metadata JSONB,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    `);

    // Appointments table (caches blockchain data for performance)
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        blockchain_appointment_id INTEGER,
        patient_wallet VARCHAR(42) NOT NULL,
        doctor_wallet VARCHAR(42) NOT NULL,
        appointment_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        fee_eth DECIMAL(18, 8),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_wallet) REFERENCES users(wallet_address),
        FOREIGN KEY (doctor_wallet) REFERENCES users(wallet_address)
      )
    `);

    // System logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        wallet_address VARCHAR(42),
        action VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON user_sessions(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_files_wallet ON file_metadata(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_wallet);
      CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_wallet);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    `);

    console.log('‚úÖ Database tables initialized successfully');
    
    // Insert default admin user if not exists
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    if (adminWallet) {
      await client.query(`
        INSERT INTO users (wallet_address, role, specialization) 
        VALUES ($1, 'admin', 'System Administrator')
        ON CONFLICT (wallet_address) DO NOTHING
      `, [adminWallet]);
      console.log('‚úÖ Default admin user configured');
    }

  } catch (error) {
    console.error('‚ùå Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Export the pool for use in other files
export default pool;
