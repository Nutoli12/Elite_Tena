// Web3 Error Handler Middleware
// This middleware catches Web3-related errors and prevents them from crashing the server

const web3ErrorHandler = (err, req, res, next) => {
  // Check if it's a Web3/Ethereum related error
  if (err.code === 'UNKNOWN_ERROR' || 
      err.message?.includes('filter not found') ||
      err.message?.includes('eth_getFilterChanges') ||
      err.message?.includes('could not coalesce error')) {
    
    console.warn('🔗 Web3 Error (handled gracefully):', err.message);
    
    // Don't send error response for Web3 errors - they're non-critical
    // Just log and continue
    return next();
  }

  // For other errors, pass to default error handler
  next(err);
};

module.exports = web3ErrorHandler;
