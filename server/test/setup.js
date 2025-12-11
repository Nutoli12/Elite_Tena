/**
 * Jest setup file for database testing
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';

// Override database URL for testing if needed
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://admin:password@localhost:5432/elitetena';
}