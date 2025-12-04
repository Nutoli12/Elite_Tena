# ⚡ Elite Tena Frontend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create Project (2 minutes)

```bash
# Create project
npm create vite@latest elite-tena-frontend -- --template react-ts
cd elite-tena-frontend

# Install dependencies (one command!)
npm install react-router-dom ethers@6 axios framer-motion @headlessui/react react-i18next i18next react-hook-form zod @hookform/resolvers lucide-react date-fns @tanstack/react-query react-hot-toast

# Install dev dependencies
npm install -D tailwindcss postcss autoprefixer @types/node

# Initialize Tailwind
npx tailwindcss init -p
```

### Step 2: Configure (1 minute)

Create `.env`:
```env
VITE_API_URL=http://localhost:3003
VITE_CONTRACT_ADDRESS=0x2c0cE04B1013451660f62DE1292440e4bead3894
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/-bDd7BdV8nVlJ8WOpcO8Z
```

Update `tailwind.config.js`:
```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        medical: {
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
    },
  },
}
```

### Step 3: Copy Contract ABI (30 seconds)

```bash
mkdir -p src/contracts
cp ../shared/contracts/EliteHealthSystemEnhanced.json src/contracts/
```

### Step 4: Create Minimal App (1 minute)

Replace `src/App.tsx`:
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Wallet } from 'lucide-react';

function App() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Install MetaMask!');
      return;
    }
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    setAddress(accounts[0]);
    setConnected(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Elite Tena</h1>
        <p className="text-gray-600 mb-6">Healthcare Management</p>
        
        {!connected ? (
          <button
            onClick={connectWallet}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold w-full hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Connected!</p>
            <p className="text-green-600 text-xs mt-1 truncate">{address}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 5: Run (30 seconds)

```bash
npm run dev
```

Open http://localhost:5173 and click "Connect Wallet"!

---

## 📚 Next Steps

### Day 1: Setup Complete ✅
- [x] Project created
- [x] Dependencies installed
- [x] Wallet connection working
- [ ] Read FRONTEND-INTEGRATION-GUIDE.md

### Day 2: Authentication
- [ ] Create AuthContext
- [ ] Add backend API integration
- [ ] Implement login flow
- [ ] Add protected routes

### Day 3: Layout
- [ ] Build main layout
- [ ] Add navigation
- [ ] Create sidebar
- [ ] Make responsive

### Week 2: Core Features
- [ ] Medical records view
- [ ] Consent management
- [ ] Basic dashboard

---

## 🎯 Essential Files to Create

### 1. `src/services/api.ts`
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (wallet: string, signature: string) =>
    api.post('/auth/login', { walletAddress: wallet, signature }),
};
```

### 2. `src/services/blockchain.ts`
```typescript
import { ethers } from 'ethers';
import contractABI from '../contracts/EliteHealthSystemEnhanced.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;

  async initialize() {
    this.provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI.abi,
      signer
    );
    return true;
  }

  async grantConsent(provider: string, type: number, duration: number) {
    if (!this.contract) throw new Error('Not initialized');
    const tx = await this.contract.grantConsent(provider, type, duration);
    return await tx.wait();
  }
}

export const blockchainService = new BlockchainService();
```

### 3. `src/contexts/AuthContext.tsx`
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  connectWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const connectWallet = async () => {
    // Implementation here
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, connectWallet, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## 🔗 Important Links

### Your Backend
- API: http://localhost:3003
- Health: http://localhost:3003/api/health

### Your Contract
- Address: `0x2c0cE04B1013451660f62DE1292440e4bead3894`
- Etherscan: https://sepolia.etherscan.io/address/0x2c0cE04B1013451660f62DE1292440e4bead3894

### Documentation
- Integration Guide: `FRONTEND-INTEGRATION-GUIDE.md`
- Starter Kit: `FRONTEND-STARTER-KIT.md`
- Timeline: `FRONTEND-IMPLEMENTATION-TIMELINE.md`
- Recommendations: `FRONTEND-RECOMMENDATIONS.md`

---

## 🐛 Troubleshooting

### MetaMask not detected?
```typescript
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask: https://metamask.io/download/');
}
```

### Wrong network?
```typescript
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }], // Sepolia
});
```

### CORS errors?
Add to `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3003',
  },
}
```

---

## ✅ Checklist

- [ ] Project created
- [ ] Dependencies installed
- [ ] Tailwind configured
- [ ] Contract ABI copied
- [ ] Environment variables set
- [ ] App runs on localhost:5173
- [ ] Wallet connection works
- [ ] MetaMask connects
- [ ] Network switches to Sepolia

---

## 🎉 You're Ready!

Your minimal app is running. Now follow the detailed guides to build out the full system.

**Start with**: `FRONTEND-INTEGRATION-GUIDE.md`

**Timeline**: `FRONTEND-IMPLEMENTATION-TIMELINE.md`

**Questions?**: Check `COMPLETE-SYSTEM-STATUS.md`

---

**Happy coding!** 🚀
