export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 30000, // 30 seconds for database operations
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  transformIgnorePatterns: [
    'node_modules/(?!(fast-check)/)'
  ]
};