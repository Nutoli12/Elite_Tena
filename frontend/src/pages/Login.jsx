import React from 'react'
import WalletConnect from '../components/common/WalletConnect.jsx'

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Elite-Tena
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your wallet to access your healthcare dashboard
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <WalletConnect />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have a wallet?{' '}
              <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-500">
                Install MetaMask
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
