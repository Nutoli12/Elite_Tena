import db from '../models/index.js';

const { User, Session } = db;

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const walletAddress = req.headers['x-wallet-address'];
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Wallet address required',
        message: 'Please provide wallet address in x-wallet-address header'
      });
    }

    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'No user registered with this wallet address'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account deactivated',
        message: 'This account has been deactivated'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔍 Role check:', {
      user: req.user?.walletAddress,
      userRole: req.user?.role,
      requiredRoles: roles
    });
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${roles.join(', ')}`,
        userRole: req.user.role
      });
    }

    next();
  };
};

// duplicate requireRole removed — use the earlier requireRole implementation above
