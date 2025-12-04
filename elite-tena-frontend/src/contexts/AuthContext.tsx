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

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const wallet = localStorage.getItem('user_wallet');
        
        if (token && wallet) {
          // Demo mode - create mock user
          if (token === 'demo-token') {
            const demoUser: UserProfile = {
              id: 'demo-user-1',
              walletAddress: wallet,
              fullName: 'Demo Patient',
              role: 'patient',
              email: 'demo@elitetena.com',
              isApproved: true,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            dispatch({ type: 'SET_USER', payload: demoUser });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          // Real mode - verify with backend
          try {
            const response = await axios.get('/api/auth/verify', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data) {
              dispatch({ type: 'SET_USER', payload: response.data });
            } else {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_wallet');
            }
          } catch (error) {
            // Backend not available - use demo mode
            console.log('Backend not available, using demo mode');
            const demoUser: UserProfile = {
              id: 'demo-user-1',
              walletAddress: wallet,
              fullName: 'Demo Patient',
              role: 'patient',
              email: 'demo@elitetena.com',
              isApproved: true,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            dispatch({ type: 'SET_USER', payload: demoUser });
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkExistingSession();
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

  const login = async (walletAddress: string, signature: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await axios.post('/api/auth/login', {
        walletAddress,
        signature
      });

      const { user, token } = response.data;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_wallet', walletAddress);
      
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
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { data } = response.data;
      const { user, auth } = data;
      
      localStorage.setItem('auth_token', auth.token);
      localStorage.setItem('user_wallet', user.walletAddress);
      
      const userProfile: UserProfile = {
        id: user.walletAddress,
        walletAddress: user.walletAddress,
        email: user.email,
        fullName: user.profileData?.fullName || 'User',
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
      const response = await axios.post('/api/auth/login', {
        walletAddress
      });

      const { data } = response.data;
      const { user, auth } = data;
      
      localStorage.setItem('auth_token', auth.token);
      localStorage.setItem('user_wallet', user.walletAddress);
      
      const userProfile: UserProfile = {
        id: user.walletAddress,
        walletAddress: user.walletAddress,
        email: user.email,
        fullName: user.profileData?.fullName || 'User',
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
      const response = await axios.post('/api/auth/register', {
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
      const response = await axios.post('/api/auth/register', {
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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_wallet');
    dispatch({ type: 'LOGOUT' });
    // Redirect to login page
    window.location.href = '/';
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        dispatch({ type: 'SET_USER', payload: response.data });
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
