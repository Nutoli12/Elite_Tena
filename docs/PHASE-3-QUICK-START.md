# ⚡ Phase 3: Quick Start Checklist

**Time:** 15 minutes  
**Cost:** $0.00  
**Status:** Ready to execute!

---

## 📋 QUICK CHECKLIST

### ☐ Step 1: Get Test ETH (5 min)
1. Open MetaMask
2. Switch to Sepolia network
3. Visit: https://sepoliafaucet.com/
4. Request 0.5 ETH
5. Wait for confirmation

**Verify:** Check MetaMask shows 0.5 ETH on Sepolia

---

### ☐ Step 2: Get Alchemy API Key (3 min)
1. Visit: https://www.alchemy.com/
2. Sign up (free)
3. Create App → Ethereum → Sepolia
4. Copy API key

**Save:** Your RPC URL will be:
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

---

### ☐ Step 3: Get Etherscan API Key (2 min)
1. Visit: https://etherscan.io/register
2. Sign up (free)
3. Go to: https://etherscan.io/myapikey
4. Create new key
5. Copy API key

---

### ☐ Step 4: Get MetaMask Private Key (1 min)
1. Open MetaMask
2. Click ⋮ (3 dots)
3. Account Details
4. Export Private Key
5. Enter password
6. Copy private key

⚠️ **Use TEST wallet only!**

---

### ☐ Step 5: Configure .env (2 min)

```bash
cd elite-tena-smart-contracts
```

**Edit `.env` file (or create if missing):**
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_metamask_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Save the file!**

---

### ☐ Step 6: Deploy to Sepolia (2 min)

```bash
# Make sure you're in elite-tena-smart-contracts folder
cd elite-tena-smart-contracts

# Deploy
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

**Wait for:**
- Deployment confirmation
- Contract address
- Etherscan verification

**COPY THE CONTRACT ADDRESS!**

---

### ☐ Step 7: Update Backend .env (1 min)

```bash
cd ../server
```

**Edit `server/.env` - Update these lines:**
```env
CONTRACT_ADDRESS=0xYourSepoliaContractAddress
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
```

**Save the file!**

---

### ☐ Step 8: Restart Backend (1 min)

```bash
# Stop current server (Ctrl+C)
# Then start again
npm start
```

**Look for:**
```
✅ Connected to contract at: 0xYourSepoliaAddress
✅ Blockchain listeners active
```

---

### ☐ Step 9: Verify on Etherscan (1 min)

**Visit:**
```
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
```

**Check for:**
- ✅ Green checkmark (verified)
- ✅ Contract code visible
- ✅ Read/Write contract tabs

---

## ✅ SUCCESS CRITERIA

After completion, you should have:
- [ ] Contract deployed to Sepolia
- [ ] Contract verified on Etherscan
- [ ] Backend connected to Sepolia
- [ ] Event listeners active
- [ ] Can view contract on Etherscan

---

## 🎯 READY TO START?

**First command:**
```bash
# Open MetaMask and switch to Sepolia
# Then visit: https://sepoliafaucet.com/
```

**Then follow the checklist above!**

---

## 🆘 NEED HELP?

**Full guide:** `DEPLOY-TO-SEPOLIA-NOW.md`  
**Troubleshooting:** See guide for common issues

---

**Time:** 15 minutes  
**Cost:** $0.00  
**Let's deploy!** 🚀
