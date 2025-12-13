import db from '../models/index.js';
import { ethers } from 'ethers';
const { User, Patient, Doctor, Pharmacist } = db;

export const register = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { walletAddress, email, password, role = 'patient', profileData = {}, ...otherFields } = req.body;

    console.log('📝 Register request:', { walletAddress, email, role });
    console.log('📋 Profile data received:', profileData);
    console.log('📋 Other fields received:', otherFields);

    // Validate required fields - either wallet or email+password
    if (!email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email is required'
      });
    }

    // Generate wallet if not provided (for email-only registration)
    const finalWallet = walletAddress || `0x${Date.now()}${Math.random().toString(36).substring(7)}`;

    // Check for existing user by email
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase()
      },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email is already registered'
      });
    }

    // 🔧 ENHANCED: Create user with comprehensive profile data
    const user = await User.create({
      walletAddress: finalWallet.toLowerCase(),
      email: email.toLowerCase(),
      role,
      isActive: true,
      profileData: {
        // Basic Information - use otherFields if profileData is empty
        firstName: profileData.firstName || otherFields.firstName || '',
        lastName: profileData.lastName || otherFields.lastName || '',
        fullName: profileData.fullName || otherFields.fullName || `${otherFields.firstName || ''} ${otherFields.lastName || ''}`.trim() || 'User',
        phone: profileData.phoneNumber || profileData.phone || otherFields.phoneNumber || otherFields.phone || '',
        dateOfBirth: profileData.dateOfBirth || otherFields.dateOfBirth || '',
        gender: profileData.gender || otherFields.gender || '',
        password: password || '', // Store password (in production, use bcrypt)
        
        // Emergency Contact
        emergencyContact: profileData.emergencyContact || otherFields.emergencyContact || {},
        
        // Location & Preferences
        location: profileData.location || otherFields.location || {},
        preferences: profileData.preferences || otherFields.preferences || {
          language: 'English',
          emailNotifications: true,
          smsNotifications: true
        },
        
        // Registration metadata
        registrationDate: new Date().toISOString(),
        registrationMethod: password ? 'email' : 'wallet',
        
        ...profileData,
        ...otherFields
      }
    }, { transaction });

    // Create role-specific profile
    let profile;
    try {
      switch (role) {
        case 'patient':
          profile = await Patient.create({
            walletAddress: finalWallet.toLowerCase(),
            name: otherFields.fullName || `${otherFields.firstName || ''} ${otherFields.lastName || ''}`.trim() || 'Patient',
            dateOfBirth: otherFields.dateOfBirth ? new Date(otherFields.dateOfBirth) : null,
            gender: otherFields.gender || null,
            phone: otherFields.phoneNumber || otherFields.phone || null,
            emergencyContact: otherFields.emergencyContact || {},
            location: otherFields.location || {},
            preferences: otherFields.preferences || {
              language: 'English',
              emailNotifications: true,
              smsNotifications: true
            },
            registrationMethod: password ? 'email' : 'wallet'
          }, { transaction });
          console.log('✅ Patient profile created:', profile.walletAddress);
          break;
        case 'doctor':
          profile = await Doctor.create({
            walletAddress: finalWallet.toLowerCase()
          }, { transaction });
          console.log('✅ Doctor profile created:', profile.walletAddress);
          break;
        case 'pharmacist':
          profile = await Pharmacist.create({
            walletAddress: finalWallet.toLowerCase()
          }, { transaction });
          console.log('✅ Pharmacist profile created:', profile.walletAddress);
          break;
      }
    } catch (profileError) {
      console.error('❌ Profile creation error:', profileError);
      throw new Error(`Failed to create ${role} profile: ${profileError.message}`);
    }

    await transaction.commit();

    console.log('✅ User registered successfully:', user.email);

    const authToken = password ? `email-auth-${user.walletAddress}-${Date.now()}` : `web3-auth-${user.walletAddress}-${Date.now()}`;

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
          type: password ? 'email_password' : 'web3_wallet'
        }
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

export const login = async (req, res) => {
  try {
    const { walletAddress, email, password, signature, message } = req.body;

    console.log('🔐 Login request:', { walletAddress, email });

    // Email/Password login
    if (email && password) {
      const user = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'No user registered with this email'
        });
      }

      // Simple password check (in production, use bcrypt)
      let storedPassword = null;
      try {
        const profileData = typeof user.profileData === 'string' 
          ? JSON.parse(user.profileData) 
          : user.profileData;
        storedPassword = profileData?.password;
      } catch (e) {
        console.error('Error parsing profileData:', e);
      }
      
      if (!storedPassword || storedPassword !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Incorrect password'
        });
      }

      const authToken = `email-auth-${user.walletAddress}-${Date.now()}`;

      return res.json({
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
            type: 'email_password'
          }
        }
      });
    }

    // Wallet login
    if (walletAddress) {
      // Verify signature if provided
      if (signature && message) {
        try {
          const recoveredAddress = ethers.verifyMessage(message, signature);
          if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
             return res.status(401).json({
              success: false,
              error: 'Invalid signature',
              message: 'Signature verification failed'
            });
          }
          
          // Optional: Check timestamp in message to prevent replay attacks
          // const timestamp = message.match(/Timestamp: (\d+)/)?.[1];
          // if (timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) { ... }

        } catch (err) {
          console.error('Signature verification error:', err);
          return res.status(401).json({
            success: false,
            error: 'Invalid signature',
            message: 'Could not verify signature'
          });
        }
      } else {
        // If no signature provided, we might want to block login in production
        // For now, we'll allow it but log a warning or return an error if strict mode is on
        // return res.status(400).json({ error: 'Signature required' });
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

      return res.json({
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
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid request',
      message: 'Either walletAddress or email/password is required'
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
    // Try to get wallet from header or auth token (mock)
    let walletAddress = req.headers['x-wallet-address'];
    
    // If using Bearer token, we might extract wallet from it (mock implementation)
    const authHeader = req.headers.authorization;
    if (!walletAddress && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Mock token parsing: web3-auth-0x123...-timestamp
      const parts = token.split('-');
      if (parts.length >= 3) {
        // Find the part that looks like a wallet address
        const walletPart = parts.find(p => p.startsWith('0x') && p.length === 42);
        if (walletPart) walletAddress = walletPart;
      }
    }
    
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

    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          message: 'Signature does not match wallet address'
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
        message: 'Signature verified',
        data: {
          verified: true,
          walletAddress: user.walletAddress
        }
      });

    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Verification failed',
        message: err.message
      });
    }

  } catch (error) {
    console.error('❌ Verify signature error:', error);
    res.status(500).json({
      success: false,
      error: 'Signature verification failed',
      message: error.message
    });
  }
};

// 🔐 NEW: Wallet Connection Endpoint
export const connectWallet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { walletAddress, signature, message } = req.body;

    console.log('🔗 Wallet connection request:', { walletAddress });

    if (!walletAddress) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing wallet address',
        message: 'walletAddress is required'
      });
    }

    // Verify signature if provided
    if (signature && message) {
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          await transaction.rollback();
          return res.status(401).json({
            success: false,
            error: 'Invalid signature',
            message: 'Signature verification failed'
          });
        }
      } catch (err) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Verification failed',
          message: err.message
        });
      }
    }

    // Find or create user by wallet
    let user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
      transaction
    });

    if (!user) {
      console.log('🆕 Creating new user for wallet:', walletAddress);
      
      // Create new user with wallet
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        email: `${walletAddress.toLowerCase()}@wallet.local`,
        role: 'patient',
        isActive: true,
        profileData: {
          fullName: `User ${walletAddress.substring(0, 8)}`,
          phone: '',
          walletConnected: true
        }
      }, { transaction });

      // Create patient profile by default
      await Patient.create({
        walletAddress: walletAddress.toLowerCase()
      }, { transaction });

      console.log('✅ New wallet user created:', user.walletAddress);
    }

    await transaction.commit();

    // Generate JWT token (simplified for demo)
    const authToken = `wallet-auth-${user.walletAddress}-${Date.now()}`;

    res.json({
      success: true,
      message: 'Wallet connected successfully',
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
          type: 'wallet_connection'
        },
        isNewUser: !user.profileData?.walletConnected
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Wallet connection failed',
      message: error.message
    });
  }
};

// 🔐 NEW: Wallet Verification Endpoint
export const verifyWallet = async (req, res) => {
  try {
    const { walletAddress, message, signature } = req.body;

    console.log('🔍 Wallet verification request:', { walletAddress });

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing wallet address'
      });
    }

    // Check if wallet exists in database
    const user = await User.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    let isValid = false;
    if (signature && message) {
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      } catch (e) {
        isValid = false;
      }
    }

    res.json({
      success: true,
      data: {
        verified: isValid,
        userExists: !!user,
        walletAddress: walletAddress.toLowerCase(),
        user: user ? {
          walletAddress: user.walletAddress,
          role: user.role,
          isActive: user.isActive
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Wallet verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Wallet verification failed',
      message: error.message
    });
  }
};

// 🔐 NEW: Get Nonce for Wallet Signing
export const getNonce = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required'
      });
    }

    // Generate a nonce for signing
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();
    const message = `Welcome to Elite Tena Healthcare! Please sign this message to authenticate.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    res.json({
      success: true,
      data: {
        nonce,
        timestamp,
        message,
        walletAddress: walletAddress.toLowerCase()
      }
    });

  } catch (error) {
    console.error('❌ Get nonce error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate nonce',
      message: error.message
    });
  }
};
