import React, { createContext, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'

const Web3Context = createContext()

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && !!window.ethereum
  }

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      const network = await web3Provider.getNetwork()

      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(accounts[0])
      setChainId(network.chainId.toString())
      setIsConnected(true)

      // Store connection info
      localStorage.setItem('walletConnected', 'true')

      return true
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setError(err.message || 'Failed to connect wallet')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setChainId(null)
    setIsConnected(false)
    localStorage.removeItem('walletConnected')
  }

  // Switch network (for testnet/mainnet)
  const switchNetwork = async (chainId = '11155111') => { // Sepolia testnet
    if (!isMetaMaskInstalled()) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      })
      return true
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${parseInt(chainId).toString(16)}`,
                chainName: 'Sepolia Testnet',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          })
          return true
        } catch (addError) {
          console.error('Failed to add network:', addError)
          return false
        }
      }
      console.error('Failed to switch network:', switchError)
      return false
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        setAccount(accounts[0])
      }
    }

    const handleChainChanged = (chainId) => {
      setChainId(chainId)
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  // Auto-connect on mount if previously connected
  useEffect(() => {
    const previouslyConnected = localStorage.getItem('walletConnected')
    if (previouslyConnected && isMetaMaskInstalled()) {
      connectWallet()
    }
  }, [])

  const value = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isMetaMaskInstalled
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}
