import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWeb3 } from '../../contexts/Web3Context'
import WalletConnect from './WalletConnect'

const Header = () => {
  const { user, logout } = useAuth()
  const { account, isConnected } = useWeb3()
  const location = useLocation()

  const navigation = [
    { name: 'Home', href: '/', current: location.pathname === '/' },
    { name: 'Dashboard', href: '/dashboard', current: location.pathname === '/dashboard' },
  ]

  if (user?.role === 'admin') {
    navigation.push({ name: 'Admin', href: '/admin', current: location.pathname === '/admin' })
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ET</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Elite-Tena</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  item.current
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Wallet and User Section */}
          <div className="flex items-center space-x-4">
            <WalletConnect />
            
            {user && isConnected && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {user.role === 'patient' ? 'Patient' : 
                     user.role === 'doctor' ? `Dr. ${user.specialization || 'Doctor'}` : 
                     'Administrator'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </span>
                </div>
                
                <button
                  onClick={logout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
