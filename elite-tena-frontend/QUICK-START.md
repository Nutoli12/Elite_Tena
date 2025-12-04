# 🚀 Elite Tena Frontend - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- MetaMask browser extension
- Backend server running (optional for testing UI)

## Installation

```bash
# Navigate to frontend directory
cd elite-tena-frontend

# Install dependencies
npm install
```

## Configuration

```bash
# Create environment file
copy .env.example .env

# Edit .env file with your settings
notepad .env
```

**Required Environment Variables:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
VITE_CHAIN_ID=11155111
```

## Run Development Server

```bash
npm run dev
```

Open browser to: `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Project Features

### ✅ Implemented (Sprint 1)
- 🔐 Wallet authentication (MetaMask)
- 🌍 Bilingual support (English/Amharic)
- 📊 Dashboard with health stats
- 🎨 Beautiful UI with animations
- 📱 Responsive design
- 🔒 Protected routes
- 👤 Role-based navigation

### 🚧 Coming Soon (Sprint 2+)
- 📁 Medical records management
- 💊 Prescription system
- 📅 Appointment booking
- 🧪 Lab results
- 🔐 Consent management
- 💰 Payment system

## Testing

### Test Wallet Connection
1. Install MetaMask
2. Switch to Sepolia testnet
3. Click "Connect to Continue"
4. Approve connection in MetaMask
5. Sign authentication message

### Test Language Switching
1. Click globe icon (🌍) in header
2. Select አማርኛ (Amharic)
3. UI updates to Amharic
4. Switch back to English

### Test Navigation
1. After connecting, view dashboard
2. Click sidebar menu items
3. Test mobile menu (resize browser)
4. Try logout button

## Troubleshooting

### "MetaMask is not installed"
- Install MetaMask extension
- Refresh page after installation

### "Connection failed"
- Check MetaMask is unlocked
- Ensure you're on Sepolia network
- Try disconnecting and reconnecting

### Backend API errors
- Ensure backend server is running on port 5000
- Check VITE_API_URL in .env
- Verify CORS is enabled on backend

### Build errors
- Delete node_modules and package-lock.json
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

## File Structure

```
src/
├── components/       # Reusable UI components
│   ├── auth/        # Authentication components
│   ├── layout/      # Layout components
│   └── ui/          # UI elements
├── contexts/        # React contexts (Auth, etc.)
├── i18n/           # Internationalization
├── pages/          # Page components
├── types/          # TypeScript types
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **i18next** - Internationalization
- **Ethers.js** - Blockchain interaction
- **Axios** - HTTP client

## Support

For issues or questions:
1. Check SPRINT-1-COMPLETE.md for details
2. Review console for error messages
3. Verify environment configuration
4. Ensure backend is running

## Next Steps

After Sprint 1 is working:
1. Test all features thoroughly
2. Connect to your backend API
3. Deploy smart contract
4. Ready for Sprint 2 features!

---

**Happy Coding! 🎉**
