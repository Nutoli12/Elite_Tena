import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Authentication API
export const authAPI = {
  getChallenge: (walletAddress) => 
    api.post('/auth/challenge', { walletAddress }),

  verifySignature: (walletAddress, signature) =>
    api.post('/auth/verify', { walletAddress, signature }),

  logout: (token) =>
    api.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (profileData) =>
    api.put('/auth/profile', profileData),

  validateToken: (token) =>
    api.get('/auth/validate', {
      headers: { Authorization: `Bearer ${token}` }
    }),
}

// Medical Records API
export const recordsAPI = {
  uploadFile: (formData) =>
    api.post('/upload/medical', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  getFiles: () =>
    api.get('/upload/files'),

  getFile: (cid) =>
    api.get(`/upload/files/${cid}`),

  deleteFile: (cid) =>
    api.delete(`/upload/files/${cid}`),
}

// Appointments API
export const appointmentsAPI = {
  bookAppointment: (appointmentData) =>
    api.post('/appointments/book', appointmentData),

  getAppointments: () =>
    api.get('/appointments'),

  getAppointment: (id) =>
    api.get(`/appointments/${id}`),

  updateAppointment: (id, updates) =>
    api.put(`/appointments/${id}`, updates),

  cancelAppointment: (id) =>
    api.delete(`/appointments/${id}`),
}

// Admin API
export const adminAPI = {
  getDoctors: () =>
    api.get('/admin/doctors'),

  approveDoctor: (walletAddress) =>
    api.post('/admin/doctors/approve', { walletAddress }),

  getStats: () =>
    api.get('/admin/stats'),

  getUsers: () =>
    api.get('/admin/users'),
}

export default api
