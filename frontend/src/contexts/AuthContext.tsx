import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AuthState, AuthContextType, UserProfile } from '../types/auth';
import axios from '../lib/axios';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_USER'; payload: UserProfile | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        error: null
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isConnecting: false };
    case 'LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isConnecting: false,
        error: null
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isConnecting: false,
  error: null
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on page load/refresh
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const walletAddress = localStorage.getItem('user_wallet');

        if (token && walletAddress) {
          console.log('🔄 Page refreshed - restoring session for:', walletAddress);
          
          // 🔧 ENHANCED: Verify token is still valid and user data is current
          const response = await axios.get('/auth/me');
          
          if (!response.data.success || !response.data.data) {
            throw new Error('Invalid session response');
          }
          
          const user = response.data.data;
          
          // 🔧 VALIDATION: Ensure the restored user matches the stored wallet
          if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            console.log('⚠️  Wallet mismatch - clearing session');
            throw new Error('Wallet address mismatch');
          }
          
          // 🔧 VALIDATION: Ensure user has required fields
          if (!user.walletAddress || !user.role) {
            console.log('⚠️  Incomplete user data - clearing session');
            throw new Error('Incomplete user data');
          }

          const userProfile: UserProfile = {
            id: user.walletAddress,
            walletAddress: user.walletAddress,
            email: user.email,
            fullName: user.profileData?.fullName || 
                     user.profileData?.name || 
                     (user.profileData?.firstName && user.profileData?.lastName 
                       ? `${user.profileData.firstName} ${user.profileData.lastName}` 
                       : 'User'),
            role: user.role,
            isApproved: user.isActive,
            createdAt: user.createdAt,
            lastLogin: new Date().toISOString()
          };

          dispatch({ type: 'SET_USER', payload: userProfile });
          console.log('✅ Session restored successfully for:', userProfile.fullName);
        } else {
          console.log('🔄 No saved session found');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.log('❌ Session restore failed - clearing invalid session:', error.message);
        // 🔧 ENHANCED: Clear all auth-related localStorage items
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_wallet');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_email');
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  // Listen for logout events from axios interceptor
  useEffect(() => {
    const handleLogout = () => {
      console.log('🚪 Logout event received from axios interceptor');
      dispatch({ type: 'LOGOUT' });
      // Redirect to landing page
      window.location.href = '/';
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const connectWallet = async (): Promise<string> => {
    dispatch({ type: 'SET_CONNECTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];
      return walletAddress;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect wallet';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false });
    }
  };

  const login = async (walletAddress: string, signature: string, message?: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Use wallet/connect endpoint which handles both login and registration (findOrCreate)
      const response = await axios.post('/auth/wallet/connect', {
        walletAddress,
        signature,
        message
      });

      const { user, auth } = response.data.data;

      // 🔧 ENHANCED: Store consistent user data
      localStorage.setItem('auth_token', auth.token);
      localStorage.setItem('user_wallet', user.walletAddress);
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('user_email', user.email || '');

      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      const { data } = response.data;
      const { user, auth } = data;

      // 🔧 ENHANCED: Store consistent user data
      localStorage.setItem('auth_token', auth.token);
      localStorage.setItem('user_wallet', user.walletAddress);
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('user_email', user.email || '');

      const userProfile: UserProfile = {
        id: user.walletAddress,
        walletAddress: user.walletAddress,
        email: user.email,
        fullName: user.profileData?.fullName || 
                 user.profileData?.name || 
                 (user.profileData?.firstName && user.profileData?.lastName 
                   ? `${user.profileData.firstName} ${user.profileData.lastName}` 
                   : 'User'),
        role: user.role,
        isApproved: user.isActive,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      dispatch({ type: 'SET_USER', payload: userProfile });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loginWithWallet = async (walletAddress: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Use wallet/connect endpoint which handles auto-registration
      const response = await axios.post('/auth/wallet/connect', {
        walletAddress
      });

      const { user, auth } = response.data.data;

      // 🔧 ENHANCED: Store consistent user data
      localStorage.setItem('auth_token', auth.token);
      localStorage.setItem('user_wallet', user.walletAddress);
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('user_email', user.email || '');

      const userProfile: UserProfile = {
        id: user.walletAddress,
        walletAddress: user.walletAddress,
        email: user.email,
        fullName: user.profileData?.fullName || 
                 user.profileData?.name || 
                 (user.profileData?.firstName && user.profileData?.lastName 
                   ? `${user.profileData.firstName} ${user.profileData.lastName}` 
                   : 'User'),
        role: user.role,
        isApproved: user.isActive,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      dispatch({ type: 'SET_USER', payload: userProfile });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const registerWithEmail = async (data: any): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await axios.post('/auth/register', {
        email: data.email,
        password: data.password,
        role: data.role,
        profileData: {
          fullName: data.fullName,
          phone: data.phoneNumber,
          dateOfBirth: data.dateOfBirth
        }
      });

      // Auto-login after registration
      await loginWithEmail(data.email, data.password);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const registerWithWallet = async (data: any): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await axios.post('/auth/register', {
        walletAddress: data.walletAddress,
        email: `${data.walletAddress}@wallet.local`, // Temporary email for wallet-only users
        role: data.role,
        profileData: {
          fullName: data.fullName,
          phone: data.phoneNumber,
          dateOfBirth: data.dateOfBirth
        }
      });

      // Auto-login after registration
      await loginWithWallet(data.walletAddress);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = (): void => {
    console.log('🚪 Logging out - clearing all session data');
    // 🔧 ENHANCED: Clear all possible auth-related localStorage items
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_wallet');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    // Clear any other potential stale data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('auth_') || key.startsWith('user_')) {
        localStorage.removeItem(key);
      }
    });
    
    dispatch({ type: 'LOGOUT' });
    // Redirect to landing page
    window.location.href = '/';
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await axios.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.data && response.data.data.user) {
        dispatch({ type: 'SET_USER', payload: response.data.data.user });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithEmail,
    loginWithWallet,
    registerWithEmail,
    registerWithWallet,
    logout,
    connectWallet,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
