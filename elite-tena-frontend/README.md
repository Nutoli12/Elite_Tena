# 🏥 Elite Tena Healthcare - Frontend Application

> Decentralized Healthcare Management System for Ethiopia

## 🌟 Overview

Elite Tena is a blockchain-powered healthcare platform that provides secure, decentralized access to medical records, prescriptions, lab results, and appointments. Built with React, TypeScript, and Ethereum smart contracts.

## ✨ Features

### Current (Sprint 1) ✅
- 🔐 **Wallet Authentication** - MetaMask integration with signature-based login
- 🌍 **Bilingual Support** - English and Amharic (አማርኛ)
- 📊 **Dashboard** - Health statistics and quick actions
- 🎨 **Beautiful UI** - Smooth animations with Framer Motion
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- 🔒 **Protected Routes** - Role-based access control
- 👥 **Multi-Role Support** - Patient, Doctor, Pharmacist, Lab Tech, Admin

### Coming Soon (Sprint 2+) 🚧
- 📁 Medical Records Management
- 💊 Prescription System
- 📅 Appointment Booking
- 🧪 Lab Results
- 🔐 Consent Management
- 💰 Payment System (ETH/ETB)

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
MetaMask browser extension
```

### Installation
```bash
# Clone and navigate
cd elite-tena-frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

Visit: `http://localhost:5173`

## 📁 Project Structure

```
elite-tena-frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI elements
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   ├── i18n/              # Internationalization
│   │   └── index.ts       # i18n configuration
│   ├── lib/               # Utilities
│   │   └── axios.ts       # API client
│   ├── pages/             # Page components
│   │   └── Dashboard.tsx  # Main dashboard
│   ├── types/             # TypeScript definitions
│   │   ├── auth.ts        # Auth types
│   │   └── healthcare.ts  # Healthcare types
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── .env.example           # Environment template
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript config
└── vite.config.ts         # Vite configuration
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React Router | Routing |
| i18next | Internationalization |
| Ethers.js | Blockchain |
| Axios | HTTP Client |

## 🎨 Design System

### Colors
- **Medical Blue**: Primary healthcare color
- **Ethiopian Colors**: Green (#078930), Yellow (#fcd116), Red (#da121a)
- **Gradients**: Healthcare gradient, Ethiopian gradient

### Components
- Medical cards with hover effects
- Healthcare buttons with animations
- Custom scrollbars
- Responsive navigation

### Animations
- Heartbeat pulse
- Float effect
- Fade in/up
- Slide in
- Gentle bounce

## 🔐 Authentication Flow

1. User clicks "Connect to Continue"
2. MetaMask popup appears
3. User approves connection
4. Sign authentication message
5. Backend validates signature
6. JWT token issued
7. User redirected to dashboard

## 🌍 Internationalization

### Supported Languages
- 🇺🇸 English
- 🇪🇹 Amharic (አማርኛ)

### Adding Translations
Edit `src/i18n/index.ts`:
```typescript
const resources = {
  en: {
    translation: {
      key: "English text"
    }
  },
  am: {
    translation: {
      key: "አማርኛ ጽሑፍ"
    }
  }
};
```

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000

# Blockchain
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia

# IPFS (Optional)
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### Backend Integration
The frontend expects these API endpoints:
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/profile` - Get user profile

## 📱 Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

## 🎯 User Roles

### Patient
- View medical records
- Book appointments
- View prescriptions
- Access lab results
- Manage consent

### Doctor
- View patients
- Create medical records
- Issue prescriptions
- Approve lab results

### Pharmacist
- View prescriptions
- Dispense medications
- Manage inventory

### Lab Technician
- Upload lab results
- Manage test categories

### Admin
- System analytics
- User management
- Provider approval

## 🧪 Testing

### Manual Testing
```bash
# Start dev server
npm run dev

# Test wallet connection
1. Open MetaMask
2. Switch to Sepolia
3. Connect wallet
4. Sign message

# Test language switching
1. Click globe icon
2. Select አማርኛ
3. Verify UI updates
```

### Build Testing
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Deployment

### Build
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel --prod
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

## 🐛 Troubleshooting

### MetaMask Issues
- Ensure MetaMask is installed
- Check you're on Sepolia network
- Try disconnecting and reconnecting

### API Connection Issues
- Verify backend is running
- Check VITE_API_URL in .env
- Ensure CORS is enabled

### Build Issues
- Delete node_modules
- Clear npm cache: `npm cache clean --force`
- Reinstall: `npm install`

## 📚 Documentation

- [Quick Start Guide](./QUICK-START.md)
- [Sprint 1 Complete](./SPRINT-1-COMPLETE.md)
- [API Documentation](../server/README.md)
- [Smart Contract Docs](../elite-tena-smart-contracts/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- Ethiopian healthcare community
- Open source contributors
- Blockchain developers

## 📞 Support

For issues or questions:
- Check documentation
- Review console errors
- Verify configuration
- Contact development team

---

**Built with ❤️ for Ethiopian Healthcare**

🌍 Making healthcare accessible and secure for everyone
