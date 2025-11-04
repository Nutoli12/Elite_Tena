const pool = require('../src/config/database.js');

const initDB = async () => {
  try {
    // Create users table
    await pool.query('
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
        specialization VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ');

    // Create file_metadata table
    await pool.query('
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        cid VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_type VARCHAR(100),
        description TEXT,
        encrypted_metadata TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      )
    ');

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
  } finally {
    await pool.end();
  }
};

initDB();
