import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Stethoscope, Pill, Beaker, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/axios';

export const AdminStaff: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'doctor',
    fullName: '',
    specialization: '',
    licenseNumber: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/admin/register-staff', formData);
      if (response.data.success) {
        alert('Staff member registered successfully!');
        setFormData({
          email: '',
          password: '',
          role: 'doctor',
          fullName: '',
          specialization: '',
          licenseNumber: ''
        });
      } else {
        alert('Failed to register staff member');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to register staff member');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'blue' },
    { value: 'pharmacist', label: 'Pharmacist', icon: Pill, color: 'green' },
    { value: 'lab_technician', label: 'Lab Technician', icon: Beaker, color: 'purple' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Register Staff</h1>
          <p className="text-gray-600 mt-1">Add new doctors, pharmacists, and lab technicians</p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Role
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roleOptions.map((role) => (
                  <motion.button
                    key={role.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.role === role.value
                        ? `border-${role.color}-500 bg-${role.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <role.icon className={`w-6 h-6 ${
                        formData.role === role.value ? `text-${role.color}-600` : 'text-gray-400'
                      }`} />
                      <span className="font-medium">{role.label}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter license number"
                />
              </div>
            </div>

            {formData.role === 'doctor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Cardiology, Pediatrics, General Medicine"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 bg-medical-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-medical-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Register Staff Member
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};