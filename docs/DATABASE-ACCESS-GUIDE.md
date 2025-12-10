# 🗄️ Database Access Guide - Elite Tena Healthcare System

## 🎯 Multiple Ways to View Your Database (Like Prisma Studio)

### **1. 👑 AdminJS Panel (Primary - Most Feature Rich)**

**Access:** http://localhost:3003/admin

**Credentials:**
- Email: `admin@elitetena.com`
- Password: `admin123`

**Features:**
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Advanced filtering and search
- ✅ Relationship visualization
- ✅ Data export capabilities
- ✅ User-friendly interface
- ✅ Organized by categories:
  - 👥 User Management (Users, Sessions)
  - 🏥 Healthcare Actors (Patients, Doctors, Lab Techs, Pharmacists)
  - 📋 Medical Data (Records, Prescriptions, Lab Results, Consents)
  - 📅 Operations (Appointments, Payments)
  - 💾 File Storage (IPFS Files)

---

### **2. 🔍 Simple Database Viewer (Custom Built)**

**Access:** http://localhost:3003/database

**Features:**
- ✅ Table overview with record counts
- ✅ Browse table data with pagination
- ✅ View table schemas
- ✅ Execute SELECT queries
- ✅ Database statistics
- ✅ Clean, simple interface

**Perfect for:**
- Quick data browsing
- Simple queries
- Database statistics
- Schema inspection

---

### **3. 📊 API Endpoints (Programmatic Access)**

#### **Database Overview**
```bash
# Get all tables with counts
curl http://localhost:3003/api/database/tables

# Get database statistics
curl http://localhost:3003/api/database/stats

# Get database status
curl http://localhost:3003/api/db-status
```

#### **Table Data**
```bash
# Get records from a table
curl "http://localhost:3003/api/database/table/User?limit=10"

# Search in a table
curl "http://localhost:3003/api/database/table/User?search=john&limit=5"

# Get table schema
curl http://localhost:3003/api/database/schema/User
```

#### **Custom Queries**
```bash
# Execute SELECT query
curl -X POST http://localhost:3003/api/database/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM users WHERE role = '\''patient'\''"}'
```

---

### **4. 💻 Direct PostgreSQL Access**

#### **Using psql (Command Line)**
```bash
# Connect to database
psql postgresql://admin:password@localhost:5432/elitetena

# Common queries
\dt                          # List all tables
\d users                     # Describe users table
SELECT * FROM users LIMIT 5; # View user data
```

#### **Using GUI Tools**
- **pgAdmin**: Full-featured PostgreSQL admin tool
- **DBeaver**: Universal database tool
- **TablePlus**: Modern database client
- **DataGrip**: JetBrains database IDE

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `elitetena`
- Username: `admin`
- Password: `password`

---

## 🚀 Quick Access Summary

| Tool | URL | Best For |
|------|-----|----------|
| **AdminJS** | http://localhost:3003/admin | Full database management |
| **Simple Viewer** | http://localhost:3003/database | Quick browsing & queries |
| **API** | http://localhost:3003/api/database/* | Programmatic access |
| **Direct SQL** | psql connection | Advanced queries |

---

## 📋 Available Tables

### **Core Tables**
- `users` - All system users
- `patients` - Patient profiles
- `doctors` - Doctor profiles
- `pharmacists` - Pharmacist profiles
- `labtechnicians` - Lab technician profiles

### **Medical Data**
- `medicalrecords` - Patient medical records
- `prescriptions` - Medication prescriptions
- `labresults` - Laboratory test results
- `consents` - Patient consent records

### **Operations**
- `appointments` - Medical appointments
- `payments` - Payment transactions
- `notifications` - System notifications
- `sessions` - User sessions

### **Files & Communication**
- `filemetadata` - IPFS file metadata
- `messages` - Chat messages
- `videocalls` - Video call records

---

## 🔧 Common Database Tasks

### **1. Check User Registration**
```sql
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

### **2. View Recent Appointments**
```sql
SELECT a.*, u1.email as patient_email, u2.email as doctor_email
FROM appointments a
JOIN users u1 ON a."patientWallet" = u1."walletAddress"
JOIN users u2 ON a."doctorWallet" = u2."walletAddress"
ORDER BY a."createdAt" DESC
LIMIT 10;
```

### **3. Check Payment Status**
```sql
SELECT status, COUNT(*) as count, SUM(amount) as total
FROM payments 
GROUP BY status;
```

### **4. View Medical Records by Patient**
```sql
SELECT mr.*, u.email as patient_email
FROM medicalrecords mr
JOIN users u ON mr."patientWalletAddress" = u."walletAddress"
WHERE u.email = 'patient@example.com';
```

---

## 🛡️ Security Notes

### **AdminJS Access**
- Protected by username/password authentication
- Session-based security
- Admin-only access

### **API Endpoints**
- Read-only access for safety
- SELECT queries only in query endpoint
- No destructive operations via API

### **Direct Database Access**
- Full access with proper credentials
- Use with caution in production
- Always backup before major changes

---

## 🔄 Database Maintenance

### **Backup Database**
```bash
pg_dump -h localhost -U admin -d elitetena > backup.sql
```

### **Restore Database**
```bash
psql -h localhost -U admin -d elitetena < backup.sql
```

### **Check Database Size**
```sql
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public';
```

---

## 🎯 Comparison with Prisma Studio

| Feature | Prisma Studio | AdminJS | Simple Viewer |
|---------|---------------|---------|---------------|
| **Visual Interface** | ✅ Excellent | ✅ Excellent | ✅ Good |
| **CRUD Operations** | ✅ Full | ✅ Full | ❌ Read-only |
| **Relationships** | ✅ Visual | ✅ Linked | ❌ Basic |
| **Filtering** | ✅ Advanced | ✅ Advanced | ✅ Basic |
| **Custom Queries** | ❌ No | ❌ No | ✅ Yes |
| **Authentication** | ❌ None | ✅ Yes | ❌ None |
| **Production Ready** | ❌ Dev only | ✅ Yes | ✅ Yes |

---

## 🚀 Getting Started

1. **Start your server:**
   ```bash
   npm run dev
   # or
   ./start-dev.bat
   ```

2. **Choose your preferred method:**
   - **For full management:** Visit http://localhost:3003/admin
   - **For quick browsing:** Visit http://localhost:3003/database
   - **For API access:** Use curl or Postman with the endpoints above

3. **Login to AdminJS:**
   - Email: `admin@elitetena.com`
   - Password: `admin123`

---

**Your database is now as accessible as Prisma Studio, with even more options! 🎉**