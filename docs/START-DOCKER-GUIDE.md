# 🐳 Quick Guide: Start Docker & Get System Running

## Current Situation
- ✅ All code is fixed and ready
- ✅ Backend, IPFS, Smart Contracts all working
- ❌ Docker Desktop is not running
- ❌ PostgreSQL database cannot start without Docker

---

## 🚀 3 Simple Steps to Get Everything Working

### Step 1: Start Docker Desktop (Manual)

**Windows:**
1. Press `Windows Key`
2. Type "Docker Desktop"
3. Click on Docker Desktop app
4. Wait 30-60 seconds for Docker to start
5. Look for Docker icon in system tray (bottom right)
6. Icon should show "Docker Desktop is running"

**Alternative:**
- Double-click Docker Desktop icon on your desktop
- Or find it in Start Menu → Docker → Docker Desktop

---

### Step 2: Start PostgreSQL Database

Once Docker is running, open PowerShell or Command Prompt in your project folder:

```bash
# Navigate to project folder
cd C:\Users\nutir\Desktop\Elite_Tena

# Start PostgreSQL container
docker-compose up -d
```

**Expected Output:**
```
Creating network "elite_tena_default" with the default driver
Creating elite_tena_postgres ... done
```

**Verify it's running:**
```bash
docker ps
```

You should see a container named `elite_tena_postgres` or similar.

---

### Step 3: Backend Auto-Restarts

The backend server (nodemon) is already running and will automatically restart once it detects the database is available.

**Check if it's working:**

Open browser or use curl:
```
http://localhost:3003/api/health
```

Or in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3003/api/health"
```

**Expected Response:**
```json
{
  "status": "OK",
  "database": "connected",
  "service": "Elite-Tena Backend API"
}
```

---

## ✅ Verification Checklist

After completing the steps above:

- [ ] Docker Desktop icon shows "running"
- [ ] `docker ps` shows postgres container
- [ ] Backend server shows "✅ Database connection established"
- [ ] `http://localhost:3003/api/health` returns OK
- [ ] Can run tests: `cd server && npm run test:upload`

---

## 🧪 Test Everything

Once all three steps are complete:

```bash
# Test file upload
cd server
npm run test:upload
```

**Expected Result:**
```
✅ Server Health: OK
✅ IPFS Status: Connected
✅ File Upload: Successful
🎉 All tests passed!
```

---

## 🐛 Troubleshooting

### Docker Won't Start
- **Solution 1:** Restart Docker Desktop
- **Solution 2:** Restart your computer
- **Solution 3:** Check Windows Services → Docker Desktop Service → Start

### Database Won't Start
```bash
# Stop everything
docker-compose down

# Start fresh
docker-compose up -d

# Check logs
docker logs elite_tena_postgres
```

### Backend Still Not Connecting
```bash
# Check backend logs
cd server
npm run dev

# Should show:
# ✅ Database connection established
# ✅ IPFS service initialized
# 🎉 Elite-Tena Backend Server Started Successfully!
```

---

## 📊 What Happens After Docker Starts

```
1. Docker Desktop starts (30-60 seconds)
   ↓
2. You run: docker-compose up -d (30 seconds)
   ↓
3. PostgreSQL container starts
   ↓
4. Backend detects database (auto-restart)
   ↓
5. ✅ Everything is working!
```

---

## 🎯 Quick Commands Reference

```bash
# Check Docker status
docker --version
docker ps

# Start database
docker-compose up -d

# Stop database
docker-compose down

# View database logs
docker logs elite_tena_postgres

# Restart backend (if needed)
cd server
npm run dev

# Test system
cd server
npm run test:upload
```

---

## 💡 Pro Tips

1. **Keep Docker Desktop Running:** Set it to start automatically with Windows
2. **Check Docker First:** Always verify Docker is running before starting development
3. **Use docker-compose:** It manages all containers automatically
4. **Monitor Logs:** Use `docker logs` to debug database issues

---

## 🎊 After Everything Works

Once Docker is running and tests pass, you can:

1. ✅ Deploy smart contract to testnet
2. ✅ Start building frontend
3. ✅ Test all API endpoints
4. ✅ Upload files to IPFS
5. ✅ Integrate everything

---

**Current Status:** Waiting for you to start Docker Desktop  
**Time Required:** 2-3 minutes total  
**Difficulty:** Easy (just click Docker Desktop)

**Next Action:** Start Docker Desktop now! 🚀
