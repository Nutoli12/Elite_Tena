// Authentication Types
export interface UserProfile {
  id: string;
  walletAddress: string;
  email?: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  specialization?: string;
  licenseNumber?: string;
  hospitalAffiliation?: string;
  isApproved: boolean;
  createdAt: string;
  lastLogin: string;
}

export type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'lab_technician' | 'admin';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (wallet: string, signature: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: (walletAddress: string) => Promise<void>;
  registerWithEmail: (data: any) => Promise<void>;
  registerWithWallet: (data: any) => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<string>;
  refreshUser: () => Promise<void>;
}

// Wallet Types
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
