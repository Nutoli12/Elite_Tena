/**
 * Authentication utility functions
 */

/**
 * Clear all authentication-related data from localStorage
 * This ensures no stale session data remains
 */
export const clearAuthData = (): void => {
  console.log('🧹 Clearing all authentication data');
  
  // Remove specific auth items
  const authKeys = [
    'auth_token',
    'user_wallet',
    'user_role',
    'user_email',
    'user_name',
    'user_id'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Remove any items that start with auth_ or user_
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('auth_') || key.startsWith('user_')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Authentication data cleared');
};

/**
 * Check if there's any stale authentication data
 */
export const hasStaleAuthData = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const wallet = localStorage.getItem('user_wallet');
  
  // If we have partial data, it might be stale
  return !!(token || wallet);
};

/**
 * Validate stored authentication data
 */
export const validateStoredAuthData = (): { isValid: boolean; reason?: string } => {
  const token = localStorage.getItem('auth_token');
  const wallet = localStorage.getItem('user_wallet');
  const role = localStorage.getItem('user_role');
  
  if (!token) {
    return { isValid: false, reason: 'No token found' };
  }
  
  if (!wallet) {
    return { isValid: false, reason: 'No wallet address found' };
  }
  
  if (!role) {
    return { isValid: false, reason: 'No user role found' };
  }
  
  // Basic token format validation (JWT should have 3 parts)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return { isValid: false, reason: 'Invalid token format' };
  }
  
  return { isValid: true };
};