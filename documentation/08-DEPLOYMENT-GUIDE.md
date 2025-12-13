# Elite-Tena Healthcare Management System
## Part 8: Deployment Guide

---

## 8.1 System Requirements

### Hardware Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| Network | 10 Mbps | 100+ Mbps |

### Software Dependencies
```
Node.js:        18.x or higher
PostgreSQL:     14.x or higher
Redis:          6.x (optional, for caching)
npm/yarn:       Latest stable
Git:            Latest stable
```

### Browser Compatibility
| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 8.2 Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/elite-tena.git
cd elite-tena
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Frontend dependencies
cd ../frontend && npm install

# Smart contracts
cd ../elite-tena-smart-contracts && npm install
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb elite_tena

# Or using psql
psql -U postgres
CREATE DATABASE elite_tena;
\q
```

### 4. Environment Configuration

**Server (.env)**
```env
# Server
PORT=3003
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_session_secret_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elite_tena
DB_USER=postgres
DB_PASSWORD=your_password

# Blockchain (Sepolia Testnet)
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
CONTRACT_ADDRESS=0x2c0cE04B1013451660f62DE1292440e4bead3894
PRIVATE_KEY=0x_your_private_key

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Admin
ADMIN_EMAIL=admin@elitetena.com
ADMIN_WALLET_ADDRESS=0x_admin_wallet
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3003/api
VITE_SOCKET_URL=http://localhost:3003
VITE_CONTRACT_ADDRESS=0x2c0cE04B1013451660f62DE1292440e4bead3894
```

### 5. Run Migrations
```bash
cd server
node run-migration.js
```

### 6. Start Development Servers
```bash
# Option 1: Use start script
./start-dev.bat  # Windows
./start-dev.sh   # Linux/Mac

# Option 2: Manual start
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 7. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3003/api
- Admin Panel: http://localhost:3003/admin
- Health Check: http://localhost:3003/api/health

---

## 8.3 Smart Contract Deployment

### Deploy to Sepolia Testnet
```bash
cd elite-tena-smart-contracts

# Compile contracts
npx hardhat compile

# Deploy
npx hardhat run scripts/deploy-enhanced.js --network sepolia

# Export ABI for frontend/backend
node scripts/export-abi.js
```

### Verify Contract
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

---

## 8.4 Production Deployment

### Docker Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: elite_tena
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./server
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    ports:
      - "3003:3003"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Build Commands
```bash
# Build frontend
cd frontend && npm run build

# Build backend (if using TypeScript)
cd server && npm run build
```

### Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start server/src/server.js --name elite-tena-api

# Monitor
pm2 monit

# Logs
pm2 logs elite-tena-api
```

---

## 8.5 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Smart contract deployed and verified
- [ ] SSL certificates installed
- [ ] CORS origins configured for production
- [ ] Rate limiting configured
- [ ] Error logging setup

### Post-Deployment
- [ ] Health check endpoint responding
- [ ] Database connection verified
- [ ] Blockchain connection verified
- [ ] IPFS connection verified
- [ ] WebSocket connections working
- [ ] Admin panel accessible
- [ ] Test user registration
- [ ] Test appointment booking

---

## 8.6 Maintenance Procedures

### Database Backup
```bash
# Daily backup script
pg_dump -U postgres elite_tena > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres elite_tena < backup_20250112.sql
```

### Log Rotation
```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Monitoring
```bash
# Check API health
curl http://localhost:3003/api/health

# Check database status
curl http://localhost:3003/api/db-status
```

### Update Procedure
```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install
cd server && npm install
cd ../frontend && npm install

# Run migrations
cd server && node run-migration.js

# Rebuild frontend
cd ../frontend && npm run build

# Restart services
pm2 restart all
```
