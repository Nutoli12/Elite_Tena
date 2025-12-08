import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';

// Import contract ABI
const CONTRACT_ABI = [
  "function registerPatient(address _patient) external",
  "function registerDoctor(address _doctor) external",
  "function grantConsent(address _doctor, uint256 _expiryTime) external",
  "function revokeConsent(address _doctor) external",
  "function addMedicalRecord(address _patient, string memory _ipfsHash, string memory _recordType) external",
  "function addPrescription(address _patient, string memory _ipfsHash) external",
  "function addLabResult(address _patient, string memory _ipfsHash) external",
  "event PatientRegistered(address indexed patient, uint256 timestamp)",
  "event DoctorRegistered(address indexed doctor, uint256 timestamp)",
  "event ConsentGranted(address indexed patient, address indexed doctor, uint256 expiryTime)",
  "event ConsentRevoked(address indexed patient, address indexed doctor)",
  "event MedicalRecordAdded(address indexed patient, address indexed doctor, string ipfsHash, uint256 timestamp)",
  "event PrescriptionAdded(address indexed patient, address indexed doctor, string ipfsHash, uint256 timestamp)",
  "event LabResultAdded(address indexed patient, address indexed labTech, string ipfsHash, uint256 timestamp)"
];

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: Contract | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x2c0cE04B1013451660f62DE1292440e4bead3894';
const SEPOLIA_CHAIN_ID = 11155111;

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  // Initialize provider on mount
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const web3Provider = new BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      // Check if already connected
      checkConnection(web3Provider);

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async (web3Provider: BrowserProvider) => {
    try {
      const accounts = await web3Provider.listAccounts();
      if (accounts.length > 0) {
        const userSigner = await web3Provider.getSigner();
        const address = await userSigner.getAddress();
        const network = await web3Provider.getNetwork();
        
        setSigner(userSigner);
        setAccount(address);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // Initialize contract
        const healthContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);
        setContract(healthContract);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      window.location.reload();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    if (!provider) {
      alert('Please install MetaMask!');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts = await provider.send('eth_requestAccounts', []);
      const userSigner = await provider.getSigner();
      const address = await userSigner.getAddress();
      const network = await provider.getNetwork();

      setSigner(userSigner);
      setAccount(address);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Initialize contract
      const healthContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);
      setContract(healthContract);

      // Check if on correct network
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        await switchNetwork();
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert(`Failed to connect wallet: ${error.message}`);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
    }
  };

  const value: Web3ContextType = {
    provider,
    signer,
    contract,
    account,
    chainId,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
