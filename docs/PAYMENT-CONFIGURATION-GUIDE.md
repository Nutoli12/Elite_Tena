# 🔧 Payment Configuration Guide

## 🚨 IMPORTANT: Configure Your Payment Credentials

The payment system is ready but needs **your actual payment provider credentials** to work.

---

## 🔑 Step 1: Get Chapa Credentials

### 1. Create Chapa Account:
- Go to: https://dashboard.chapa.co/
- Sign up for a new account
- Complete account verification

### 2. Get Your Secret Key:
- Login to Chapa Dashboard
- Go to **Settings** → **API Keys**
- Copy your **Secret Key** (starts with `CHASECK_TEST-` for test mode)
- For production, use the live secret key

### 3. Update Your .env File:
```bash
# Replace this line in server/.env:
CHAPA_SECRET_KEY=CHASECK_TEST-your-actual-chapa-secret-key-here

# With your actual key:
CHAPA_SECRET_KEY=CHASECK_TEST-jP1PvRveaH0GqCRiN8OX4AucVDvZQjhq
```

---

## 📱 Step 2: Get Telebirr Credentials (Optional)

### 1. Apply for Telebirr API:
- Go to: https://developer.ethiotelecom.et/
- Apply for merchant account
- Complete business verification

### 2. Get Your Credentials:
- **App ID**: Your application identifier
- **App Key**: Your private key for signing
- **Merchant ID**: Your merchant identifier

### 3. Update Your .env File:
```bash
TELEBIRR_APP_ID=your-app-id-here
TELEBIRR_APP_KEY=your-app-key-here
TELEBIRR_MERCHANT_ID=your-merchant-id-here
```

---

## 🧪 Step 3: Test Your Configuration

### 1. Restart Your Server:
```bash
cd server
npm run dev
```

### 2. Test Payment Methods API:
```bash
curl http://localhost:3003/api/payments/methods
```

### 3. Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "chapa",
      "name": "Chapa",
      "enabled": true,
      "configured": true
    }
  ],
  "debug": {
    "chapaConfigured": true,
    "telebirrConfigured": false,
    "totalMethods": 1
  }
}
```

---

## 🔍 Step 4: Test Payment Flow

### 1. Book an Appointment:
- Go to http://localhost:5173/appointments
- Create a new appointment with a fee > 0

### 2. Try Payment:
- Click "Pay Now" on the appointment
- Fill in customer details
- Select Chapa as payment method
- Click "Pay 100 ETB" (or your amount)

### 3. Expected Behavior:
- **With Valid Key**: Opens Chapa payment window
- **With Invalid Key**: Shows error "Invalid Chapa API credentials"

---

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid Chapa API credentials"
**Solution**: 
- Check your secret key is correct
- Make sure it starts with `CHASECK_TEST-` for test mode
- Verify you copied the full key without spaces

### Issue 2: "Payment initialization failed"
**Solution**:
- Check your internet connection
- Verify Chapa API is accessible
- Check server logs for detailed error

### Issue 3: "No payment methods available"
**Solution**:
- Configure at least one payment provider (Chapa or Telebirr)
- Restart your server after updating .env
- Check the `/api/payments/methods` endpoint

---

## 📋 Configuration Checklist

- [ ] **Chapa Account Created** - dashboard.chapa.co
- [ ] **Secret Key Obtained** - From Chapa dashboard
- [ ] **Secret Key Updated** - In server/.env file
- [ ] **Server Restarted** - After updating .env
- [ ] **Payment Methods API Tested** - Returns enabled methods
- [ ] **Payment Flow Tested** - Can initiate payments
- [ ] **Webhook URLs Configured** - In Chapa dashboard (for production)

---

## 🌐 Production Deployment

### 1. Update Webhook URLs in Chapa Dashboard:
```
Callback URL: https://yourdomain.com/api/payments/callback
Return URL: https://yourdomain.com/payments/success
```

### 2. Use Production Secret Key:
- Switch from test key (`CHASECK_TEST-`) to live key (`CHASECK_LIVE-`)
- Update in your production .env file

### 3. Test with Real Money:
- Use small amounts for initial testing
- Verify payments appear in your Chapa dashboard
- Check webhook notifications are received

---

## 💡 Quick Start (Test Mode)

If you want to test immediately with a demo key:

1. **Use Chapa Test Key** (for testing only):
```bash
CHAPA_SECRET_KEY=CHASECK_TEST-jP1PvRveaH0GqCRiN8OX4AucVDvZQjhq
```

2. **Restart Server**:
```bash
cd server && npm run dev
```

3. **Test Payment Flow**:
- Book appointment with fee
- Try payment with test card: `4000000000000002`
- Use any future expiry date and CVV

---

## 🎯 Next Steps

1. **Configure Chapa** - Get your actual secret key
2. **Test Payments** - Verify the flow works
3. **Configure Webhooks** - For production deployment
4. **Go Live** - Switch to production keys

---

**Status**: ⚠️ **CONFIGURATION REQUIRED** - Add your Chapa secret key to complete setup!

**Help**: If you need help getting Chapa credentials, visit https://dashboard.chapa.co/