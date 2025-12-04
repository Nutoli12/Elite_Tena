# 🔒 Safe Deployment Setup

**IMPORTANT:** Follow these steps to deploy securely!

---

## 🚨 FIRST: Fix Exposed API Key

Your Alchemy key was exposed: `aejSDdRF9pY2DKlPfp0DU`

### Regenerate It NOW:
1. Go to https://dashboard.alchemy.com/
2. Find your app
3. Regenerate or delete and create new
4. Copy NEW key (keep it secret!)

---

## ✅ CORRECT SETUP PROCESS

### Step 1: Create .env File

```bash
cd elite-tena-smart-contracts

# Copy example
cp .env.example .env
```

### Step 2: Edit .env File (Keep SECRET!)

**Open `.env` in editor and add:**
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_NEW_ALCHEMY_KEY
PRIVATE_KEY=your_metamask_private_key_without_0x
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Replace:**
- `YOUR_NEW_ALCHEMY_KEY` - Your regenerated Alchemy key
- `your_metamask_private_key_without_0x` - Your MetaMask private key
- `your_etherscan_api_key` - Your Etherscan API key

### Step 3: Verify .env is NOT in Git

```bash
# Check .gitignore
cat .gitignore | grep .env

# Should show:
# .env
# *.env
```

✅ Good! `.env` is already ignored.

### Step 4: Deploy Safely

```bash
# Deploy (uses environment variables from .env)
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

### Step 5: Update Backend .env

```bash
cd ../server
```

**Edit `server/.env` - Add these lines:**
```env
CONTRACT_ADDRESS=0xYourDeployedContractAddress
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_NEW_ALCHEMY_KEY
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
```

---

## ❌ NEVER DO THIS

**DON'T hardcode secrets:**
```javascript
// ❌ WRONG!
url: "https://eth-sepolia.g.alchemy.com/v2/aejSDdRF9pY2DKlPfp0DU"
```

**DO use environment variables:**
```javascript
// ✅ CORRECT!
url: process.env.SEPOLIA_RPC_URL
```

---

## ✅ SECURITY CHECKLIST

Before deploying:
- [ ] Regenerated exposed Alchemy key
- [ ] Created `.env` file (not committed to Git)
- [ ] Added all secrets to `.env`
- [ ] Verified `.env` in `.gitignore`
- [ ] Never shared keys publicly
- [ ] Using TEST wallet only

---

## 🎯 READY TO DEPLOY SAFELY

**Now you can deploy:**
```bash
cd elite-tena-smart-contracts
npx hardhat run scripts/deploy-enhanced.js --network sepolia
```

**Configuration is correct!** ✅  
**Secrets are protected!** 🔒  
**Ready to deploy safely!** 🚀

---

**Read:** `SECURITY-WARNING.md` for more details  
**Time:** 5 minutes to fix  
**Then:** Continue with Phase 3 safely!
