# Elite-Tena Healthcare Management System
## Part 11: Appendix

---

## A. Glossary of Terms

| Term | Definition |
|------|------------|
| **Wallet Address** | Ethereum address (0x...) used as user identifier |
| **Consent** | Permission granted by patient for data access |
| **IPFS** | InterPlanetary File System - decentralized storage |
| **Smart Contract** | Self-executing code on Ethereum blockchain |
| **Sepolia** | Ethereum test network for development |
| **JWT** | JSON Web Token for authentication |
| **Peer-to-Peer Payment** | Direct payment between patient and doctor |
| **Telebirr** | Ethiopian mobile money service |
| **CBE Birr** | Commercial Bank of Ethiopia mobile banking |
| **ETB** | Ethiopian Birr (currency) |
| **ICD-10** | International Classification of Diseases codes |
| **RBAC** | Role-Based Access Control |

---

## B. Environment Variables Reference

### Server Environment Variables
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | `3003` |
| `NODE_ENV` | Yes | Environment | `development` |
| `JWT_SECRET` | Yes | JWT signing key | `your_secret_key` |
| `SESSION_SECRET` | Yes | Session secret | `session_secret` |
| `DB_HOST` | Yes | Database host | `localhost` |
| `DB_PORT` | Yes | Database port | `5432` |
| `DB_NAME` | Yes | Database name | `elite_tena` |
| `DB_USER` | Yes | Database user | `postgres` |
| `DB_PASSWORD` | Yes | Database password | `password` |
| `BLOCKCHAIN_RPC_URL` | Yes | Ethereum RPC URL | `https://sepolia.infura.io/v3/KEY` |
| `CONTRACT_ADDRESS` | Yes | Smart contract address | `0x...` |
| `PRIVATE_KEY` | Yes | Ethereum private key | `0x...` |
| `PINATA_API_KEY` | Yes | Pinata API key | `key` |
| `PINATA_SECRET_KEY` | Yes | Pinata secret | `secret` |
| `ADMIN_EMAIL` | No | Admin email | `admin@elitetena.com` |
| `ADMIN_WALLET_ADDRESS` | No | Admin wallet | `0x...` |

### Frontend Environment Variables
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `http://localhost:3003/api` |
| `VITE_SOCKET_URL` | Yes | WebSocket URL | `http://localhost:3003` |
| `VITE_CONTRACT_ADDRESS` | Yes | Contract address | `0x...` |

---

## C. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 401 | Token expired |
| `AUTH_003` | 401 | Invalid token |
| `AUTH_004` | 403 | Insufficient permissions |
| `CONSENT_001` | 403 | No active consent |
| `CONSENT_002` | 404 | Consent not found |
| `CONSENT_003` | 400 | Consent already exists |
| `APPT_001` | 404 | Appointment not found |
| `APPT_002` | 400 | Invalid appointment date |
| `APPT_003` | 409 | Time slot unavailable |
| `PAY_001` | 400 | Payment failed |
| `PAY_002` | 404 | Payment not found |
| `DB_001` | 500 | Database error |
| `BC_001` | 500 | Blockchain error |

---

## D. API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)",
  "code": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## E. Database Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Appointments
CREATE INDEX idx_appointments_patient ON appointments(patientWallet);
CREATE INDEX idx_appointments_doctor ON appointments(doctorWallet);
CREATE INDEX idx_appointments_date ON appointments(appointmentDate);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Consents
CREATE INDEX idx_consents_patient ON consents(patientWalletAddress);
CREATE INDEX idx_consents_doctor ON consents(doctorWalletAddress);
CREATE INDEX idx_consents_status ON consents(status);

-- Medical Records
CREATE INDEX idx_records_patient ON medical_records(patientWalletAddress);
CREATE INDEX idx_records_doctor ON medical_records(doctorWalletAddress);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(userId);
CREATE INDEX idx_notifications_read ON notifications(isRead);
```

---

## F. Useful Commands

### Database
```bash
# Connect to database
psql -U postgres -d elite_tena

# Backup database
pg_dump -U postgres elite_tena > backup.sql

# Restore database
psql -U postgres elite_tena < backup.sql

# Run migrations
cd server && node run-migration.js
```

### Development
```bash
# Start development servers
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Check logs
pm2 logs elite-tena-api
```

### Blockchain
```bash
# Compile contracts
cd elite-tena-smart-contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy-enhanced.js --network sepolia

# Verify contract
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

---

## G. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial release |

---

## H. Contact Information

- **Technical Support:** support@elitetena.com
- **Documentation:** docs@elitetena.com
- **Emergency:** +251-XXX-XXXXXX
