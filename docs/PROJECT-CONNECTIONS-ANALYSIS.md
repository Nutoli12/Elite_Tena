# Elite Tena Healthcare - System Connections Analysis

## 🔗 CURRENT CONNECTION STATUS

### ✅ CONNECTED COMPONENTS

#### 1. **Backend ↔ PostgreSQL Database**
- **Status**: ✅ CONNECTED
- **Connection**: `postgresql://admin:password@localhost:5432/elitetena`
- **Location**: `server/.env` → `DATABASE_URL`
- **Evidence**: Server logs show "Database connection established"
- **Models**: 13 models (User, Patient, Doctor, Pharmacist, LabTechnician, Appointment, MedicalRecord, Prescription, LabResult, Consent, Payment, Session, FileMetadata)

#### 2. **Backend ↔ IPFS (Pinata)**
- **Status**: ✅ CONNECTED
- **Connection**: Pinata JWT authentication
- **Location**: `server/.env` → `PINATA_JWT`
- **Service**: `server/services/ipfs.cjs`
- **Evidence**: Server logs show "IPFS Service initialized (Pinata)"
- **Usage**: File uploads for medical records, lab results, prescriptions

#### 3. **Backend ↔ Smart Contract (Sepolia)**
- **Status**: ✅ CONNECTED
- **Contract Address**: `0x2c0cE04B1013451660f62DE1292440e4bead3894`
- **Network**: Ethereum Sepolia Testnet
- **RPC**: Alchemy (`https://eth-sepolia.g.alchemy.com/v2/...`)
- **Location**: `server/.env` → `CONTRACT_ADDRESS`, `BLOCKCHAIN_RPC_URL`
- **Service**: `server/services/blockchain.cjs`
- **Evidence**: Server logs show "Blockchain service initialized"
- **Event Listeners**: Active (listening for blockchain events)

#### 4. **Backend ↔ AdminJS**
- **Status**: ✅ CONNECTED
- **URL**: `http://localhost:3003/admin`
- **Configuration**: `server/src/admin.js`
- **Resources**: All 13 database models configured
- **Authentication**: Email/Password (admin@elitetena.com / admin123)

#### 5. **Frontend ↔ Backend API** (PARTIAL)
- **Status**: ⚠️ PARTIALLY CONNECTED
- **Frontend Config**: `elite-tena-frontend/.env` → `VITE_API_URL=http://localhost:3003`
- **Backend Port**: `3003`
- **Axios Instance**: `elite-tena-frontend/src/lib/axios.ts`
- **Issue**: Axios configured for `http://localhost:5000/api` (wrong port!)
- **CORS**: Backend allows all origins in development

---

## ❌ NOT CONNECTED / ISSUES

### 1. **Frontend ↔ Backend API (Configuration Mismatch)**
- **Problem**: Frontend axios points to wrong URL
  - Axios config: `http://localhost:5000/api`
  - Backend actual: `http://localhost:3003/api`
- **Impact**: Frontend cannot communicate with backend
- **Fix Required**: Update `elite-tena-frontend/src/lib/axios.ts`

### 2. **Frontend ↔ Smart Contract (Not Integrated)**
- **Status**: ❌ NOT CONNECTED
- **Frontend has**: Contract address in `.env` (`VITE_CONTRACT_ADDRESS`)
- **Missing**: 
  - No Web3/Ethers.js integration in frontend
  - No contract ABI imported
  - No blockchain service/hooks
  - No MetaMask connection for blockchain transactions
- **Impact**: Frontend cannot interact with blockchain directly
- **Current Flow**: Frontend → Backend → Blockchain (backend acts as proxy)

### 3. **Frontend ↔ IPFS (Not Integrated)**
- **Status**: ❌ NOT CONNECTED
- **Frontend has**: Pinata gateway URL in `.env`
- **Missing**: 
  - No direct IPFS upload from frontend
  - No IPFS file retrieval logic
- **Current Flow**: Frontend → Backend → IPFS (backend handles all IPFS operations)

### 4. **Payment Gateway Integration**
- **Status**: ❌ NOT CONNECTED
- **Backend has**: Payment controller and routes
- **Missing**: 
  - No actual payment gateway (Stripe, PayPal, etc.)
  - Payment controller has placeholder logic only
- **Impact**: Cannot process real payments

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                   (React + TypeScript)                           │
│                   Port: 5173 (Vite Dev)                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Auth UI    │  │  Dashboard   │  │  Admin UI    │         │
│  │ Login/Reg    │  │  Patient/    │  │  Staff Mgmt  │         │
│  │              │  │  Doctor/Lab  │  │  Analytics   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ⚠️ ISSUE: Axios points to localhost:5000 (should be 3003)     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST API
                         │ (NOT WORKING - wrong port)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                    (Node.js + Express)                           │
│                      Port: 3003                                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  REST API    │  │   AdminJS    │  │  Services    │         │
│  │  Routes      │  │   Panel      │  │  Layer       │         │
│  │  /api/*      │  │   /admin     │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└───┬──────────────┬──────────────┬──────────────┬───────────────┘
    │              │              │              │
    │ ✅           │ ✅           │ ✅           │ ❌
    ↓              ↓              ↓              ↓
┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌──────────┐
│PostgreSQL│  │  IPFS   │  │   Smart     │  │ Payment  │
│Database │  │(Pinata) │  │  Contract   │  │ Gateway  │
│         │  │         │  │  (Sepolia)  │  │          │
│Port:5432│  │  Cloud  │  │  Ethereum   │  │   N/A    │
└─────────┘  └─────────┘  └─────────────┘  └──────────┘
```

---

## 📋 WHAT NEEDS TO BE CONNECTED

### 🔴 CRITICAL (Must Fix Now)

1. **Fix Frontend → Backend Connection**
   - Update axios baseURL from `localhost:5000` to `localhost:3003`
   - File: `elite-tena-frontend/src/lib/axios.ts`
   - Change: `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';`

### 🟡 IMPORTANT (Should Connect)

2. **Frontend → Smart Contract (Direct Integration)**
   - Install: `ethers` or `web3.js`
   - Create blockchain context/hooks
   - Import contract ABI
   - Add MetaMask wallet connection
   - Enable direct blockchain transactions from frontend

3. **Frontend → IPFS (Direct Upload)**
   - Add Pinata SDK to frontend
   - Enable direct file uploads from browser
   - Reduce backend load for file operations

### 🟢 OPTIONAL (Nice to Have)

4. **Payment Gateway Integration**
   - Choose provider (Stripe, PayPal, Chapa for Ethiopia)
   - Add SDK and API keys
   - Implement payment flows
   - Connect to backend payment controller

5. **Email Service**
   - Add email provider (SendGrid, AWS SES, Mailgun)
   - Send appointment confirmations
   - Send prescription notifications
   - Password reset emails

6. **SMS Notifications**
   - Add SMS provider (Twilio, Africa's Talking)
   - Appointment reminders
   - Lab result notifications

---

## 🔄 DATA FLOW EXAMPLES

### Current Flow: Medical Record Creation

```
Frontend (UI) 
    → ❌ BROKEN (wrong port)
    → Backend API (/api/medical-records)
    → PostgreSQL (save metadata)
    → IPFS (upload file)
    → Smart Contract (record hash)
    → Return to Frontend
```

### Current Flow: User Authentication

```
Frontend (Login Form)
    → ❌ BROKEN (wrong port)
    → Backend API (/api/auth/login)
    → PostgreSQL (verify credentials)
    → Generate JWT token
    → Return to Frontend
```

### Current Flow: File Upload

```
Frontend (Upload Button)
    → ❌ BROKEN (wrong port)
    → Backend API (/api/upload)
    → IPFS/Pinata (store file)
    → PostgreSQL (save metadata)
    → Return IPFS hash
```

---

## 🛠️ IMMEDIATE ACTION ITEMS

### Priority 1: Fix Frontend-Backend Connection
```typescript
// File: elite-tena-frontend/src/lib/axios.ts
// Change line 3 from:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// To:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';
```

### Priority 2: Test Connection
```bash
# Start backend (already running on port 3003)
cd server && npm start

# Start frontend (already running on port 5173)
cd elite-tena-frontend && npm run dev

# Test API connection
curl http://localhost:3003/api/health
```

### Priority 3: Add Frontend Blockchain Integration
```bash
cd elite-tena-frontend
npm install ethers
```

Then create:
- `src/contexts/Web3Context.tsx` - Web3 provider
- `src/hooks/useContract.ts` - Contract interaction hook
- `src/services/blockchain.ts` - Blockchain service

---

## 📊 CONNECTION HEALTH SUMMARY

| Component | Status | Health | Notes |
|-----------|--------|--------|-------|
| Backend → Database | ✅ Connected | 🟢 Healthy | All 13 models working |
| Backend → IPFS | ✅ Connected | 🟢 Healthy | Pinata JWT active |
| Backend → Blockchain | ✅ Connected | 🟢 Healthy | Sepolia contract deployed |
| Backend → AdminJS | ✅ Connected | 🟢 Healthy | All resources configured |
| Frontend → Backend | ❌ Broken | 🔴 Critical | Wrong port configuration |
| Frontend → Blockchain | ❌ Not Connected | 🟡 Missing | No Web3 integration |
| Frontend → IPFS | ❌ Not Connected | 🟡 Missing | No direct upload |
| Backend → Payment | ❌ Not Connected | 🟢 Optional | Placeholder only |
| Backend → Email | ❌ Not Connected | 🟢 Optional | Not implemented |
| Backend → SMS | ❌ Not Connected | 🟢 Optional | Not implemented |

---

## 🎯 RECOMMENDED INTEGRATION ORDER

1. **Fix axios URL** (5 minutes) - CRITICAL
2. **Test all API endpoints** (15 minutes)
3. **Add Web3 to frontend** (2-3 hours)
4. **Add direct IPFS upload** (1-2 hours)
5. **Integrate payment gateway** (4-6 hours)
6. **Add email notifications** (2-3 hours)
7. **Add SMS notifications** (2-3 hours)

---

## 📝 ENVIRONMENT VARIABLES SUMMARY

### Backend (.env)
- ✅ DATABASE_URL - PostgreSQL connection
- ✅ PINATA_JWT - IPFS authentication
- ✅ CONTRACT_ADDRESS - Smart contract
- ✅ BLOCKCHAIN_RPC_URL - Ethereum RPC
- ✅ PRIVATE_KEY - Wallet for transactions
- ❌ PAYMENT_API_KEY - Not configured
- ❌ EMAIL_API_KEY - Not configured
- ❌ SMS_API_KEY - Not configured

### Frontend (.env)
- ✅ VITE_API_URL - Backend URL (correct: 3003)
- ✅ VITE_CONTRACT_ADDRESS - Smart contract
- ✅ VITE_CHAIN_ID - Sepolia (11155111)
- ✅ VITE_RPC_URL - Ethereum RPC
- ✅ VITE_PINATA_GATEWAY - IPFS gateway

---

**Last Updated**: November 29, 2025
**System Status**: Backend fully operational, Frontend needs connection fix
