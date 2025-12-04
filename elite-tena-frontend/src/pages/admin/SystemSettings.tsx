import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Database, Shield, Bell, Mail, 
  Server, Save, RefreshCw
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'database'>('general');
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'Elite Tena Healthcare',
    siteUrl: 'http://localhost:5174',
    adminEmail: 'admin@hospital.com',
    timezone: 'Africa/Addis_Ababa',
    language: 'en',
    maintenanceMode: false,
    
    // Security Settings
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowWalletAuth: true,
    allowEmailAuth: true,
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyNewUsers: true,
    notifyAppointments: true,
    notifyPrescriptions: true,
    
    // Database Settings
    backupFrequency: 'daily',
    retentionDays: 90,
    autoBackup: true
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'database', name: 'Database', icon: Database }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure system preferences and options</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Settings className="w-8 h-8 text-white" />
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        {/* General Settings */}
        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site URL
                </label>
                <input
                  type="url"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York (EST)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="am">አማርኛ (Amharic)</option>
                  <option value="om">Afaan Oromoo</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Enable Maintenance Mode
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireTwoFactor}
                    onChange={(e) => setSettings({ ...settings, requireTwoFactor: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">
                    Require Two-Factor Authentication
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowWalletAuth}
                    onChange={(e) => setSettings({ ...settings, allowWalletAuth: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">
                    Allow Wallet Authentication
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowEmailAuth}
                    onChange={(e) => setSettings({ ...settings, allowEmailAuth: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">
                    Allow Email/Password Authentication
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-600">Send notifications via email</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Push Notifications</div>
                    <div className="text-sm text-gray-600">Browser push notifications</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">Notify on New User Registration</div>
                  <div className="text-sm text-gray-600">Get notified when new users register</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyNewUsers}
                  onChange={(e) => setSettings({ ...settings, notifyNewUsers: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">Notify on Appointments</div>
                  <div className="text-sm text-gray-600">Get notified about new appointments</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyAppointments}
                  onChange={(e) => setSettings({ ...settings, notifyAppointments: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">Notify on Prescriptions</div>
                  <div className="text-sm text-gray-600">Get notified about new prescriptions</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyPrescriptions}
                  onChange={(e) => setSettings({ ...settings, notifyPrescriptions: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Database Settings */}
        {activeTab === 'database' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  value={settings.retentionDays}
                  onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Enable Automatic Backups
                </label>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">Database Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  <Server className="w-5 h-5" />
                  Backup Now
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  <RefreshCw className="w-5 h-5" />
                  Restore Backup
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  <Database className="w-5 h-5" />
                  Optimize Database
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
          <button className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Reset to Defaults
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
