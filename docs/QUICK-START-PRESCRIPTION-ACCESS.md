# 🚀 Quick Start: Prescription Access Control

## ⚡ 5-Minute Setup & Test

---

## ✅ Prerequisites Check

```bash
# 1. Database migration run?
psql -U admin -d elitetena -c "SELECT COUNT(*) FROM prescription_access_grants;"
# Should return a number (even if 0)

# 2. Backend running?
curl http://localhost:3003/api/prescriptions
# Should return data or empty array

# 3. Frontend running?
# Open http://localhost:5173 in browser
```

---

## 🎯 Quick Test (3 Steps)

### Step 1: Doctor Creates Prescription (2 min)
1. Login as doctor
2. Go to patient consultation
3. Create prescription
4. **NEW**: Scroll to "Suggest Pharmacy"
5. Enter:
   - Pharmacy Name: "Test Pharmacy"
   - Wallet: Your test pharmacist wallet
6. Submit

### Step 2: Patient Approves (1 min)
1. Login as patient
2. Go to `/prescriptions`
3. See green banner "Doctor suggested: Test Pharmacy"
4. Click "Quick Approve →"
5. Select 30 days
6. Click "Approve Access"
7. ✅ Done!

### Step 3: Pharmacist Views (1 min)
1. Login as pharmacist
2. Go to `/pharmacy/dashboard`
3. Click "Accessible Rx" button
4. See prescription in list
5. Click "View & Dispense"
6. ✅ Success!

---

## 🎨 What You'll See

### Patient View
```
┌─────────────────────────────────────┐
│ 💊 Amoxicillin 500mg               │
│ ┌─────────────────────────────────┐ │
│ │ 💡 Doctor suggested: Test Pharmacy│ │
│ │ Quick Approve →                  │ │
│ └─────────────────────────────────┘ │
│ [🛡️ Manage Access] [View Details]  │
└─────────────────────────────────────┘
```

### Pharmacist View
```
┌─────────────────────────────────────┐
│ Quick Actions                       │
│ [📷 Scan QR] [🛡️ Accessible Rx]    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Accessible Prescriptions            │
│ ┌─────────────────────────────────┐ │
│ │ 💊 Amoxicillin 500mg           │ │
│ │ [Quick Approve] 30d remaining  │ │
│ │ [View & Dispense]              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue: "Manage Access" button not showing
**Fix:** Login as patient (not doctor/pharmacist)

### Issue: No prescriptions in "Accessible Rx"
**Fix:** 
1. Check patient granted access
2. Verify pharmacist wallet matches
3. Check access not expired

### Issue: Quick Approve not showing
**Fix:** Doctor must suggest pharmacy when creating prescription

---

## 📋 Feature Checklist

After testing, you should be able to:
- [x] See "Manage Access" button (patient)
- [x] See suggested pharmacy banner (patient)
- [x] Quick approve pharmacy (patient)
- [x] Manual grant access (patient)
- [x] Generate QR code (patient)
- [x] Scan QR code (pharmacist)
- [x] View accessible prescriptions (pharmacist)
- [x] Revoke access (patient)

---

## 🎉 Success!

If all 3 steps worked, your prescription access control system is **fully functional**!

---

## 📚 Next Steps

1. **Test More Workflows**
   - See `PRESCRIPTION-ACCESS-TESTING-GUIDE.md`

2. **Read Full Documentation**
   - `PRESCRIPTION-ACCESS-COMPLETE-SUMMARY.md`
   - `PRESCRIPTION-ACCESS-INTEGRATION-COMPLETE.md`

3. **Deploy to Production**
   - Test thoroughly
   - Remove console.logs
   - Deploy!

---

**Need Help?** Check the testing guide or documentation files.

**Status**: ✅ Ready to test!

