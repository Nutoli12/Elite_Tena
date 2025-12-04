# 🚀 Elite Tena Frontend Integration Guide

## 📋 Current Backend Status
- ✅ Smart Contract Deployed: `0x2c0cE04B1013451660f62DE1292440e4bead3894`
- ✅ Network: Sepolia Testnet
- ✅ Backend API: Running on port 3003
- ✅ Database: PostgreSQL connected
- ✅ IPFS: Pinata configured
- ✅ Blockchain Events: 10 listeners active

---

## 🔧 Critical Integration Points

### 1. Environment Configuration

Create `frontend/.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:3003
VITE_API_BASE_URL=http://localhost:3003/api

# Blockchain Configuration
VITE_CONTRACT_ADDRESS=0x2c0cE04B1013451660f62DE1292440e4bead3894
VITE_BLOCKCHAIN_NETWORK=sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/-bDd7BdV8nVlJ8WOpcO8Z

# IPFS Configuration (Pinata)
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Feature Flags
VITE_ENABLE_BLOCKCHAIN=true
VITE_ENABLE_IPFS=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## 🔗 Backend API Integration

### API Service Layer

Create `src/services/api.ts`:
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

// Create axios instance with defaults
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const authAPI = {
  login: (walletAddress: string, signature: string) =>
    api.post('/auth/login', { walletAddress, signature }),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  verify: () =>
    api.get('/auth/verify'),
  
  profile: () =>
    api.get('/auth/profile'),
};

export const medicalRecordsAPI = {
  getAll: () => api.get('/medical-records'),
  
  getById: (id: string) => api.get(`/medical-records/${id}`),
  
  create: (data: FormData) =>
    api.post('/medical-records', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  update: (id: string, data: any) =>
    api.put(`/medical-records/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/medical-records/${id}`),
};

export const prescriptionsAPI = {
  getAll: () => api.get('/prescriptions'),
  
  getById: (id: string) => api.get(`/prescriptions/${id}`),
  
  issue: (data: any) => api.post('/prescriptions', data),
  
  fill: (id: string) => api.post(`/prescriptions/${id}/fill`),
  
  verify: (id: string) => api.get(`/prescriptions/${id}/verify`),
};

export const labResultsAPI = {
  getAll: () => api.get('/lab-results'),
  
  getById: (id: string) => api.get(`/lab-results/${id}`),
  
  submit: (data: FormData) =>
    api.post('/lab-results', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  approve: (id: string) => api.post(`/lab-results/${id}/approve`),
  
  reject: (id: string, reason: string) =>
    api.post(`/lab-results/${id}/reject`, { reason }),
};

export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  
  getById: (id: string) => api.get(`/appointments/${id}`),
  
  book: (data: any) => api.post('/appointments', data),
  
  cancel: (id: string) => api.post(`/appointments/${id}/cancel`),
  
  reschedule: (id: string, newDate: string) =>
    api.put(`/appointments/${id}/reschedule`, { newDate }),
};

export const consentAPI = {
  getAll: () => api.get('/consent'),
  
  grant: (data: any) => api.post('/consent/grant', data),
  
  revoke: (consentId: string) => api.post(`/consent/${consentId}/revoke`),
  
  check: (patientWallet: string, providerWallet: string, consentType: string) =>
    api.get('/consent/check', {
      params: { patientWallet, providerWallet, consentType },
    }),
};

export const paymentsAPI = {
  getAll: () => api.get('/payments'),
  
  create: (data: any) => api.post('/payments', data),
  
  verify: (txHash: string) => api.get(`/payments/verify/${txHash}`),
};
```

---

## ⚡ Web3 Integration

### Blockchain Service

Create `src/services/blockchain.ts`:
```typescript
import { ethers } from 'ethers';
import contractABI from '../contracts/EliteHealthSystemEnhanced.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '11155111');

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI.abi,
      this.signer
    );

    // Check network
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      await this.switchNetwork();
    }

    return true;
  }

  async switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [import.meta.env.VITE_RPC_URL],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  }

  async registerPatient(patientId: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const fee = await this.contract.patientFee();
    const tx = await this.contract.registerPatient(patientId, { value: fee });
    return await tx.wait();
  }

  async registerDoctor(specialization: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const fee = await this.contract.doctorFee();
    const tx = await this.contract.registerDoctor(specialization, { value: fee });
    return await tx.wait();
  }

  async grantConsent(
    providerAddress: string,
    consentType: number,
    duration: number
  ) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.grantConsent(
      providerAddress,
      consentType,
      duration
    );
    return await tx.wait();
  }

  async revokeConsent(providerAddress: string, consentType: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.revokeConsent(providerAddress, consentType);
    return await tx.wait();
  }

  async checkActiveConsent(
    patientAddress: string,
    providerAddress: string,
    consentType: number
  ) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    return await this.contract.checkActiveConsent(
      patientAddress,
      providerAddress,
      consentType
    );
  }

  async issuePrescription(patientAddress: string, ipfsHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.issuePrescription(patientAddress, ipfsHash);
    return await tx.wait();
  }

  async fillPrescription(prescriptionId: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.fillPrescription(prescriptionId);
    return await tx.wait();
  }

  async submitLabResult(patientAddress: string, ipfsHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.submitLabResult(patientAddress, ipfsHash);
    return await tx.wait();
  }

  async approveLabResult(resultId: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.approveLabResult(resultId);
    return await tx.wait();
  }

  async bookAppointment(doctorAddress: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const fee = await this.contract.appointmentFee();
    const tx = await this.contract.bookAppointment(doctorAddress, { value: fee });
    return await tx.wait();
  }

  async storeMedicalRecord(patientAddress: string, ipfsHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.storeMedicalRecord(patientAddress, ipfsHash);
    return await tx.wait();
  }

  // Event listeners
  onUserRegistered(callback: (user: string, role: number) => void) {
    if (!this.contract) return;
    this.contract.on('UserRegistered', callback);
  }

  onConsentGranted(callback: (patient: string, provider: string, type: number, expires: bigint) => void) {
    if (!this.contract) return;
    this.contract.on('ConsentGranted', callback);
  }

  onPrescriptionIssued(callback: (id: bigint, patient: string, doctor: string) => void) {
    if (!this.contract) return;
    this.contract.on('PrescriptionIssued', callback);
  }

  removeAllListeners() {
    if (!this.contract) return;
    this.contract.removeAllListeners();
  }
}

export const blockchainService = new BlockchainService();
```

---

## 📦 Key Modifications Needed

### 1. Update AuthContext to use Backend API

```typescript
// In src/contexts/AuthContext.tsx
import { authAPI } from '../services/api';
import { blockchainService } from '../services/blockchain';

const connectWallet = async (): Promise<string> => {
  dispatch({ type: 'SET_CONNECTING', payload: true });
  
  try {
    await blockchainService.initialize();
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    return accounts[0];
  } catch (error) {
    // Handle error
  }
};

const login = async (walletAddress: string, signature: string): Promise<void> => {
  try {
    const response = await authAPI.login(walletAddress, signature);
    const { user, token } = response.data;
    
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_wallet', walletAddress);
    
    dispatch({ type: 'SET_USER', payload: user });
  } catch (error) {
    // Handle error
  }
};
```

### 2. Update Medical Records to use API + IPFS

```typescript
// In src/components/healthcare/MedicalRecordsSystem.tsx
import { medicalRecordsAPI } from '../../services/api';
import { blockchainService } from '../../services/blockchain';

const uploadMedicalRecord = async (file: File, metadata: any) => {
  try {
    // 1. Upload to IPFS via backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await medicalRecordsAPI.create(formData);
    const { ipfsHash, recordId } = response.data;
    
    // 2. Store on blockchain
    const tx = await blockchainService.storeMedicalRecord(
      metadata.patientAddress,
      ipfsHash
    );
    
    // 3. Update backend with blockchain tx
    await medicalRecordsAPI.update(recordId, {
      blockchainTxHash: tx.hash
    });
    
    return { success: true, recordId, ipfsHash, txHash: tx.hash };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### 3. Update Prescription System

```typescript
// In src/components/healthcare/PrescriptionSystem.tsx
import { prescriptionsAPI } from '../../services/api';
import { blockchainService } from '../../services/blockchain';

const issuePrescription = async (prescriptionData: any) => {
  try {
    // 1. Create in backend (generates IPFS hash)
    const response = await prescriptionsAPI.issue(prescriptionData);
    const { prescriptionId, ipfsHash } = response.data;
    
    // 2. Issue on blockchain
    const tx = await blockchainService.issuePrescription(
      prescriptionData.patientAddress,
      ipfsHash
    );
    
    // 3. Update with blockchain confirmation
    await prescriptionsAPI.update(prescriptionId, {
      blockchainTxHash: tx.hash,
      status: 'active'
    });
    
    return { success: true, prescriptionId, txHash: tx.hash };
  } catch (error) {
    console.error('Issue prescription failed:', error);
    throw error;
  }
};
```

---

## 🎨 UI/UX Enhancements

### 1. Transaction Status Component

Create `src/components/ui/TransactionStatus.tsx`:
```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface TransactionStatusProps {
  status: 'pending' | 'success' | 'error';
  txHash?: string;
  message?: string;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  txHash,
  message
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${
        status === 'success' ? 'bg-green-50 border-green-200' :
        status === 'error' ? 'bg-red-50 border-red-200' :
        'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        {status === 'pending' && (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        )}
        {status === 'success' && (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
        {status === 'error' && (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
        
        <div className="flex-1">
          <p className="font-medium">
            {status === 'pending' && 'Transaction Pending...'}
            {status === 'success' && 'Transaction Successful!'}
            {status === 'error' && 'Transaction Failed'}
          </p>
          {message && (
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          )}
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-medical-600 hover:underline mt-1 inline-block"
            >
              View on Etherscan →
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};
```

### 2. IPFS File Viewer

Create `src/components/ui/IPFSFileViewer.tsx`:
```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, Lock } from 'lucide-react';

interface IPFSFileViewerProps {
  ipfsHash: string;
  fileName: string;
  isEncrypted?: boolean;
}

export const IPFSFileViewer: React.FC<IPFSFileViewerProps> = ({
  ipfsHash,
  fileName,
  isEncrypted = true
}) => {
  const [loading, setLoading] = useState(false);
  
  const viewFile = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_PINATA_GATEWAY}${ipfsHash}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to view file:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadFile = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_PINATA_GATEWAY}${ipfsHash}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Failed to download file:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      {isEncrypted && (
        <div className="flex items-center text-xs text-medical-600">
          <Lock className="w-3 h-3 mr-1" />
          <span>Encrypted</span>
        </div>
      )}
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={viewFile}
        disabled={loading}
        className="p-2 text-gray-600 hover:text-medical-600 transition-colors"
        title="View File"
      >
        <Eye className="w-4 h-4" />
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={downloadFile}
        disabled={loading}
        className="p-2 text-gray-600 hover:text-medical-600 transition-colors"
        title="Download File"
      >
        <Download className="w-4 h-4" />
      </motion.button>
    </div>
  );
};
```

---

## 🚀 Quick Start Commands

```bash
# 1. Create React + TypeScript + Vite project
npm create vite@latest elite-tena-frontend -- --template react-ts

# 2. Install dependencies
cd elite-tena-frontend
npm install

# 3. Install required packages
npm install react-router-dom ethers@6 axios
npm install framer-motion @headlessui/react
npm install react-i18next i18next
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react date-fns
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node

# 4. Initialize Tailwind
npx tailwindcss init -p

# 5. Copy contract ABI
mkdir -p src/contracts
cp ../shared/contracts/EliteHealthSystemEnhanced.json src/contracts/

# 6. Start development server
npm run dev
```

---

## ✅ Integration Checklist

### Phase 1: Setup (Day 1)
- [ ] Create Vite project with TypeScript
- [ ] Install all dependencies
- [ ] Configure Tailwind CSS
- [ ] Setup i18n with translations
- [ ] Copy contract ABI
- [ ] Create environment variables

### Phase 2: Core Services (Day 2)
- [ ] Implement API service layer
- [ ] Implement blockchain service
- [ ] Setup authentication context
- [ ] Create protected routes
- [ ] Test wallet connection

### Phase 3: UI Components (Day 3-4)
- [ ] Build layout components
- [ ] Create reusable UI components
- [ ] Implement navigation
- [ ] Add language switcher
- [ ] Build notification system

### Phase 4: Healthcare Features (Day 5-7)
- [ ] Medical Records system
- [ ] Prescription management
- [ ] Lab Results system
- [ ] Appointment booking
- [ ] Consent management
- [ ] Payment integration

### Phase 5: Testing & Polish (Day 8-9)
- [ ] Test all user flows
- [ ] Test blockchain transactions
- [ ] Test IPFS file upload/download
- [ ] Optimize performance
- [ ] Add error handling
- [ ] Responsive design testing

### Phase 6: Deployment (Day 10)
- [ ] Build production bundle
- [ ] Deploy to hosting (Vercel/Netlify)
- [ ] Configure environment variables
- [ ] Test production deployment
- [ ] Monitor for errors

---

## 🎯 Priority Features to Implement First

1. **Authentication & Wallet Connection** (Critical)
2. **Medical Records View** (High Priority)
3. **Consent Management** (High Priority)
4. **Prescription View** (Medium Priority)
5. **Appointment Booking** (Medium Priority)
6. **Lab Results** (Medium Priority)
7. **Admin Dashboard** (Low Priority)

---

## 📊 Performance Optimization Tips

1. **Code Splitting**: Use React.lazy() for route-based splitting
2. **Image Optimization**: Use WebP format, lazy loading
3. **API Caching**: Implement React Query for data caching
4. **Bundle Size**: Keep under 500KB gzipped
5. **Lighthouse Score**: Target 90+ on all metrics

---

## 🔒 Security Best Practices

1. **Never expose private keys** in frontend code
2. **Validate all user inputs** before blockchain transactions
3. **Use HTTPS** for all API calls
4. **Implement rate limiting** on sensitive operations
5. **Sanitize IPFS content** before displaying
6. **Use Content Security Policy** headers

---

## 📱 Mobile Responsiveness

All components should work on:
- Desktop: 1920x1080 and above
- Tablet: 768x1024
- Mobile: 375x667 (iPhone SE) and above

Test on:
- Chrome DevTools mobile emulation
- Real devices (iOS and Android)
- Different network speeds (3G, 4G, WiFi)

---

## 🌍 Ethiopia-Specific Considerations

1. **Low Bandwidth**: Optimize images and assets
2. **Amharic Support**: Full RTL support if needed
3. **Currency**: Display in ETB with conversion
4. **Date Format**: Ethiopian calendar support
5. **Phone Numbers**: +251 format validation

---

**Status**: Ready for implementation
**Estimated Time**: 10 days for full implementation
**Team Size**: 2-3 frontend developers recommended
