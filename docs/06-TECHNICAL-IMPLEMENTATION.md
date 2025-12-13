# Elite-Tena Healthcare Management System
## Part 6: Technical Implementation Details

---

## 6.1 Authentication System

### Web3 Wallet Authentication
```typescript
// Frontend: Connect MetaMask
const connectWallet = async () => {
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });
  const walletAddress = accounts[0];
  
  // Sign message for verification
  const message = `Sign in to Elite-Tena: ${Date.now()}`;
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress]
  });
  
  // Send to backend
  await axios.post('/auth/wallet/connect', {
    walletAddress,
    signature,
    message
  });
};
```

### JWT Token Management
```javascript
// Backend: Generate JWT
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { walletAddress: user.walletAddress, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware: Verify Token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Role-Based Access Control
```javascript
// Middleware: Check Role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
router.post('/prescriptions', authMiddleware, requireRole('doctor'), createPrescription);
```

---

## 6.2 Blockchain Integration

### Smart Contract (Solidity)
```solidity
// EliteHealthSystemEnhanced.sol
contract EliteHealthSystemEnhanced is Ownable, ReentrancyGuard {
    
    enum ConsentType { MedicalRecords, Prescriptions, LabResults, All }
    
    struct Consent {
        address patient;
        address provider;
        ConsentType consentType;
        bool isActive;
        uint256 grantedAt;
        uint256 expiresAt;
    }
    
    mapping(address => mapping(address => mapping(ConsentType => Consent))) public consents;
    
    function grantConsent(
        address _provider,
        ConsentType _consentType,
        uint256 _durationHours
    ) external {
        uint256 expiresAt = _durationHours > 0 
            ? block.timestamp + (_durationHours * 1 hours) 
            : 0;
        
        consents[msg.sender][_provider][_consentType] = Consent({
            patient: msg.sender,
            provider: _provider,
            consentType: _consentType,
            isActive: true,
            grantedAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        emit ConsentGranted(msg.sender, _provider, _consentType, expiresAt);
    }
    
    function checkConsent(
        address _patient,
        address _provider,
        ConsentType _consentType
    ) public view returns (bool) {
        Consent memory consent = consents[_patient][_provider][_consentType];
        if (!consent.isActive) return false;
        if (consent.expiresAt > 0 && block.timestamp > consent.expiresAt) return false;
        return true;
    }
    
    function storeMedicalRecord(
        address _patient,
        string memory _ipfsHash
    ) external {
        require(checkConsent(_patient, msg.sender, ConsentType.MedicalRecords), "No consent");
        medicalRecords[_patient].push(_ipfsHash);
        emit MedicalRecordStored(_patient, msg.sender, _ipfsHash);
    }
}
```

### Backend Blockchain Service
```javascript
// blockchain.cjs
const { ethers } = require('ethers');

class BlockchainService {
  async initialize() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      this.signer
    );
  }
  
  async storeMedicalRecord(patientWallet, ipfsHash) {
    const tx = await this.contract.storeMedicalRecord(patientWallet, ipfsHash);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  }
  
  async checkConsent(patientWallet, providerWallet, consentType) {
    return await this.contract.checkConsent(patientWallet, providerWallet, consentType);
  }
}
```

---

## 6.3 IPFS Integration (Pinata)

```javascript
// ipfs.cjs
const PinataSDK = require('@pinata/sdk');

const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

// Upload JSON data
async function uploadToIPFS(data) {
  const result = await pinata.pinJSONToIPFS(data, {
    pinataMetadata: { name: `medical-record-${Date.now()}` }
  });
  return result.IpfsHash;
}

// Upload file
async function uploadFileToIPFS(fileBuffer, filename) {
  const result = await pinata.pinFileToIPFS(fileBuffer, {
    pinataMetadata: { name: filename }
  });
  return result.IpfsHash;
}

// Retrieve data
async function getFromIPFS(hash) {
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
  return await response.json();
}
```

---

## 6.4 Real-time Communication (Socket.io)

```javascript
// Backend: socketService.js
import { Server } from 'socket.io';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  
  io.on('connection', (socket) => {
    // Join user's room
    socket.on('join', (userId) => {
      socket.join(userId);
    });
    
    // Handle chat messages
    socket.on('chat:message', async (data) => {
      const { senderId, receiverId, message } = data;
      // Save to database
      await Message.create({ senderId, receiverId, content: message });
      // Send to receiver
      io.to(receiverId).emit('chat:message', { senderId, message });
    });
    
    // Handle video call signals
    socket.on('video:call', (data) => {
      io.to(data.receiverId).emit('video:incoming', data);
    });
  });
  
  return io;
};

// Send notification
export const sendNotification = (userId, notification) => {
  io.to(userId).emit('notification', notification);
};
```

```typescript
// Frontend: SocketContext.tsx
const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL);
      newSocket.emit('join', user.walletAddress);
      
      newSocket.on('notification', (data) => {
        // Handle notification
        showNotification(data);
      });
      
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [user]);
  
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

## 6.5 Consent Gate System

```typescript
// Frontend: ConsentGate.tsx
export const ConsentGate: React.FC<{
  patientWallet: string;
  doctorWallet: string;
  children: React.ReactNode;
}> = ({ patientWallet, doctorWallet, children }) => {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkConsent();
  }, [patientWallet, doctorWallet]);
  
  const checkConsent = async () => {
    const response = await axios.get(
      `/consent/status/${patientWallet}/${doctorWallet}`
    );
    setHasConsent(response.data.data?.status === 'active');
    setLoading(false);
  };
  
  if (loading) return <LoadingSpinner />;
  
  if (!hasConsent) {
    return (
      <NoAccessView
        patientWallet={patientWallet}
        onRequestAccess={handleRequestAccess}
      />
    );
  }
  
  return <>{children}</>;
};
```

---

## 6.6 Video Call Integration (Daily.co)

```javascript
// Backend: videoCallController.js
import Daily from '@daily-co/daily-js';

export const createVideoRoom = async (req, res) => {
  const { appointmentId, doctorWallet, patientWallet } = req.body;
  
  // Create Daily.co room
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `appointment-${appointmentId}`,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        enable_chat: true,
        enable_screenshare: true
      }
    })
  });
  
  const room = await response.json();
  
  // Save to database
  await VideoCall.create({
    appointmentId,
    roomUrl: room.url,
    roomName: room.name,
    initiatorWallet: doctorWallet,
    receiverWallet: patientWallet
  });
  
  res.json({ success: true, roomUrl: room.url });
};
```

---

## 6.7 Environment Variables

```env
# Server
PORT=3003
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elite_tena
DB_USER=postgres
DB_PASSWORD=your_password

# Blockchain
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...

# IPFS (Pinata)
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key

# Video Calls
DAILY_API_KEY=your_daily_api_key

# Admin
ADMIN_EMAIL=admin@elitetena.com
ADMIN_WALLET_ADDRESS=0x...
```
