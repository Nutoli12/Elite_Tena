# 🚀 Deploy to Railway - Complete Guide

**Time:** 30 minutes  
**Cost:** $0.00 (FREE - $5 credit/month)  
**Result:** Backend live on internet

---

## ✅ PRE-FLIGHT CHECK

Before starting, verify:
- [x] Backend working locally
- [x] Contract deployed to Sepolia
- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] GitHub account (optional but recommended)

---

## 📋 STEP-BY-STEP EXECUTION

### Step 1: Create Railway Account (2 minutes)

**Visit:** https://railway.app/

**Process:**
1. Click "Start a New Project"
2. Sign up with GitHub (recommended) or email
3. Verify email if needed
4. You get $5 free credit/month

**No credit card required!**

---

### Step 2: Install Railway CLI (2 minutes)

**Windows (PowerShell):**
```bash
npm install -g @railway/cli
```

**Verify installation:**
```bash
railway --version
```

**Expected output:**
```
railway version 3.x.x
```

---

### Step 3: Login to Railway (1 minute)

```bash
railway login
```

**Process:**
1. Browser opens automatically
2. Click "Authorize"
3. Return to terminal
4. You should see: "Logged in as [your-email]"

---

### Step 4: Initialize Project (2 minutes)

```bash
cd server

# Initialize Railway project
railway init
```

**Process:**
1. Choose: "Create a new project"
2. Name it: "elite-tena-backend"
3. Press Enter

**Expected output:**
```
✅ Created project elite-tena-backend
```

---

### Step 5: Add PostgreSQL Database (2 minutes)

```bash
# Add PostgreSQL to your project
railway add
```

**Process:**
1. Select: "PostgreSQL"
2. Press Enter
3. Wait for provisioning (~30 seconds)

**Expected output:**
```
✅ Created PostgreSQL database
```

**Get database URL:**
```bash
railway variables
```

Look for `DATABASE_URL` - copy this value!

---

### Step 6: Set Environment Variables (5 minutes)

**Set all required variables:**

```bash
# Database (automatically set by Railway)
# DATABASE_URL is already set

# Blockchain Configuration
railway variables set CONTRACT_ADDRESS=0xYourSepoliaContractAddress
railway variables set BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
railway variables set BLOCKCHAIN_NETWORK=sepolia
railway variables set BLOCKCHAIN_CHAIN_ID=11155111

# Server Configuration
railway variables set NODE_ENV=production
railway variables set PORT=3003
railway variables set CORS_ORIGIN=https://your-frontend-domain.com

# Security
railway variables set JWT_SECRET=your_secure_random_string_here
railway variables set ADMIN_COOKIE_SECRET=your_secure_cookie_secret_here

# IPFS (Pinata)
railway variables set PINATA_JWT=your_pinata_jwt_token

# Encryption
railway variables set ENCRYPTION_SECRET=your_encryption_secret_here
```

**Generate secure secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Verify variables:**
```bash
railway variables
```

---

### Step 7: Prepare for Deployment (3 minutes)

**Create `railway.json` in server folder:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Verify package.json has start script:**
```json
{
  "scripts": {
    "start": "node src/server.js"
  }
}
```

---

### Step 8: Deploy to Railway (5 minutes)

```bash
cd server

# Deploy
railway up
```

**Process:**
1. Railway uploads your code
2. Installs dependencies
3. Runs database migrations
4. Starts server

**Expected output:**
```
✅ Build successful
✅ Deployment successful
🚀 Service is live at: https://elite-tena-backend-production.up.railway.app
```

**Copy your deployment URL!**

---

### Step 9: Run Database Migrations (2 minutes)

```bash
# Connect to Railway environment
railway run npx sequelize db:migrate
```

**Or manually:**
```bash
# SSH into Railway
railway shell

# Run migrations
npx sequelize db:migrate

# Exit
exit
```

---

### Step 10: Test Deployment (3 minutes)

**Get your service URL:**
```bash
railway status
```

**Test health endpoint:**
```bash
curl https://your-app.railway.app/api/health
```

**Expected response:**
```json
{
  "status": "OK",
  "service": "Elite-Tena Backend API",
  "database": "connected",
  "environment": "production"
}
```

**Test in browser:**
```
https://your-app.railway.app/api/health
https://your-app.railway.app/admin
```

---

### Step 11: Monitor Deployment (2 minutes)

**View logs:**
```bash
railway logs
```

**Check for:**
```
✅ Database connected
✅ Blockchain listener initialized
✅ Server running on port 3003
```

**Railway Dashboard:**
1. Go to https://railway.app/dashboard
2. Click your project
3. View metrics, logs, and settings

---

## ✅ SUCCESS CHECKLIST

After deployment, verify:
- [ ] Backend deployed to Railway
- [ ] Database connected
- [ ] Environment variables set
- [ ] Health endpoint responding
- [ ] Admin panel accessible
- [ ] Blockchain integration working
- [ ] Logs showing no errors
- [ ] Service URL saved

---

## 🎯 WHAT YOU NOW HAVE

**Backend API:**
- ✅ Live on internet
- ✅ Public URL: https://your-app.railway.app
- ✅ Production database
- ✅ Connected to Sepolia blockchain
- ✅ SSL certificate (automatic)
- ✅ Auto-scaling
- ✅ Monitoring

**Endpoints:**
- Health: https://your-app.railway.app/api/health
- API: https://your-app.railway.app/api
- Admin: https://your-app.railway.app/admin

**Cost:** $0.00 (using free $5 credit)

---

## 📊 RAILWAY FEATURES

**What you get for FREE:**
- $5 credit/month
- PostgreSQL database
- Automatic SSL
- Custom domains
- Automatic deployments
- Monitoring & logs
- 99.9% uptime

**Usage limits:**
- $5 credit = ~500 hours/month
- Enough for development & testing
- Upgrade when you get real users

---

## 🔧 USEFUL COMMANDS

```bash
# View logs
railway logs

# View variables
railway variables

# Set variable
railway variables set KEY=value

# Delete variable
railway variables delete KEY

# Get service URL
railway status

# Open in browser
railway open

# SSH into service
railway shell

# Link to different project
railway link

# Redeploy
railway up --detach
```

---

## 🆘 TROUBLESHOOTING

### "Build failed"
- Check package.json has all dependencies
- Verify start script is correct
- Check logs: `railway logs`

### "Database connection failed"
- Verify DATABASE_URL is set
- Check database is running in Railway dashboard
- Run migrations: `railway run npx sequelize db:migrate`

### "Port already in use"
- Railway automatically assigns port
- Use `process.env.PORT` in your code
- Don't hardcode port 3003

### "Environment variables not working"
- List variables: `railway variables`
- Verify spelling and values
- Redeploy after changing: `railway up`

### "Service not responding"
- Check logs: `railway logs`
- Verify service is running in dashboard
- Check health endpoint

---

## 🎉 CONGRATULATIONS!

You now have:
- ✅ Backend live on internet
- ✅ Production database
- ✅ Connected to Sepolia blockchain
- ✅ Public API endpoints
- ✅ Everything still FREE
- ✅ Ready for frontend development!

**Next Steps:**
1. Save your Railway URL
2. Update frontend to use Railway URL
3. Start building frontend
4. Test end-to-end

---

## 📝 IMPORTANT URLS

**Save these:**
- Railway Dashboard: https://railway.app/dashboard
- Your Backend: https://your-app.railway.app
- Health Check: https://your-app.railway.app/api/health
- Admin Panel: https://your-app.railway.app/admin
- Sepolia Contract: https://sepolia.etherscan.io/address/YOUR_ADDRESS

---

**Time Spent:** ~30 minutes  
**Cost:** $0.00  
**Status:** PRODUCTION READY ✅

**You're now 85% complete!** 🎉
