module.exports = {
  skipFiles: ['mocks/', 'test/'],
  configureYulOptimizer: true,
  mocha: {
    grep: "@gas", // Find and skip @gas tests
    invert: true  // Run everything else
  }
};