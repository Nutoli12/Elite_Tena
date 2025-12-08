import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut } from 'lucide-react';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationBell } from '../NotificationBell';

interface HealthcareLayoutProps {
  children: React.ReactNode;
}

export const HealthcareLayout: React.FC<HealthcareLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = {
    patient: [
      { name: t('dashboard'), href: '/dashboard', icon: '🏠' },
      { name: t('medical_records'), href: '/medical-records', icon: '📁' },
      { name: t('appointments'), href: '/appointments', icon: '📅' },
      { name: t('prescriptions'), href: '/prescriptions', icon: '💊' },
      { name: t('lab_results'), href: '/lab-results', icon: '🧪' },
      { name: t('consent_management'), href: '/consent', icon: '🔐' },
      { name: t('payments'), href: '/payments', icon: '💰' },
      { name: 'Messages', href: '/messages', icon: '💬' },
    ],
    doctor: [
      { name: t('dashboard'), href: '/dashboard', icon: '🏠' },
      { name: t('my_patients'), href: '/patients', icon: '👥' },
      { name: t('medical_records'), href: '/medical-records', icon: '📁' },
      { name: t('appointments'), href: '/appointments', icon: '📅' },
      { name: 'Payment Settings', href: '/doctor/settings', icon: '⚙️' },
      { name: 'Messages', href: '/messages', icon: '💬' },
    ],
    pharmacist: [
      { name: t('dashboard'), href: '/dashboard', icon: '🏠' },
      { name: t('prescriptions'), href: '/prescriptions', icon: '💊' },
    ],
    lab_technician: [
      { name: t('dashboard'), href: '/dashboard', icon: '🏠' },
      { name: t('lab_results'), href: '/lab-results', icon: '🧪' },
    ],
    admin: [
      { name: 'Admin Dashboard', href: '/admin/dashboard', icon: '🏠' },
      { name: 'Staff Management', href: '/admin/staff', icon: '👥' },
      { name: 'User Management', href: '/admin/users', icon: '🔍' },
      { name: 'Analytics', href: '/admin/analytics', icon: '📊' },
      { name: 'System Settings', href: '/admin/settings', icon: '⚙️' },
      { name: 'AdminJS Panel', href: 'http://localhost:3003/admin', icon: '🔧', external: true },
    ]
  };

  const userNavigation = navigation[user?.role as keyof typeof navigation] || navigation.patient;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="hidden lg:flex lg:flex-shrink-0"
          >
            <div className="flex flex-col w-64 bg-white shadow-xl border-r border-gray-200">
              {/* Logo Section */}
              <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 healthcare-gradient">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    transition: { duration: 2, repeat: Infinity }
                  }}
                  className="flex items-center"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                    <span className="text-medical-600 font-bold text-sm">ET</span>
                  </div>
                  <span className="text-white font-bold text-xl">Elite Tena</span>
                </motion.div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1">
                {userNavigation.map((item, index) => {
                  const isExternal = (item as any).external;
                  const isActive = location.pathname === item.href;
                  
                  if (isExternal) {
                    return (
                      <motion.a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 5, backgroundColor: 'rgba(14, 165, 233, 0.1)' }}
                        className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:text-medical-600 transition-all group"
                      >
                        <span className="text-lg mr-3">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-auto text-xs">↗</span>
                      </motion.a>
                    );
                  }
                  
                  return (
                    <Link key={item.name} to={item.href}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 5, backgroundColor: 'rgba(14, 165, 233, 0.1)' }}
                        className={`flex items-center px-4 py-3 rounded-lg transition-all group ${
                          isActive 
                            ? 'bg-medical-100 text-medical-600 font-semibold' 
                            : 'text-gray-700 hover:text-medical-600'
                        }`}
                      >
                        <span className="text-lg mr-3">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* User Section */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 healthcare-gradient rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user?.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('logout')}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white shadow-sm border-b border-gray-200"
        >
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('dashboard')}
                </h1>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <NotificationBell />
            </div>
          </div>
        </motion.header>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-gray-200"
            >
              <nav className="px-2 py-4 space-y-1">
                {userNavigation.map((item) => {
                  const isExternal = (item as any).external;
                  const isActive = location.pathname === item.href;
                  
                  if (isExternal) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-medical-50 hover:text-medical-600 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-lg mr-3">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-auto text-xs">↗</span>
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-medical-100 text-medical-600 font-semibold'
                          : 'text-gray-700 hover:bg-medical-50 hover:text-medical-600'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg mr-3">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 overflow-auto p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};
