# 🔐 ELITE TENA - AUTHENTICATION & REGISTRATION GUIDE

## 📋 COMPLETE AUTHENTICATION FLOW EXPLANATION

Based on your current project structure, here's how authentication and registration works for all user types.

---

## 🎭 USER ROLES IN THE SYSTEM

Your system has **5 different user roles**:

1. **Patient** - Regular users seeking healthcare
2. **Doctor** - Medical professionals providing care
3. **Pharmacist** - Dispensing medications
4. **Lab Technician** - Uploading lab results
5. **Admin** - System administrators

---

## 🔄 CURRENT AUTHENTICATION METHODS

### Method 1: Wallet Authentication (Blockchain) 🔗
**For:** All users who want blockchain-verified identity
**How it works:**
1. User connects MetaMask wallet
2. Signs a message to prove ownership
3. Backend verifies signature
4. Returns JWT token + user profile with role

### Method 2: Email/Password Authentication 📧
**For:** Users without crypto wallets (most patients, staff)
**How it works:**
1. User enters email + password
2. Backend verifies credentials
3. Returns JWT token + user profile with role

---

## 📝 REGISTRATION FLOW BY USER TYPE

### 1️⃣ PATIENT REGISTRATION

**Option A: Self-Registration (Public)**
```
Patient visits website
↓
Clicks "Register as Patient"
↓
Fills registration form:
- Full Name
- Email
- Password
- Phone Number
- Date of Birth
- Address
- Emergency Contact
↓
Submits form
↓
Backend creates Patient record with role='patient'
↓
Email verification sent
↓
Patient can login immediately
```

**Option B: Wallet Registration**
```
Patient connects MetaMask
↓
Signs message
↓
Fills profile form
↓
Backend creates Patient record linked to wallet
↓
Patient can login with wallet
```

**Database:** `Patients` table
**Role:** `patient`
**Approval:** Not required (instant access)

---

### 2️⃣ DOCTOR REGISTRATION

**Process: Application + Admin Approval**
```
Doctor visits website
↓
Clicks "Register as Healthcare Provider"
↓
Selects "Doctor"
↓
Fills detailed form:
- Full Name
- Email
- Password
- Medical License Number
- Specialization
- Hospital/Clinic Affiliation
- Years of Experience
- License Document Upload
↓
Submits application
↓
Backend creates Doctor record with:
  - role='doctor'
  - isApproved=false
  - status='pending'
↓
Admin receives notification
↓
Admin reviews credentials
↓
Admin approves/rejects
↓
If approved: isApproved=true
↓
Doctor receives approval email
↓
Doctor can now login and access doctor features
```

**Database:** `Doctors` table
**Role:** `doctor`
**Approval:** Required by admin
**Verification:** Medical license checked

---

### 3️⃣ PHARMACIST REGISTRATION

**Process: Application + Admin Approval**
```
Pharmacist visits website
↓
Clicks "Register as Healthcare Provider"
↓
Selects "Pharmacist"
↓
Fills form:
- Full Name
- Email
- Password
- Pharmacy License Number
- Pharmacy Name
- Pharmacy Address
- License Document Upload
↓
Submits application
↓
Backend creates Pharmacist record with:
  - role='pharmacist'
  - isApproved=false
↓
Admin reviews and approves
↓
Pharmacist can login after approval
```

**Database:** `Pharmacists` table (or `HealthcareProviders` table)
**Role:** `pharmacist`
**Approval:** Required by admin

---

### 4️⃣ LAB TECHNICIAN REGISTRATION

**Process: Application + Admin Approval**
```
Lab Tech visits website
↓
Clicks "Register as Healthcare Provider"
↓
Selects "Lab Technician"
↓
Fills form:
- Full Name
- Email
- Password
- Lab License/Certification Number
- Laboratory Name
- Laboratory Address
- Certification Document Upload
↓
Submits application
↓
Backend creates LabTechnician record with:
  - role='lab_technician'
  - isApproved=false
↓
Admin reviews and approves
↓
Lab Tech can login after approval
```

**Database:** `LabTechnicians` table (or `HealthcareProviders` table)
**Role:** `lab_technician`
**Approval:** Required by admin

---

### 5️⃣ ADMIN REGISTRATION

**Process: Manual Creation Only (Security)**
```
Admin accounts are NOT self-registered
↓
Created manually by:
  - Database script
  - Super admin
  - System initialization
↓
Admin credentials provided securely
↓
Admin can login
```

**Database:** `Admins` table or `Users` table with role='admin'
**Role:** `admin`
**Approval:** N/A (manually created)
**Security:** Highest level

---

## 🔑 HOW ROLE SELECTION WORKS

### Current Backend Structure

Looking at your backend (`server/src/models/`):
- `Patient.js` - Patient model
- `Doctor.js` - Doctor model
- Likely: `Pharmacist.js`, `LabTechnician.js`, `Admin.js`

### Login Flow with Role Detection

```javascript
// When user logs in (email/password or wallet)
POST /api/auth/login
{
  email: "user@example.com",
  password: "password123"
  // OR
  walletAddress: "0x123...",
  signature: "0xabc..."
}

// Backend checks ALL user tables:
1. Check Patients table
2. Check Doctors table
3. Check Pharmacists table
4. Check LabTechnicians table
5. Check Admins table

// Returns user with role:
{
  user: {
    id: "123",
    email: "doctor@hospital.com",
    fullName: "Dr. Alemayehu",
    role: "doctor",  // ← ROLE DETERMINED BY TABLE
    isApproved: true,
    specialization: "Cardiology"
  },
  token: "jwt-token-here"
}
```

---

## 🎯 RECOMMENDED IMPLEMENTATION

### Step 1: Create Registration Pages

```
Frontend Pages Needed:
├── /register/patient          (Public - instant access)
├── /register/provider         (Healthcare providers)
│   ├── Select role: Doctor/Pharmacist/Lab Tech
│   └── Role-specific form
└── /admin/create-admin        (Admin only)
```

### Step 2: Backend Registration Endpoints

```javascript
// Patient registration (instant)
POST /api/auth/register/patient
Body: { fullName, email, password, phone, dob, ... }
Response: { user, token } // Can login immediately

// Healthcare provider registration (needs approval)
POST /api/auth/register/provider
Body: { 
  role: "doctor" | "pharmacist" | "lab_technician",
  fullName, 
  email, 
  password,
  licenseNumber,
  documents,
  ...
}
Response: { 
  message: "Application submitted. Awaiting admin approval.",
  applicationId: "123"
}

// Admin creates admin (admin only)
POST /api/admin/create-admin
Headers: { Authorization: "Bearer admin-token" }
Body: { fullName, email, password }
Response: { admin }
```

### Step 3: Login Endpoint (Universal)

```javascript
POST /api/auth/login
Body: { 
  email: "user@example.com", 
  password: "password123" 
}

// Backend logic:
1. Search in all user tables
2. Find user and verify password
3. Check if approved (for providers)
4. Return user with role + token

Response: {
  user: {
    id: "123",
    role: "doctor", // or "patient", "pharmacist", etc.
    fullName: "Dr. Alemayehu",
    isApproved: true,
    ...
  },
  token: "jwt-token"
}
```

---

## 🔐 AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    USER VISITS WEBSITE                  │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                   │
    [Patient]                      [Healthcare Provider]
        │                                   │
        ↓                                   ↓
┌───────────────┐                  ┌────────────────┐
│ Self Register │                  │ Apply to Join  │
│ (Instant)     │                  │ (Needs Approval)│
└───────────────┘                  └────────────────┘
        │                                   │
        ↓                                   ↓
┌───────────────┐                  ┌────────────────┐
│ Fill Form:    │                  │ Select Role:   │
│ - Name        │                  │ □ Doctor       │
│ - Email       │                  │ □ Pharmacist   │
│ - Password    │                  │ □ Lab Tech     │
│ - Phone       │                  └────────────────┘
│ - DOB         │                          │
└───────────────┘                          ↓
        │                          ┌────────────────┐
        ↓                          │ Fill Form:     │
┌───────────────┐                  │ - Name         │
│ Submit        │                  │ - Email        │
└───────────────┘                  │ - Password     │
        │                          │ - License #    │
        ↓                          │ - Documents    │
┌───────────────┐                  └────────────────┘
│ Account       │                          │
│ Created       │                          ↓
│ role=patient  │                  ┌────────────────┐
└───────────────┘                  │ Submit         │
        │                          └────────────────┘
        ↓                                  │
┌───────────────┐                          ↓
│ Can Login     │                  ┌────────────────┐
│ Immediately   │                  │ Pending        │
└───────────────┘                  │ Approval       │
                                   │ isApproved=false│
                                   └────────────────┘
                                          │
                                          ↓
                                   ┌────────────────┐
                                   │ Admin Reviews  │
                                   └────────────────┘
                                          │
                                          ↓
                                   ┌────────────────┐
                                   │ Admin Approves │
                                   │ isApproved=true│
                                   └────────────────┘
                                          │
                                          ↓
                                   ┌────────────────┐
                                   │ Can Login Now  │
                                   └────────────────┘
```

---

## 💾 DATABASE STRUCTURE

### Current Structure (Based on your backend)

```sql
-- Patients Table
CREATE TABLE Patients (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  wallet_address VARCHAR UNIQUE,
  full_name VARCHAR,
  phone VARCHAR,
  date_of_birth DATE,
  role VARCHAR DEFAULT 'patient',
  is_approved BOOLEAN DEFAULT true,  -- Patients auto-approved
  created_at TIMESTAMP
);

-- Doctors Table
CREATE TABLE Doctors (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  wallet_address VARCHAR UNIQUE,
  full_name VARCHAR,
  license_number VARCHAR UNIQUE,
  specialization VARCHAR,
  hospital_affiliation VARCHAR,
  role VARCHAR DEFAULT 'doctor',
  is_approved BOOLEAN DEFAULT false,  -- Needs admin approval
  created_at TIMESTAMP
);

-- Pharmacists Table
CREATE TABLE Pharmacists (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  pharmacy_name VARCHAR,
  license_number VARCHAR UNIQUE,
  role VARCHAR DEFAULT 'pharmacist',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- LabTechnicians Table
CREATE TABLE LabTechnicians (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  lab_name VARCHAR,
  certification_number VARCHAR,
  role VARCHAR DEFAULT 'lab_technician',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);

-- Admins Table
CREATE TABLE Admins (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  full_name VARCHAR,
  role VARCHAR DEFAULT 'admin',
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);
```

---

## 🎨 FRONTEND IMPLEMENTATION

### Registration Page Structure

```typescript
// src/pages/Register.tsx
export const Register = () => {
  const [userType, setUserType] = useState<'patient' | 'provider'>();
  const [providerRole, setProviderRole] = useState<'doctor' | 'pharmacist' | 'lab_technician'>();

  return (
    <div>
      {/* Step 1: Choose user type */}
      {!userType && (
        <UserTypeSelection onSelect={setUserType} />
      )}

      {/* Step 2: Patient registration */}
      {userType === 'patient' && (
        <PatientRegistrationForm />
      )}

      {/* Step 3: Provider role selection */}
      {userType === 'provider' && !providerRole && (
        <ProviderRoleSelection onSelect={setProviderRole} />
      )}

      {/* Step 4: Provider registration */}
      {userType === 'provider' && providerRole && (
        <ProviderRegistrationForm role={providerRole} />
      )}
    </div>
  );
};
```

### Login Page (Universal)

```typescript
// src/pages/Login.tsx
export const Login = () => {
  return (
    <div>
      {/* Tab 1: Email/Password */}
      <EmailPasswordLogin />
      
      {/* Tab 2: Wallet */}
      <WalletLogin />
      
      {/* Links */}
      <Link to="/register">Don't have an account? Register</Link>
    </div>
  );
};
```

---

## 🔄 COMPLETE USER JOURNEY

### Patient Journey
```
1. Visit website
2. Click "Register"
3. Select "I'm a Patient"
4. Fill form (name, email, password, phone, DOB)
5. Submit
6. Account created (role=patient, isApproved=true)
7. Login immediately
8. Access patient dashboard
```

### Doctor Journey
```
1. Visit website
2. Click "Register"
3. Select "I'm a Healthcare Provider"
4. Select "Doctor"
5. Fill form (name, email, password, license, specialization, documents)
6. Submit application
7. See "Pending Approval" message
8. Wait for admin approval
9. Receive approval email
10. Login
11. Access doctor dashboard
```

### Admin Journey
```
1. Admin account created manually by super admin
2. Admin receives credentials securely
3. Admin logs in
4. Access admin dashboard
5. Review pending provider applications
6. Approve/reject applications
```

---

## 🎯 NEXT STEPS TO IMPLEMENT

### 1. Create Registration Components
- [ ] PatientRegistrationForm
- [ ] ProviderRegistrationForm
- [ ] UserTypeSelection
- [ ] ProviderRoleSelection

### 2. Update Backend Endpoints
- [ ] POST /api/auth/register/patient
- [ ] POST /api/auth/register/provider
- [ ] POST /api/auth/login (universal)
- [ ] GET /api/admin/pending-providers
- [ ] PUT /api/admin/approve-provider/:id

### 3. Update Frontend Auth Flow
- [ ] Add registration pages
- [ ] Update login to handle all roles
- [ ] Add "pending approval" page for providers
- [ ] Add admin approval interface

---

## 📝 SUMMARY

**How Users Choose Roles:**
1. **During Registration** - User selects their role (patient vs provider type)
2. **Backend Determines** - Role stored in database based on registration type
3. **Login Returns Role** - Backend sends user object with role field
4. **Frontend Uses Role** - Shows appropriate dashboard and features

**Key Points:**
- ✅ Patients: Self-register, instant access
- ✅ Providers: Apply, wait for approval
- ✅ Admins: Manually created
- ✅ Role determines: Dashboard, menu items, permissions
- ✅ One login endpoint for all users
- ✅ Backend checks all tables to find user and role

---

**Your current system already has the backend structure for this! You just need to add the registration UI components.** 🎉
