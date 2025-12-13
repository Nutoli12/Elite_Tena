# Elite-Tena Healthcare Management System
## Part 10: Testing Guide

---

## 10.1 Test Environment Setup

```bash
# Install test dependencies
cd server
npm install --save-dev jest supertest

# Run tests
npm test
```

---

## 10.2 API Test Cases

### Authentication Tests
```javascript
describe('Authentication', () => {
  test('POST /auth/register - should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        role: 'patient',
        profileData: { fullName: 'Test User' }
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /auth/login - should login user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.auth.token).toBeDefined();
  });
});
```

### Appointment Tests
```javascript
describe('Appointments', () => {
  test('POST /appointments - should create appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientWalletAddress: '0x...',
        doctorWalletAddress: '0x...',
        appointmentDate: '2025-01-20T10:00:00Z',
        reason: 'Checkup'
      });
    expect(res.status).toBe(201);
  });

  test('GET /appointments - should list appointments', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

### Consent Tests
```javascript
describe('Consent Management', () => {
  test('POST /consent/request - should create consent request', async () => {
    const res = await request(app)
      .post('/api/consent/request')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientWalletAddress: '0x...',
        doctorWalletAddress: '0x...',
        permissions: ['viewMedicalHistory'],
        purpose: 'Consultation'
      });
    expect(res.status).toBe(200);
  });

  test('POST /consent/grant - should grant consent', async () => {
    const res = await request(app)
      .post(`/api/consent/grant/${consentId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ patientWalletAddress: '0x...' });
    expect(res.status).toBe(200);
  });
});
```

---

## 10.3 User Acceptance Test Cases

### Patient UAT Checklist
- [ ] Can register with email/password
- [ ] Can register with MetaMask
- [ ] Can view dashboard
- [ ] Can book appointment
- [ ] Can upload payment receipt
- [ ] Can view medical records
- [ ] Can grant consent
- [ ] Can revoke consent
- [ ] Receives notifications

### Doctor UAT Checklist
- [ ] Can login
- [ ] Can view pending appointments
- [ ] Can approve/reject appointments
- [ ] Can confirm payments
- [ ] Can request consent
- [ ] Can view patient records (with consent)
- [ ] Can create medical records
- [ ] Can write prescriptions
- [ ] Can order lab tests

### Pharmacist UAT Checklist
- [ ] Can login
- [ ] Can scan prescription QR
- [ ] Can view prescription details
- [ ] Can dispense medication
- [ ] Can mark prescription filled

### Lab Technician UAT Checklist
- [ ] Can login
- [ ] Can view pending lab orders
- [ ] Can upload results
- [ ] Can attach documents

---

## 10.4 Security Test Cases

### Authentication Security
- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens expire correctly
- [ ] Invalid tokens rejected
- [ ] Rate limiting works

### Authorization Security
- [ ] Role-based access enforced
- [ ] Consent required for patient data
- [ ] Emergency access logged
- [ ] Admin-only routes protected

### Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] File upload validation
- [ ] Request size limits

---

## 10.5 Performance Testing

### Load Test Scenarios
```javascript
// Using k6 or Artillery
export default function() {
  // Scenario 1: User login
  http.post(`${BASE_URL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'Test123!'
  });

  // Scenario 2: Fetch appointments
  http.get(`${BASE_URL}/api/appointments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

### Performance Targets
| Endpoint | Target Response Time |
|----------|---------------------|
| Login | < 500ms |
| Get Appointments | < 300ms |
| Create Appointment | < 500ms |
| Upload File | < 2000ms |
