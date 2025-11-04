import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = Bearer ;
  }
  return config;
});

export const authService = {
  async generateNonce(walletAddress) {
    const response = await api.post('/auth/nonce', { walletAddress });
    return response.data;
  },

  async authenticate(walletAddress, signature, message) {
    const response = await api.post('/auth/login', {
      walletAddress,
      signature,
      message
    });
    return response.data;
  },

  async verifyToken(token) {
    const response = await api.get('/auth/profile', {
      headers: { Authorization: Bearer  }
    });
    return response.data.user;
  },

  async logout() {
    await api.post('/auth/logout');
  }
};

export const userService = {
  async register(userData) {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

export const blockchainService = {
  async getStatus() {
    const response = await api.get('/blockchain/status');
    return response.data;
  },

  async getBalance(walletAddress) {
    const response = await api.get(/blockchain/balance/);
    return response.data;
  }
};

export default api;
