import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWeb3 } from './Web3Context'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('authToken'))
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const { account, signer, isConnected, disconnectWallet } = useWeb3()

  // Login with Web3 wallet
  const login = async () => {
    if (!isConnected || !signer) {
      setAuthError('Wallet not connected')
      return false
    }

    try {
      setLoading(true)
      setAuthError(null)

      // Step 1: Get authentication challenge
      const challengeResponse = await authAPI.getChallenge(account)
      const { message, nonce } = challengeResponse.data

      // Step 2: Sign the message with MetaMask
      const signature = await signer.signMessage(message)

      // Step 3: Verify signature and get token
      const verifyResponse = await authAPI.verifySignature(account, signature)
      const { token: authToken, user: userData } = verifyResponse.data

      // Store token and user data
      localStorage.setItem('authToken', authToken)
      setToken(authToken)
      setUser(userData)

      return true
    } catch (error) {
      console.error('Login failed:', error)
      setAuthError(error.response?.data?.message || error.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = () => {
    if (token) {
      authAPI.logout(token).catch(console.error)
    }
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    disconnectWallet()
  }

  // Validate token on app load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await authAPI.validateToken(token)
        setUser(response.data.user)
      } catch (error) {
        console.error('Token validation failed:', error)
        localStorage.removeItem('authToken')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  // Auto-login when wallet connects and has token
  useEffect(() => {
    if (isConnected && token && !user) {
      const validateAndLogin = async () => {
        try {
          const response = await authAPI.validateToken(token)
          setUser(response.data.user)
        } catch (error) {
          // Token is invalid, try to login with wallet
          await login()
        }
      }
      validateAndLogin()
    }
  }, [isConnected, token, user])

  const value = {
    user,
    token,
    loading,
    error: authError,
    login,
    logout,
    isAuthenticated: !!user && !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
