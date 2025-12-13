# Elite-Tena Healthcare Management System
## Part 2: System Architecture

---

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TS)                     │
│  Patient | Doctor | Pharmacist | Lab Tech | Admin Dashboards │
│  AuthContext | Web3Service | SocketContext | ConsentGate     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/WSS
┌──────────────────────────▼──────────────────────────────────┐
│                   BACKEND (Node.js + Express)                │
│  Routes: /auth /appointments /medical-records /consent       │
│  Services: Blockchain | IPFS | Notification | Socket         │
└────────┬─────────────────┬─────────────────┬────────────────┘
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │PostgreSQL│      │   IPFS    │    │ Ethereum  │
    │ Database │      │  Pinata   │    │  Sepolia  │
    └──────────┘      └───────────┘    └───────────┘
```

## 2.2 Directory Structure

```
elite-tena/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # UI components by feature
│   │   ├── contexts/         # React contexts (Auth, Socket, Web3)
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── types/            # TypeScript definitions
│   └── package.json
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Auth, validation
│   ├── services/             # External services (blockchain, IPFS)
│   └── migrations/           # Database migrations
├── elite-tena-smart-contracts/  # Solidity contracts
│   ├── contracts/
│   └── scripts/
└── docs/                     # Documentation
```

## 2.3 Component Communication

### API Communication Flow
```
Frontend → Axios → Express Routes → Controllers → Services → Database/Blockchain
```

### Real-time Communication
```
Frontend ←→ Socket.io ←→ Backend (Notifications, Chat, Video Calls)
```

### Blockchain Integration
```
Frontend (ethers.js) → Smart Contract → Sepolia Network
Backend (blockchain.cjs) → Smart Contract → Event Listeners → Database Sync
```
