# Elite-Tena Healthcare Management System
## Part 1: Project Overview

**Version:** 1.0.0 | **Last Updated:** December 12, 2025

---

## 1.1 System Introduction

### Purpose and Vision
Elite-Tena is a blockchain-integrated healthcare management system designed for the Ethiopian healthcare market, providing secure, transparent patient-doctor interactions with Web3 technology.

### Problem Statement
- Fragmented medical records across facilities
- Lack of patient data ownership and privacy control
- Inefficient appointment scheduling
- Limited telemedicine capabilities
- Complex payment processes

### Solution Overview
- **Blockchain-backed records** - Immutable health data on Ethereum Sepolia
- **Patient-controlled consent** - Granular permission management
- **Smart scheduling** - Intelligent booking with queue management
- **Peer-to-peer payments** - Direct Telebirr/CBE Birr payments
- **Telemedicine** - Video calls and chat consultations
- **IPFS storage** - Decentralized document storage

### Key Features
| Feature | Description |
|---------|-------------|
| Web3 Authentication | MetaMask wallet + Email/Password |
| Consent Management | Patient-controlled data access |
| Smart Scheduling | Conflict-free appointment booking |
| Video Consultations | Daily.co telemedicine |
| Real-time Chat | Socket.io messaging |
| Blockchain Records | Ethereum verification |
| IPFS Storage | Pinata document storage |
| Peer-to-Peer Payments | Telebirr/CBE Birr |

### Target Users
1. **Patients** - Ethiopian citizens seeking healthcare
2. **Doctors** - Licensed medical practitioners
3. **Pharmacists** - Prescription dispensing staff
4. **Lab Technicians** - Laboratory personnel
5. **Administrators** - System managers

---

## 1.2 Technology Stack

### Frontend
```
React 18 + TypeScript | Vite | Tailwind CSS
Framer Motion | i18next | ethers.js v6
Socket.io Client | Axios
```

### Backend
```
Node.js 18+ | Express.js | Sequelize v6
JWT + Web3 Auth | Socket.io | AdminJS
```

### Database & Storage
```
PostgreSQL 14+ | Redis (optional)
IPFS via Pinata
```

### Blockchain
```
Ethereum Sepolia | Solidity 0.8.20
Hardhat | OpenZeppelin
```
