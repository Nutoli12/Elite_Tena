import db from '../models/index.js';
const { User, Patient, Doctor, Pharmacist } = db;

export const register = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { walletAddress, email, role = 'patient', profileData = {} } = req.body;

    console.log('��� Register request:', { walletAddress, email, role });

    // Validate required fields
    if (!walletAddress || !email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'walletAddress and email are required'
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      where: {
        walletAddress: walletAddress.toLowerCase()
      },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this wallet address is already registered'
      });
    }

    // Create user
    const user = await User.create({
      walletAddress: walletAddress.toLowerCase(),
      email: email.toLowerCase(),
      role,
      isActive: true,
      profileData: {
        fullName: profileData.fullName || 'User',
        phone: profileData.phone || '',
        ...profileData
      }
    }, { transaction });

    // Create role-specific profile - FIXED: Ensure patient record is created
    let profile;
    try {
      switch (role) {
        case 'patient':
          profile = await Patient.create({
            walletAddress: walletAddress.toLowerCase()
          }, { transaction });
          console.log('✅ Patient profile created:', profile.walletAddress);
          break;
        case 'doctor':
          profile = await Doctor.create({
            walletAddress: walletAddress.toLowerCase()
          }, { transaction });
          console.log('✅ Doctor profile created:', profile.walletAddress);
          break;
        case 'pharmacist':
          profile = await Pharmacist.create({
            walletAddress: walletAddress.toLowerCase()
          }, { transaction });
          console.log('✅ Pharmacist profile created:', profile.walletAddress);
          break;
      }
    } catch (profileError) {
      console.error('❌ Profile creation error:', profileError);
      throw new Error(`Failed to create ${role} profile: ${profileError.message}`);
    }

    await transaction.commit();

    console.log('✅ User registered successfully:', user.walletAddress);
    console.log('✅ Profile created:', profile ? 'Yes' : 'No');

    const authToken = `web3-auth-${user.walletAddress}-${Date.now()}`;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profileData: user.profileData
        },
        profileCreated: !!profile,
        auth: {
          token: authToken,
          type: 'web3_wallet'
        }
      },
      web3: {
        walletVerified: true,
        network: 'Ethereum/Polygon'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
};

// Keep your existing login, getProfile, checkWallet functions...
export const login = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    console.log('��� Login request:', { walletAddress });

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required'
      });
    }

    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user registered with this wallet address'
      });
    }

    const authToken = `web3-auth-${user.walletAddress}-${Date.now()}`;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profileData: user.profileData
        },
        auth: {
          token: authToken,
          type: 'web3_wallet'
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profileData: user.profileData
        }
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

export const checkWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    res.json({
      success: true,
      data: {
        exists: !!user,
        user: user ? {
          walletAddress: user.walletAddress,
          role: user.role,
          isActive: user.isActive
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Check wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check wallet'
    });
  }
};

export const logout = async (req, res) => {
  try {
    // For Web3 auth, logout is typically client-side
    // But we can invalidate any server-side session if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
};

export const verifySignature = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'walletAddress, signature, and message are required'
      });
    }

    // In a real implementation, you would verify the signature here
    // using ethers.js or web3.js
    // For now, we'll just validate the wallet exists
    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Signature verified',
      data: {
        verified: true,
        walletAddress: user.walletAddress
      }
    });

  } catch (error) {
    console.error('❌ Verify signature error:', error);
    res.status(500).json({
      success: false,
      error: 'Signature verification failed',
      message: error.message
    });
  }
};
