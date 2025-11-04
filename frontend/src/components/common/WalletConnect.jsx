import React from 'react'
import { useWeb3 } from '../../contexts/Web3Context'

const WalletConnect = () => {
  const { 
    account, 
    isConnected, 
    loading, 
    error, 
    connectWallet, 
    isMetaMaskInstalled 
  } = useWeb3()

  if (!isMetaMaskInstalled()) {
    return (
      <div className="flex items-center space-x-2">
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Install MetaMask
        </a>
      </div>
    )
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-gray-600">
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={connectWallet}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-600 max-w-xs">{error}</span>
      )}
    </div>
  )
}

export default WalletConnect
