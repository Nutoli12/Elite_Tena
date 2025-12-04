import axios from 'axios';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3002';

// Create axios instance for backend API
export const backendAPI = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
backendAPI.interceptors.request.use(
  (config) => {
    console.log(`🔗 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Backend Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
backendAPI.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Backend Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Backend API endpoints
export const healthAPI = {
  check: () => backendAPI.get('/api/health'),
  test: () => backendAPI.get('/api/test'),
  dbStatus: () => backendAPI.get('/api/db-status'),
};

export const authAPI = {
  register: (userData: any) => backendAPI.post('/api/auth/register', userData),
  login: (credentials: any) => backendAPI.post('/api/auth/login', credentials),
  logout: () => backendAPI.post('/api/auth/logout'),
  getProfile: () => backendAPI.get('/api/auth/profile'),
};

export const appointmentsAPI = {
  getAll: () => backendAPI.get('/api/appointments'),
  create: (appointmentData: any) => backendAPI.post('/api/appointments', appointmentData),
  update: (id: number, updateData: any) => backendAPI.put(`/api/appointments/${id}`, updateData),
  delete: (id: number) => backendAPI.delete(`/api/appointments/${id}`),
};

export const adminAPI = {
  getStats: () => backendAPI.get('/api/admin/stats'),
  getUsers: () => backendAPI.get('/api/admin/users'),
};

export default backendAPI;