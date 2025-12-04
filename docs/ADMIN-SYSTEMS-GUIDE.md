# 🔐 Complete Admin Systems Guide

## Two Admin Systems Explained

Your Elite Tena platform has **TWO separate admin systems**, each serving different purposes:

---

## 1️⃣ Custom Admin Panel (Healthcare Operations)

### 📍 Access
- **URL**: `http://localhost:5173/admin/dashboard`
- **Login**: Use main app login at `/login` with admin role
- **Who**: Hospital administrators, HR managers, healthcare managers

### 🎯 Purpose
Day-to-day healthcare operations and staff management

### ✨ Features

#### **Admin Dashboard** (`/admin/dashboard`)
- System statistics overview
- Total users, active users, patients, doctors, pharmacists
- Recent user activity
- Quick action buttons
- Link to AdminJS panel

#### **Staff Management** (`/admin/staff`)
- Register new doctors (with specialization & license)
- Register lab technicians (with department)
- Register pharmacists (with license number)
- Beautiful role-based UI
- Auto-generate wallet addresses
- Send credentials to staff

#### **User Management** (`/admin/users`)
- View all system users
- Search by email or wallet address
- Filter by role (patient, doctor, pharmacist, etc.)
- Filter by status (active/inactive)
- Activate/deactivate users
- Delete users
- View user details

### 🚀 How to Use Custom Admin Panel

#### Step 1: Create Admin Account
```bash
# Option A: Register via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "admin123",
    "role": "admin",
    "profileData": {
      "fullName": "Hospital Administrator"
    }
  }'

# Option B: Use AdminJS to manually set role to "admin"
```

#### Step 2: Login
1. Go to `http://localhost:5173/login`
2. Enter admin email and password
3. You'll be redirected to dashboard

#### Step 3: Navigate Admin Panel
```
/admin/dashboard  → Overview & statistics
/admin/staff      → Register healthcare staff
/admin/users      → Manage all users
```

#### Step 4: Register Staff
1. Go to `/admin/staff`
2. Select role (Doctor/Lab Tech/Pharmacist)
3. Fill in details:
   - Email (required)
   - Password (required)
   - Full Name (required)
   - Phone Number (optional)
   - Wallet Address (optional - auto-generated if empty)
   - Role-specific fields (specialization, license, department)
4. Click "Register"
5. Staff can now login with their email/password

#### Step 5: Manage Users
1. Go to `/admin/users`
2. Search/filter users
3. Activate/deactivate accounts
4. Delete users if needed

---

## 2️⃣ AdminJS Panel (Technical Database Management)

### 📍 Access
- **URL**: `http://localhost:5000/admin`
- **Login**: Separate AdminJS credentials
- **Who**: Developers, IT staff, system administrators

### 🔑 Default Credentials
```
Email: admin@elitetena.com
Password: admin123
```

### 🎯 Purpose
Technical database management and debugging

### ✨ Features
- Direct database access
- View all tables (Users, Patients, Doctors, Pharmacists, Appointments)
- Edit records directly
- Delete records
- Run queries
- View relationships
- Export data

### 🚀 How to Use AdminJS

#### Step 1: Start Server
```bash
cd server
npm start
```

#### Step 2: Access AdminJS
1. Open browser: `http://localhost:5000/admin`
2. You'll see AdminJS login page

#### Step 3: Login
```
Email: admin@elitetena.com
Password: admin123
```

#### Step 4: Navigate Database
- **User Management** → View/edit all users
- **Healthcare Actors** → Patients, Doctors, Pharmacists
- **Healthcare Data** → Appointments, prescriptions, etc.

#### Step 5: Common Tasks

**View All Users:**
1. Click "User" in sidebar
2. See list of all users
3. Click any user to view details

**Edit User:**
1. Find user in list
2. Click "Edit" button
3. Modify fields
4. Click "Save"

**Change User Role:**
1. Find user
2. Click "Edit"
3. Change "role" field
4. Save

**Activate/Deactivate User:**
1. Find user
2. Click "Edit"
3. Toggle "isActive" field
4. Save

**Delete User:**
1. Find user
2. Click "Delete" button
3. Confirm deletion

**View Doctor Details:**
1. Click "Doctor" in sidebar
2. See all doctors with specializations
3. Click to view/edit

---

## 🔒 Security Configuration

### Custom Admin Panel
Located in: `elite-tena-frontend/src/App.tsx`

```typescript
// Protected route - only users with role "admin" can access
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>
```

### AdminJS Panel
Located in: `server/src/admin.js`

**Change Credentials:**
1. Edit `server/.env`:
```env
ADMINJS_EMAIL=your-admin@email.com
ADMINJS_PASSWORD=your-secure-password
ADMINJS_COOKIE_SECRET=your-random-secret-key
SESSION_SECRET=another-random-secret
```

2. Or edit `server/src/admin.js`:
```javascript
const ADMIN_EMAIL = 'your-admin@email.com';
const ADMIN_PASSWORD = 'your-secure-password';
```

---

## 📊 Comparison Table

| Feature | Custom Admin Panel | AdminJS |
|---------|-------------------|---------|
| **URL** | localhost:5173/admin/* | localhost:5000/admin |
| **Login** | Main app (role: admin) | Separate credentials |
| **Interface** | Custom React UI | Generic database UI |
| **Purpose** | Daily operations | Technical management |
| **Users** | Hospital admins | Developers/IT |
| **Data View** | User-friendly | Raw database |
| **Actions** | Register staff, manage users | Direct DB access |
| **Security** | Role-based | Password-protected |

---

## 🎯 When to Use Which?

### Use Custom Admin Panel When:
✅ Registering new doctors, lab techs, pharmacists
✅ Managing user accounts (activate/deactivate)
✅ Viewing system statistics
✅ Day-to-day hospital operations
✅ Non-technical staff need access

### Use AdminJS When:
✅ Debugging database issues
✅ Manually fixing corrupted data
✅ Viewing raw database records
✅ Running complex queries
✅ Emergency data recovery
✅ Development/testing

---

## 🚀 Quick Start Commands

### Start Both Systems:
```bash
# Terminal 1: Start backend (includes AdminJS)
cd server
npm start

# Terminal 2: Start frontend (includes Custom Admin)
cd elite-tena-frontend
npm run dev
```

### Access URLs:
```
Custom Admin Panel: http://localhost:5173/admin/dashboard
AdminJS Panel:      http://localhost:5000/admin
Main App:           http://localhost:5173
```

---

## 🔧 Troubleshooting

### Can't Access Custom Admin Panel?
1. Make sure you're logged in with admin role
2. Check user role in database (should be "admin")
3. Clear browser cache and re-login

### Can't Access AdminJS?
1. Make sure backend is running (`npm start` in server folder)
2. Check credentials (default: admin@elitetena.com / admin123)
3. Check console for errors

### AdminJS Not Loading?
```bash
# Reinstall AdminJS dependencies
cd server
npm install adminjs @adminjs/express @adminjs/sequelize
npm start
```

---

## 📝 Best Practices

1. **Use Custom Admin Panel** for regular operations
2. **Use AdminJS** only when necessary (debugging, emergencies)
3. **Change default AdminJS password** in production
4. **Limit AdminJS access** to technical staff only
5. **Regular backups** before using AdminJS to modify data
6. **Test changes** in development before production

---

## 🎓 Example Workflows

### Workflow 1: Register New Doctor
1. Login to Custom Admin Panel
2. Go to `/admin/staff`
3. Select "Doctor"
4. Fill in details
5. Click "Register Doctor"
6. Doctor receives credentials
7. Doctor logs in at `/login`

### Workflow 2: Fix Corrupted User Data
1. Login to AdminJS
2. Navigate to "User" table
3. Find problematic user
4. Click "Edit"
5. Fix data
6. Save changes
7. Verify in Custom Admin Panel

### Workflow 3: View System Statistics
1. Login to Custom Admin Panel
2. Go to `/admin/dashboard`
3. View stats cards
4. Check recent users
5. Use quick actions for common tasks

---

## 🎉 You're Ready!

Both admin systems are now fully configured and ready to use. Start with the Custom Admin Panel for daily operations, and keep AdminJS as your technical backup tool.

**Need Help?**
- Custom Admin Panel issues → Check frontend console
- AdminJS issues → Check backend console
- Database issues → Use AdminJS to inspect
