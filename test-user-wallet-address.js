// Simple test to check what's in localStorage
console.log('🔍 ========== CHECKING USER WALLET ADDRESS ==========');

// Check localStorage
const authToken = localStorage.getItem('auth_token');
const userWallet = localStorage.getItem('user_wallet');

console.log('📱 Auth Token:', authToken ? 'Present' : 'Not found');
console.log('👤 User Wallet from localStorage:', userWallet);

// Check if there's any session storage
const sessionWallet = sessionStorage.getItem('user_wallet');
console.log('📱 User Wallet from sessionStorage:', sessionWallet);

// Check all localStorage keys
console.log('🗂️ All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}: ${value}`);
}

// Check all sessionStorage keys
console.log('🗂️ All sessionStorage keys:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}: ${value}`);
}