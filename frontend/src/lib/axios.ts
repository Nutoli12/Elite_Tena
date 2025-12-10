import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and wallet address
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    // Try to get wallet address from localStorage first, but validate it
    let walletAddress = localStorage.getItem('user_wallet');
    
    // Validate wallet address format (should start with 0x and be 42 characters)
    if (walletAddress && (!walletAddress.startsWith('0x') || walletAddress.length < 20)) {
      console.warn('Invalid wallet address in localStorage, clearing:', walletAddress);
      localStorage.removeItem('user_wallet');
      walletAddress = null;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (walletAddress) {
      config.headers['x-wallet-address'] = walletAddress;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token but don't redirect here
      // Let the AuthContext handle the redirect properly
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_wallet');
      
      // Dispatch a custom event that AuthContext can listen to
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
