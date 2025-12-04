# 🔗 Blockchain Integration - Quick Reference

## Contract Information

**Network:** Sepolia Testnet  
**Contract Address:** `0x2c0cE04B1013451660f62DE1292440e4bead3894`  
**Etherscan:** https://sepolia.etherscan.io/address/0x2c0cE04B1013451660f62DE1292440e4bead3894

---

## 🚀 Quick Commands

### Start the System
```powershell
# Start Docker (PostgreSQL)
docker-compose up -d

# Start Backend Server
cd server
npm run dev
```

### Test Blockchain Integration
```powershell
cd server
node scripts/test-blockchain-integration.cjs
```

### Check System Health
```powershell
curl http://localhost:3003/api/health
curl http://localhost:3003/api/db-status
```

---

## 📝 Environment Variables

### Backend (.env)
```env
CONTRACT_ADDRESS=0x2c0cE04B1013451660f62DE1292440e4bead3894
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/-bDd7BdV8nVlJ8WOpcO8Z
PRIVATE_KEY=0x01e53fc5a9a5102e89ce7e66d7f5143434bf61814f402adaea8331c2945e1316
```

---

## 🎯 Contract Functions

### User Registration
- `registerPatient(string patientId)` - 0.01 ETH
- `registerDoctor(string specialization)` - 0.02 ETH
- `registerPharmacist(string licenseNumber)` - 0.015 ETH
- `registerLabTechnician(string licenseNumber)` - 0.015 ETH

### Consent Management
- `grantConsent(address provider, ConsentType consentType, uint256 duration)`
- `revokeConsent(address provider, ConsentType consentType)`
- `checkActiveConsent(address patient, address provider, ConsentType consentType)`

### Medical Records
- `storeMedicalRecord(address patient, string ipfsHash)`
- `getMedicalRecords(address patient)`

### Prescriptions
- `issuePrescription(address patient, string ipfsHash)`
- `fillPrescription(uint256 prescriptionId)`
- `verifyPrescription(uint256 prescriptionId)`

### Lab Results
- `submitLabResult(address patient, string ipfsHash)`
- `approveLabResult(uint256 resultId)`
- `verifyLabResult(uint256 resultId)`

### Appointments
- `bookAppointment(address doctor)` - 0.05 ETH

---

## 🔢 Consent Types (Enum)

```solidity
enum ConsentType {
    MedicalRecords,  // 0
    Treatment,       // 1
    Prescriptions,   // 2
    LabResults,      // 3
    Emergency        // 4
}
```

---

## 👥 User Roles (Enum)

```solidity
enum UserRole {
    None,           // 0
    Patient,        // 1
    Doctor,         // 2
    Pharmacist,     // 3
    LabTechnician,  // 4
    Admin           // 5
}
```

---

## 📡 Blockchain Events

The backend automatically listens to these events:

| Event | Description | Parameters |
|-------|-------------|------------|
| `UserRegistered` | New user registered | user, role |
| `ProviderApproved` | Provider approved by admin | provider, role |
| `ConsentGranted` | Patient granted consent | patient, provider, consentType, expiresAt |
| `ConsentRevoked` | Patient revoked consent | patient, provider, consentType |
| `PrescriptionIssued` | Doctor issued prescription | prescriptionId, patient, doctor |
| `PrescriptionFilled` | Pharmacist filled prescription | prescriptionId, pharmacist |
| `LabResultSubmitted` | Lab tech submitted result | resultId, patient, labTech |
| `LabResultApproved` | Doctor approved lab result | resultId, doctor |
| `AppointmentBooked` | Patient booked appointment | patient, doctor, amount |
| `MedicalRecordStored` | Medical record stored | patient, doctor, ipfsHash |

---

## 🧪 Testing with Frontend

### 1. Connect MetaMask
```javascript
// Switch to Sepolia network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
});
```

### 2. Initialize Contract
```javascript
import { ethers } from 'ethers';
import contractABI from './contracts/EliteHealthSystemEnhanced.json';

const CONTRACT_ADDRESS = "0x2c0cE04B1013451660f62DE1292440e4bead3894";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);
```

### 3. Register as Patient
```javascript
const tx = await contract.registerPatient("PATIENT-001", {
  value: ethers.parseEther("0.01")
});
await tx.wait();
console.log("Patient registered!");
```

### 4. Grant Consent
```javascript
const doctorAddress = "0x...";
const consentType = 0; // MedicalRecords
const duration = 30 * 24 * 60 * 60; // 30 days in seconds

const tx = await contract.grantConsent(doctorAddress, consentType, duration);
await tx.wait();
console.log("Consent granted!");
```

---

## 🔍 Debugging

### Check Backend Logs
```powershell
# Backend logs show real-time blockchain events
# Look for:
# ✅ Blockchain service initialized
# ✅ Event listeners setup complete
# 📋 User registered: ...
# ✅ Consent granted: ...
```

### Check Contract on Etherscan
1. Visit: https://sepolia.etherscan.io/address/0x2c0cE04B1013451660f62DE1292440e4bead3894
2. Click "Contract" tab
3. View transactions and events

### Common Issues

**Issue:** Transaction fails with "insufficient funds"  
**Solution:** Get test ETH from https://sepoliafaucet.com/

**Issue:** "User not registered" error  
**Solution:** Call `registerPatient()` or appropriate registration function first

**Issue:** "No active consent" error  
**Solution:** Patient must grant consent before provider can access data

---

## 💰 Gas Costs (Approximate)

| Operation | Gas Cost | ETH Cost (at 20 gwei) |
|-----------|----------|----------------------|
| Register Patient | ~100,000 | 0.002 ETH |
| Register Doctor | ~120,000 | 0.0024 ETH |
| Grant Consent | ~80,000 | 0.0016 ETH |
| Issue Prescription | ~90,000 | 0.0018 ETH |
| Book Appointment | ~85,000 | 0.0017 ETH |

*Note: These are estimates. Actual costs vary based on network congestion.*

---

## 📞 Support

- **Backend API:** http://localhost:3003
- **Health Check:** http://localhost:3003/api/health
- **Admin Panel:** http://localhost:3003/admin
- **Sepolia Faucet:** https://sepoliafaucet.com/
- **Alchemy Dashboard:** https://dashboard.alchemy.com/

---

## ✅ Checklist for Frontend Integration

- [ ] Update contract address in frontend config
- [ ] Import contract ABI from `shared/contracts/`
- [ ] Add MetaMask connection
- [ ] Add network switching to Sepolia
- [ ] Implement user registration flows
- [ ] Implement consent management UI
- [ ] Add transaction status notifications
- [ ] Handle transaction errors gracefully
- [ ] Show gas estimates before transactions
- [ ] Add loading states during transactions

---

**Last Updated:** November 28, 2025  
**Status:** ✅ Operational on Sepolia Testnet
