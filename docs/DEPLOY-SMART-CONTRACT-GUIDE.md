# 🚀 Smart Contract Deployment Guide

## ⚠️ Current Issue

You're on branch: `restructure/cloned-to-frontend-layout`

The smart contract files (contracts/, scripts/, test/) are **missing** from your current branch.

---

## 📁 What's Missing

From `elite-tena-smart-contracts/`:
- ❌ `contracts/` folder (EliteHealthSystemEnhanced.sol)
- ❌ `scripts/` folder (deploy-enhanced.js)
- ❌ `test/` folder (test files)

What exists:
- ✅ `hardhat.config.js`
- ✅ `package.json`
- ✅ `artifacts/` (compiled contracts)
- ✅ `node_modules/`

---

## 🔧 Solution Options

### Option 1: Switch to Main Branch (Recommended)

```bash
# Save your current work
git stash

# Switch to main branch (or the branch with contracts)
git checkout main

# Navigate to contracts folder
cd elite-tena-smart-contracts

# Deploy
npx hardhat run scripts/deploy-enhanced.js --network localhost
```

### Option 2: Copy Files from Another Branch

```bash
# Check out the contract files from main branch
git checkout main -- elite-tena-smart-contracts/contracts
git checkout main -- elite-tena-smart-contracts/scripts
git checkout main -- elite-tena-smart-contracts/test

# Then deploy
cd elite-tena-smart-contracts
npx hardhat run scripts/deploy-enhanced.js --network localhost
```

### Option 3: Use the Cloned Folder

If you have the files in `elitetena-cloned/`:

```bash
cd elitetena-cloned/elite-tena-smart-contracts
npx hardhat run scripts/deploy-enhanced.js --network localhost
```

---

## 📝 Quick Deployment Steps (Once Files Are Available)

### Step 1: Start Local Blockchain (Optional)

**Terminal 1:**
```bash
cd elite-tena-smart-contracts
npx hardhat node
```

This starts a local Ethereum network on `http://127.0.0.1:8545`

### Step 2: Deploy Contract

**Terminal 2:**
```bash
cd elite-tena-smart-contracts

# Deploy to local network
npx hardhat run scripts/deploy-enhanced.js --network localhost

# OR deploy to Sepolia testnet
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

### Step 3: Save Contract Address

After deployment, you'll see:
```
✅ EliteHealthSystemEnhanced deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Copy this address!**

### Step 4: Update Backend .env

Add the contract address to `server/.env`:
```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
```

### Step 5: Restart Backend

The backend will automatically connect to the smart contract.

---

## 🌐 Deployment Networks

### Local Network (Development)
```bash
# Start local blockchain
npx hardhat node

# Deploy
npx hardhat run scripts/deploy-enhanced.js --network localhost
```

**Pros:**
- Fast
- Free
- Full control
- Reset anytime

**Cons:**
- Only local
- Data lost on restart

### Sepolia Testnet (Testing)
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

**Pros:**
- Real blockchain
- Persistent
- Shareable
- Free testnet ETH

**Cons:**
- Need testnet ETH
- Slower than local
- Public

**Get Sepolia ETH:**
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

### Mainnet (Production)
```bash
# Deploy to mainnet (COSTS REAL MONEY!)
npx hardhat run scripts/deploy-enhanced.js --network mainnet
```

**Only do this when:**
- ✅ Fully tested
- ✅ Security audited
- ✅ Ready for production
- ✅ Have real ETH for gas

---

## 🔍 Verify Your Setup

Before deploying, check:

```bash
cd elite-tena-smart-contracts

# Check if files exist
ls contracts/
ls scripts/
ls test/

# Should see:
# contracts/EliteHealthSystemEnhanced.sol
# scripts/deploy-enhanced.js
# test/EliteHealthSystemEnhanced.test.js
```

---

## 🧪 Test Before Deploying

```bash
cd elite-tena-smart-contracts

# Run tests
npx hardhat test

# Should show:
# 37 passing tests
```

---

## 📊 Expected Deployment Output

```
Deploying EliteHealthSystemEnhanced...

Network: localhost
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Balance: 10000.0 ETH

Deploying contract...
✅ EliteHealthSystemEnhanced deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Contract Details:
  - Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  - Transaction: 0x...
  - Block: 1
  - Gas Used: 3,500,000

Deployment complete!
```

---

## 🐛 Troubleshooting

### Error: "Script doesn't exist"
**Problem:** You're not in the right directory or files are missing  
**Solution:** Check you're in `elite-tena-smart-contracts/` and files exist

### Error: "Not inside a Hardhat project"
**Problem:** You're in the wrong directory  
**Solution:** `cd elite-tena-smart-contracts`

### Error: "Network not found"
**Problem:** Network not configured in hardhat.config.js  
**Solution:** Check hardhat.config.js has the network defined

### Error: "Insufficient funds"
**Problem:** Deployer account has no ETH  
**Solution:** 
- Local: Use Hardhat's default accounts (pre-funded)
- Testnet: Get testnet ETH from faucet
- Mainnet: Add real ETH to deployer wallet

---

## 💡 Pro Tips

1. **Always test first:** `npx hardhat test`
2. **Use local network for development:** Fast and free
3. **Use testnet before mainnet:** Catch issues early
4. **Save contract address:** You'll need it everywhere
5. **Verify on Etherscan:** Makes contract readable

---

## 📝 After Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract address saved
- [ ] Updated `server/.env` with CONTRACT_ADDRESS
- [ ] Backend restarted
- [ ] Backend connected to contract
- [ ] Tested contract functions
- [ ] Verified on Etherscan (if testnet/mainnet)

---

## 🎯 Current Status

**Your Situation:**
- ✅ Backend working
- ✅ Database connected
- ✅ IPFS working
- ❌ Smart contract files missing from current branch
- ❌ Contract not deployed

**Next Steps:**
1. Get the contract files (switch branch or copy)
2. Deploy to local network
3. Update backend .env
4. Test integration

---

## 📞 Quick Commands Reference

```bash
# Navigate to contracts
cd elite-tena-smart-contracts

# Check files exist
ls contracts/ scripts/ test/

# Run tests
npx hardhat test

# Start local blockchain
npx hardhat node

# Deploy to local
npx hardhat run scripts/deploy-enhanced.js --network localhost

# Deploy to Sepolia
npx hardhat run scripts/deploy-enhanced.js --network sepolia

# Compile contracts
npx hardhat compile

# Clean and recompile
npx hardhat clean
npx hardhat compile
```

---

**Current Issue:** Contract files missing from your branch  
**Solution:** Switch to main branch or copy files  
**Time to Deploy:** 5 minutes (once files are available)

---

**Need the contract files? Let me know which branch has them!**
