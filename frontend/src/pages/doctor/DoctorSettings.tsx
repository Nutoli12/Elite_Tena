import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Settings, Save, Phone, Building, CreditCard } from 'lucide-react';
import axios from '../../lib/axios';

export const DoctorSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    telebirrNumber: '',
    telebirrEnabled: false,
    cbeBirrAccount: '',
    cbeBirrEnabled: false,
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bankTransferEnabled: false,
    videoCallFee: 50,
    chatFee: 30
  });

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/premium-services/payment-settings/${user?.walletAddress}`);
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(`/premium-services/payment-settings/${user?.walletAddress}`, settings);
      
      if (response.data.success) {
        alert('Payment settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-medical-600" />
            Payment Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure your payment methods for premium services</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className="healthcare-button flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </motion.button>
      </div>

      {/* Telebirr */}
      <div className="medical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-medical-600" />
            Telebirr
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.telebirrEnabled}
              onChange={(e) => setSettings({ ...settings, telebirrEnabled: e.target.checked })}
              className="w-5 h-5 text-medical-600 rounded focus:ring-medical-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telebirr Phone Number
          </label>
          <input
            type="tel"
            value={settings.telebirrNumber || ''}
            onChange={(e) => setSettings({ ...settings, telebirrNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500"
            placeholder="+251912345678"
            disabled={!settings.telebirrEnabled}
          />
        </div>
      </div>

      {/* CBE Birr */}
      <div className="medical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-medical-600" />
            CBE Birr
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cbeBirrEnabled}
              onChange={(e) => setSettings({ ...settings, cbeBirrEnabled: e.target.checked })}
              className="w-5 h-5 text-medical-600 rounded focus:ring-medical-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CBE Birr Account Number
          </label>
          <input
            type="text"
            value={settings.cbeBirrAccount || ''}
            onChange={(e) => setSettings({ ...settings, cbeBirrAccount: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500"
            placeholder="1000123456789"
            disabled={!settings.cbeBirrEnabled}
          />
        </div>
      </div>

      {/* Bank Transfer */}
      <div className="medical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-medical-600" />
            Bank Transfer
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.bankTransferEnabled}
              onChange={(e) => setSettings({ ...settings, bankTransferEnabled: e.target.checked })}
              className="w-5 h-5 text-medical-600 rounded focus:ring-medical-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable</span>
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name
            </label>
            <select
              value={settings.bankName || ''}
              onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500"
              disabled={!settings.bankTransferEnabled}
            >
              <option value="">Select Bank</option>
              <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia</option>
              <option value="Bank of Abyssinia">Bank of Abyssinia</option>
              <option value="Awash Bank">Awash Bank</option>
              <option value="Dashen Bank">Dashen Bank</option>
              <option value="United Bank">United Bank</option>
              <option value="Wegagen Bank">Wegagen Bank</option>
              <option value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <input
              type="text"
              value={settings.bankAccountNumber || ''}
              onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500"
              placeholder="1000123456789"
              disabled={!settings.bankTransferEnabled}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              value={settings.bankAccountName || ''}
              onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500"
              placeholder="Dr. John Doe"
              disabled={!settings.bankTransferEnabled}
            />
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          ℹ️ <strong>Note:</strong> These payment details will be shown to patients when they request premium services. 
          The system does NOT process payments - patients pay directly to you using these details.
        </p>
      </div>
    </div>
  );
};
