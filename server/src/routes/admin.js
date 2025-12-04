import express from 'express';
import {
  getAllUsers,
  getUserByWallet,
  updateUserStatus,
  deleteUser,
  getSystemStats,
  getAuditLogs,
  registerDoctor,
  registerLabTechnician,
  registerPharmacist
} from '../controllers/adminController.js';

const router = express.Router();

// System statistics
router.get('/stats', getSystemStats);
router.get('/analytics', getSystemStats); // Alias for stats

// Audit logs
router.get('/audit-logs', getAuditLogs);

// Staff registration
router.post('/register-doctor', registerDoctor);
router.post('/register-lab-technician', registerLabTechnician);
router.post('/register-pharmacist', registerPharmacist);

// User management
router.get('/users', getAllUsers);
router.get('/users/:walletAddress', getUserByWallet);
router.patch('/users/:walletAddress/status', updateUserStatus);
router.delete('/users/:walletAddress', deleteUser);

// Info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Elite-Tena Admin API',
    endpoints: [
      'GET /api/admin/stats - System statistics',
      'POST /api/admin/register-doctor - Register new doctor',
      'POST /api/admin/register-lab-technician - Register new lab technician',
      'POST /api/admin/register-pharmacist - Register new pharmacist',
      'GET /api/admin/users - Get all users',
      'GET /api/admin/users/:walletAddress - Get specific user',
      'PATCH /api/admin/users/:walletAddress/status - Update user status',
      'DELETE /api/admin/users/:walletAddress - Delete user'
    ]
  });
});

export default router;
