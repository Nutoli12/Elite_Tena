import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users, Stethoscope, FlaskConical, Pill, Mail, Lock, User, Phone, FileText, Trash2, Edit, Eye } from 'lucide-react';
import axios from '../../lib/axios';

type StaffRole = 'doctor' | 'lab_technician' | 'pharmacist';

interface StaffMember {
  walletAddress: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profileData?: {
    fullName?: string;
    phone?: string;
  };
}

const StaffList: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | StaffRole>('all');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      console.log('🔍 Fetching staff members...');
      const response = await axios.get('/admin/users');
      if (response.data.success) {
        const allUsers = response.data.data || [];
        const staffMembers = allUsers.filter((user: StaffMember) =>
          ['doctor', 'lab_technician', 'pharmacist'].includes(user.role)
        );
        console.log(`✅ Found ${staffMembers.length} staff members`);
        setStaff(staffMembers);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      // Set empty array on error
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (walletAddress: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      console.log('🗑️ Deleting staff member:', walletAddress);
      const response = await axios.delete(`/admin/users/${walletAddress}`);
      if (response.data.success) {
        setStaff(prev => prev.filter(s => s.walletAddress !== walletAddress));
        console.log('✅ Staff member deleted');
      }
    } catch (error) {
      console.error('Failed to delete staff member:', error);
      alert('Failed to delete staff member. Please try again.');
    }
  };

  const handleToggleStatus = async (walletAddress: string, currentStatus: boolean) => {
    try {
      console.log('🔄 Toggling staff status:', walletAddress);
      const response = await axios.patch(`/admin/users/${walletAddress}`, {
        isActive: !currentStatus
      });
      if (response.data.success) {
        setStaff(prev => prev.map(s =>
          s.walletAddress === walletAddress
            ? { ...s, isActive: !currentStatus }
            : s
        ));
        console.log('✅ Staff status updated');
      }
    } catch (error) {
      console.error('Failed to update staff status:', error);
      alert('Failed to update staff status. Please try again.');
    }
  };

  const filteredStaff = filter === 'all'
    ? staff
    : staff.filter(s => s.role === filter);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'doctor': return Stethoscope;
      case 'lab_technician': return FlaskConical;
      case 'pharmacist': return Pill;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor': return 'blue';
      case 'lab_technician': return 'purple';
      case 'pharmacist': return 'green';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-medical-500 border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Staff Members ({filteredStaff.length})</h3>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {['all', 'doctor', 'lab_technician', 'pharmacist'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${filter === filterOption
                  ? 'bg-medical-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {filterOption === 'all' ? 'All' :
                filterOption === 'lab_technician' ? 'Lab Tech' :
                  filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredStaff.length > 0 ? (
        <div className="space-y-4">
          {filteredStaff.map((member, index) => {
            const RoleIcon = getRoleIcon(member.role);
            const roleColor = getRoleColor(member.role);

            return (
              <motion.div
                key={member.walletAddress}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-${roleColor}-100 rounded-lg flex items-center justify-center`}>
                    <RoleIcon className={`w-6 h-6 text-${roleColor}-600`} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {member.profileData?.fullName || 'No Name'}
                    </h4>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{member.walletAddress.substring(0, 10)}...</span>
                      <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleStatus(member.walletAddress, member.isActive)}
                    className={`p-2 rounded-lg transition-colors ${member.isActive
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                      }`}
                    title={member.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <Eye className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteStaff(member.walletAddress)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Staff Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No staff members found</p>
          <p className="text-sm">Register staff members using the form above</p>
        </div>
      )}
    </div>
  );
};

export const StaffManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('doctor');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    walletAddress: '',
    specialization: '',
    licenseNumber: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const endpoint = `/admin/register-${selectedRole.replace('_', '-')}`;
      const payload = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        walletAddress: formData.walletAddress || undefined,
        ...(selectedRole === 'doctor' && {
          specialization: formData.specialization,
          licenseNumber: formData.licenseNumber
        }),
        ...(selectedRole === 'lab_technician' && {
          department: formData.department
        }),
        ...(selectedRole === 'pharmacist' && {
          licenseNumber: formData.licenseNumber
        })
      };

      await axios.post(endpoint, payload);

      setMessage({
        type: 'success',
        text: `${selectedRole.replace('_', ' ')} registered successfully! Credentials sent to ${formData.email}`
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        walletAddress: '',
        specialization: '',
        licenseNumber: '',
        department: ''
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Registration failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    doctor: {
      icon: Stethoscope,
      color: 'blue',
      label: 'Doctor',
      fields: ['specialization', 'licenseNumber']
    },
    lab_technician: {
      icon: FlaskConical,
      color: 'purple',
      label: 'Lab Technician',
      fields: ['department']
    },
    pharmacist: {
      icon: Pill,
      color: 'green',
      label: 'Pharmacist',
      fields: ['licenseNumber']
    }
  };

  const RoleIcon = roleConfig[selectedRole].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Register and manage healthcare staff</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-16 h-16 bg-gradient-to-br from-medical-500 to-medical-600 rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Users className="w-8 h-8 text-white" />
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'register'
              ? 'bg-white text-medical-600 shadow-sm'
              : 'text-gray-600'
            }`}
        >
          <UserPlus className="w-4 h-4 inline mr-2" />
          Register Staff
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'list'
              ? 'bg-white text-medical-600 shadow-sm'
              : 'text-gray-600'
            }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Staff List
        </button>
      </div>

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Selection */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-gray-900">Select Role</h3>
            {(Object.keys(roleConfig) as StaffRole[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <motion.button
                  key={role}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${selectedRole === role
                      ? `border-${config.color}-500 bg-${config.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-${config.color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${config.color}-600`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{config.label}</div>
                      <div className="text-sm text-gray-600">Register new {config.label.toLowerCase()}</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 bg-${roleConfig[selectedRole].color}-100 rounded-lg flex items-center justify-center`}>
                  <RoleIcon className={`w-6 h-6 text-${roleConfig[selectedRole].color}-600`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Register {roleConfig[selectedRole].label}
                  </h3>
                  <p className="text-sm text-gray-600">Fill in the details below</p>
                </div>
              </div>

              {/* Message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 p-3 rounded-lg ${message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                >
                  {message.text}
                </motion.div>
              )}

              <form onSubmit={handleRegisterStaff} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Role-Specific Fields */}
                {selectedRole === 'doctor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialization *
                      </label>
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        placeholder="e.g., Cardiology"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Number *
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedRole === 'lab_technician' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="e.g., Hematology"
                      required
                    />
                  </div>
                )}

                {selectedRole === 'pharmacist' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number *
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Optional Wallet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Staff can connect wallet later if not provided now
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="healthcare-button w-full disabled:opacity-50"
                >
                  {loading ? 'Registering...' : `Register ${roleConfig[selectedRole].label}`}
                </motion.button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <StaffList />
      )}
    </div>
  );
};
