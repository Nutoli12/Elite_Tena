# Elite-Tena Healthcare Management System
## Complete Technical Documentation - Master Index

**Version:** 1.0.0  
**Last Updated:** December 12, 2025  
**Document Type:** Comprehensive System Documentation

---

## 📚 Documentation Index

This documentation is organized into separate files for easier navigation:

| Part | Document | Description |
|------|----------|-------------|
| 1 | [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md) | System introduction, features, tech stack |
| 2 | [02-SYSTEM-ARCHITECTURE.md](02-SYSTEM-ARCHITECTURE.md) | Architecture diagrams, directory structure |
| 3 | [03-DATABASE-SCHEMA.md](03-DATABASE-SCHEMA.md) | Complete database schema, relationships |
| 4 | [04-API-DOCUMENTATION.md](04-API-DOCUMENTATION.md) | All API endpoints with examples |
| 5 | [05-USER-FLOWS.md](05-USER-FLOWS.md) | Workflows for all user roles |
| 6 | [06-TECHNICAL-IMPLEMENTATION.md](06-TECHNICAL-IMPLEMENTATION.md) | Code examples, integrations |
| 7 | [07-SECURITY-COMPLIANCE.md](07-SECURITY-COMPLIANCE.md) | Security measures, compliance |
| 8 | [08-DEPLOYMENT-GUIDE.md](08-DEPLOYMENT-GUIDE.md) | Setup and deployment instructions |
| 9 | [09-USER-GUIDES.md](09-USER-GUIDES.md) | User manuals for all roles |
| 10 | [10-TESTING-GUIDE.md](10-TESTING-GUIDE.md) | Test cases and procedures |
| 11 | [11-APPENDIX.md](11-APPENDIX.md) | Glossary, env vars, error codes |

---

## 🚀 Quick Start

### For Developers
1. Read [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md) for system understanding
2. Follow [08-DEPLOYMENT-GUIDE.md](08-DEPLOYMENT-GUIDE.md) for setup
3. Reference [04-API-DOCUMENTATION.md](04-API-DOCUMENTATION.md) for API integration

### For Users
1. Read [09-USER-GUIDES.md](09-USER-GUIDES.md) for your role
2. Follow step-by-step instructions

### For Administrators
1. Read [07-SECURITY-COMPLIANCE.md](07-SECURITY-COMPLIANCE.md)
2. Follow [08-DEPLOYMENT-GUIDE.md](08-DEPLOYMENT-GUIDE.md)

---

## 📋 System Summary

### What is Elite-Tena?
A blockchain-integrated healthcare management system for Ethiopia featuring:
- **Web3 Authentication** (MetaMask + Email)
- **Patient-Controlled Consent** (Grant/Revoke access)
- **Peer-to-Peer Payments** (Telebirr/CBE Birr)
- **Telemedicine** (Video calls, Chat)
- **Blockchain Records** (Ethereum Sepolia)
- **IPFS Storage** (Pinata)

### User Roles
| Role | Capabilities |
|------|--------------|
| Patient | Book appointments, manage consent, view records |
| Doctor | Consultations, prescriptions, lab orders |
| Pharmacist | Dispense prescriptions |
| Lab Technician | Process and upload lab results |
| Admin | User management, system monitoring |

### Technology Stack
```
Frontend:  React 18 + TypeScript + Tailwind CSS
Backend:   Node.js + Express + Sequelize
Database:  PostgreSQL
Blockchain: Ethereum Sepolia + Solidity
Storage:   IPFS (Pinata)
Real-time: Socket.io
```

---

## 📞 Support

- **Email:** support@elitetena.com
- **Documentation Issues:** Create GitHub issue
- **Emergency:** Contact system administrator

### Solution Overview
Elite-Tena addresses these challenges through:
- **Blockchain-backed medical records** - Immutable, verifiable health data on Ethereum/Sepolia
- **Patient-controlled consent system** - Granular permission management for data access
- **Smart scheduling** - Intelligent appointment booking with queue management
- **Peer-to-peer payments** - Direct doctor-patient payments via Telebirr/CBE Birr
- **Telemedicine integration** - Video calls and chat for remote consultations
- **IPFS storage** - Decentralized file storage for medical documents

### Key Features
| Feature | Description |
|---------|-------------|
| Web3 Authentication | MetaMask wallet + Email/Password login |
| Consent Management | Patient-controlled data access permissions |
| Smart Scheduling | Intelligent appointment booking with conflict prevention |
| Video Consultations | Daily.co integrated telemedicine |
| Real-time Chat | Socket.io powered messaging |
| Blockchain Records | Ethereum-based medical record verification |
| IPFS Storage | Decentralized document storage via Pinata |
| Peer-to-Peer Payments | Direct Telebirr/CBE Birr payments |
| Multi-role Support | Patient, Doctor, Pharmacist, Lab Tech, Admin |

### Target Users
1. **Patients** - Ethiopian citizens seeking healthcare services
2. **Doctors** - Licensed medical practitioners
3. **Pharmacists** - Pharmacy staff for prescription dispensing
4. **Lab Technicians** - Laboratory personnel for test processing
5. **Administrators** - System administrators and healthcare facility managers

## 1.2 Technology Stack

### Frontend Technologies
```
Framework:        React 18 + TypeScript
Build Tool:       Vite
Styling:          Tailwind CSS
State Management: React Context API
Animations:       Framer Motion
Internationalization: i18next
Web3:             ethers.js v6
HTTP Client:      Axios
Real-time:        Socket.io Client
```

### Backend Technologies
```
Runtime:          Node.js 18+
Framework:        Express.js
ORM:              Sequelize v6
Authentication:   JWT + Web3 Signatures
Real-time:        Socket.io
File Upload:      Multer
Admin Panel:      AdminJS
```

### Database Systems
```
Primary DB:       PostgreSQL 14+
Cache:            Redis (optional)
File Storage:     IPFS via Pinata
```

### Blockchain Integration
```
Network:          Ethereum Sepolia Testnet
Smart Contracts:  Solidity 0.8.20
Development:      Hardhat
Libraries:        OpenZeppelin Contracts
```

### Third-party Integrations
```
Video Calls:      Daily.co
IPFS:             Pinata SDK
Payments:         Telebirr, CBE Birr (peer-to-peer)
```

---

# PART 2: SYSTEM ARCHITECTURE

## 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELITE-TENA ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND (React + TypeScript)                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│  │  │ Patient │ │ Doctor  │ │Pharmacist│ │Lab Tech │ │  Admin  │        │   │
│  │  │Dashboard│ │Dashboard│ │Dashboard │ │Dashboard│ │Dashboard│        │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │   │
│  │       │           │           │           │           │              │   │
│  │  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐        │   │
│  │  │              Shared Components & Services                │        │   │
│  │  │  • AuthContext  • Web3Service  • SocketContext          │        │   │
│  │  │  • ConsentGate  • NavigationService  • Axios Client     │        │   │
│  │  └─────────────────────────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ HTTPS/WSS                               │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      BACKEND (Node.js + Express)                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                         API Routes                               │ │   │
│  │  │  /auth  /appointments  /medical-records  /consent  /payments    │ │   │
│  │  │  /prescriptions  /lab-results  /chat  /video-calls  /admin      │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                        Services Layer                            │ │   │
│  │  │  • BlockchainService  • IPFSService  • NotificationService      │ │   │
│  │  │  • SocketService  • QueueService  • SlotManager                 │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                    │                    │                    │               │
│                    ▼                    ▼                    ▼               │
│  ┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │     PostgreSQL       │ │      IPFS        │ │   Ethereum Blockchain    │ │
│  │  ┌────────────────┐  │ │  ┌────────────┐  │ │  ┌──────────────────┐   │ │
│  │  │ Users          │  │ │  │ Medical    │  │ │  │ EliteHealthSystem│   │ │
│  │  │ Appointments   │  │ │  │ Documents  │  │ │  │ Enhanced.sol     │   │ │
│  │  │ MedicalRecords │  │ │  │ Lab Results│  │ │  │ • Consent Mgmt   │   │ │
│  │  │ Consents       │  │ │  │ Receipts   │  │ │  │ • Record Storage │   │ │
│  │  │ Prescriptions  │  │ │  └────────────┘  │ │  │ • Prescriptions  │   │ │
│  │  │ Payments       │  │ │       │          │ │  │ • Lab Results    │   │ │
│  │  │ Notifications  │  │ │       │ Pinata   │ │  └──────────────────┘   │ │
│  │  └────────────────┘  │ │       ▼          │ │           │             │ │
│  └──────────────────────┘ └──────────────────┘ │     Sepolia Testnet     │ │
│                                                 └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPOINTMENT BOOKING FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Patient                    Backend                    Doctor                │
│     │                          │                          │                  │
│     │  1. Select Doctor        │                          │                  │
│     │─────────────────────────>│                          │                  │
│     │                          │                          │                  │
│     │  2. Get Available Slots  │                          │                  │
│     │<─────────────────────────│                          │                  │
│     │                          │                          │                  │
│     │  3. Book Appointment     │                          │                  │
│     │─────────────────────────>│                          │                  │
│     │                          │  4. Notify Doctor        │                  │
│     │  