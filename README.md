# Elite-Tena: Web3 Healthcare Management System

A decentralized healthcare platform built on Ethereum, IPFS, and Node.js.

## Project Structure
- `backend/` - Smart contracts (Solidity/Hardhat)
- `server/` - Node.js backend API
- `frontend/` - React frontend
- `shared/` - Shared contract ABIs
- `deployments/` - Deployment records

## Quick Start
1. Clone repository
2. Run `docker-compose up -d`
3. Deploy contracts: `cd backend && npm run deploy`
4. Start backend: `cd server && npm run dev`
5. Start frontend: `cd frontend && npm start`