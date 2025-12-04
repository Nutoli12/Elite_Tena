# 🚀 Deploy to Sepolia Testnet - Complete Guide

**Time:** 15 minutes  
**Cost:** $0.00 (FREE)  
**Result:** Contract on public blockchain

---

## ✅ PRE-FLIGHT CHECK

Before starting, verify:
- [x] Local system working (you have this!)
- [x] Hardhat configured for Sepolia (you have this!)
- [x] Contract compiled (you have this!)
- [ ] Test ETH in wallet
- [ ] Alchemy API key
- [ ] Etherscan API key

---

## 📋 STEP-BY-STEP EXECUTION

### Step 1: Get Test ETH (5 minutes)

**Visit:** https://sepoliafaucet.com/

**Process:**
1. Open MetaMask
2. Switch to Sepolia network
3. Copy your wallet address
4. Paste on faucet website
5. Click "Send Me ETH"
6. Wait 1-2 minutes
7. Check MetaMask - you should have 0.5 ETH

**Alternative Faucets:**
- https://faucet.quicknode.com/ethereum/sepolia
- https://www.infura.io/faucet/sepolia
- https://faucets.chain.link/sepolia

**Verify:**
```bash
# Check your balance on Etherscan
# https://sepolia.etherscan.io/address/YOUR_WALLET_ADDRESS
```

---

### Step 2: Get Alchemy API Key (3 minutes)

**Visit:** https://www.alchemy.com/

**Process:**
1. Sign up (free account)
2. Click "Create App"
3. Fill in:
   - Name: Elite Tena
   - Chain: Ethereum
   - Network: Sepolia
4. Click "Create App"
5. Click "API Key" button
6. Copy the API key

**Your RPC URL will be:**
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

---

### Step 3: Get Etherscan API Key (2 minutes)

**Visit:** https://etherscan.io/register

**Process:**
1. Sign up (free account)
2. Verify email
3. Go to: https://etherscan.io/myapikey
4. Click "Add" button
5. Name it: Elite Tena
6. Copy the API key

---

### Step 4: Configure Environment (1 minute)

```bash
cd elite-tena-smart-contracts

# Create .env if it doesn't exist
# (It should already exist from hardhat.config.js update)

# Edit .env file with:
```

**Add to `.env`:**
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_metamask_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Get Private Key from MetaMask:**
1. Open MetaMask
2. Click 3 dots (⋮)
3. Account Details
4. Export Private Key
5. Enter password
6. Copy private key

⚠️ **SECURITY WARNING:**
- Use a TEST wallet only!
- Never share private key
- Never commit .env to Git

---

### Step 5: Deploy to Sepolia (2 minutes)

```bash
cd elite-tena-smart-contracts

# Compile (if needed)
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

**Expected Output:**
```
🚀 Deploying EliteHealthSystemEnhanced...

📝 Deploying with account: 0x...
💰 Account balance: 0.5 ETH

⏳ Deploying contract to network: sepolia
✅ EliteHealthSystemEnhanced deployed to: 0x...
📝 Transaction hash: 0x...

💰 Registration Fees:
   Patient:         0.01 ETH
   Doctor:          0.02 ETH
   Pharmacist:      0.015 ETH
   Lab Technician:  0.015 ETH
   Appointment:     0.05 ETH

⏳ Waiting for 6 block confirmations...
🔍 Verifying contract on Etherscan...
✅ Contract verified on Etherscan

🎉 Deployment completed successfully!

💾 Deployment info saved to: deployment-enhanced-sepolia.json
```

**IMPORTANT:** Copy the contract address!

---

### Step 6: Verify Contract (Automatic)

The deployment script automatically verifies on Etherscan.

**If verification fails, manually verify:**
```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

**Check on Etherscan:**
```
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
```

You should see:
- ✅ Green checkmark (verified)
- Contract code visible
- Read/Write contract tabs

---

### Step 7: Update Backend Configuration (1 minute)

```bash
cd ../server

# Backup current .env
cp .env .env.backup

# Update .env with Sepolia contract
```

**Edit `server/.env`:**
```env
# Update these lines:
CONTRACT_ADDRESS=0xYourSepoliaContractAddress
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
```

---

### Step 8: Restart Backend (1 minute)

```bash
cd server

# Stop current server (Ctrl+C in terminal)

# Start with new configuration
npm start
```

**Expected Output:**
```
✅ Database connected
✅ Blockchain listener initialized
✅ Connected to contract at: 0xYourSepoliaAddress
✅ All blockchain event listeners active
🎉 Elite-Tena Backend Server Started Successfully!
```

---

### Step 9: Test Sepolia Integration (2 minutes)

```bash
# Test health
curl http://localhost:3003/api/health

# Check backend logs for:
# "Connected to contract at: 0x..."
# "Blockchain listeners active"
```

**Test on Etherscan:**
1. Go to your contract on Etherscan
2. Click "Read Contract"
3. Try reading functions:
   - patientFee (should show 0.01 ETH)
   - doctorFee (should show 0.02 ETH)
   - admin (should show your wallet address)

---

## ✅ SUCCESS CHECKLIST

After deployment, verify:
- [ ] Contract deployed to Sepolia
- [ ] Contract verified on Etherscan (green checkmark)
- [ ] Can view contract on https://sepolia.etherscan.io/
- [ ] Contract address saved
- [ ] Backend .env updated
- [ ] Backend restarted successfully
- [ ] Backend connected to Sepolia contract
- [ ] Event listeners active
- [ ] Can read contract functions on Etherscan

---

## 🎯 WHAT YOU NOW HAVE

**Smart Contract:**
- ✅ Deployed on Sepolia testnet
- ✅ Verified on Etherscan
- ✅ Publicly accessible
- ✅ Ready for testing

**Backend:**
- ✅ Connected to Sepolia contract
- ✅ Event listeners active
- ✅ Ready to sync blockchain events
- ✅ Ready for frontend integration

**Cost:** $0.00 (used free test ETH)

---

## 📊 DEPLOYMENT INFO

**Network:** Sepolia Testnet  
**Chain ID:** 11155111  
**Explorer:** https://sepolia.etherscan.io/  
**Faucet:** https://sepoliafaucet.com/  

**Your Contract:**
- Address: (saved in deployment-enhanced-sepolia.json)
- Etherscan: https://sepolia.etherscan.io/address/YOUR_ADDRESS
- Network: Sepolia
- Status: Verified ✅

---

## 🆘 TROUBLESHOOTING

### "Insufficient funds"
- Get more test ETH from faucets
- Check balance: https://sepolia.etherscan.io/address/YOUR_ADDRESS

### "Invalid API key"
- Verify Alchemy key is correct
- Ensure you created app for Sepolia network
- Check for extra spaces in .env

### "Nonce too high"
- MetaMask → Settings → Advanced
- Clear activity tab data
- Try again

### "Verification failed"
- Wait 2-3 minutes for confirmations
- Try manual verification:
  ```bash
  npx hardhat verify --network sepolia YOUR_ADDRESS
  ```

### "Cannot connect to contract"
- Check CONTRACT_ADDRESS in server/.env
- Check BLOCKCHAIN_RPC_URL is correct
- Restart backend server

---

## 🎉 CONGRATULATIONS!

You now have:
- ✅ Contract on public blockchain (Sepolia)
- ✅ Backend connected to public blockchain
- ✅ Everything still FREE
- ✅ Ready for Phase 4 (Railway hosting)

**Next:** Deploy backend to Railway for public access!

---

**Time Spent:** ~15 minutes  
**Cost:** $0.00  
**Status:** READY FOR PHASE 4 ✅
