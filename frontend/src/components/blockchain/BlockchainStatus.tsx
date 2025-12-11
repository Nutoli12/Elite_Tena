import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface BlockchainStatusProps {
  blockchain?: {
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    stored?: boolean;
    network?: string;
    prescriptionId?: string;
    labResultId?: string;
    appointmentFee?: string;
    paid?: boolean;
  };
  onBlockchain?: boolean;
  className?: string;
  showDetails?: boolean;
}

export const BlockchainStatus: React.FC<BlockchainStatusProps> = ({ 
  blockchain, 
  onBlockchain, 
  className = '', 
  showDetails = true 
}) => {
  if (!blockchain && !onBlockchain) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Web2 Only (Database)</span>
      </div>
    );
  }

  const isOnBlockchain = blockchain?.stored || onBlockchain;
  const network = blockchain?.network || 'sepolia';
  const explorerUrl = network === 'mainnet' 
    ? 'https://etherscan.io' 
    : 'https://sepolia.etherscan.io';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-2 ${className}`}
    >
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {isOnBlockchain ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">
              ✅ Stored on Blockchain
            </span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-700">
              ⏳ Processing...
            </span>
          </>
        )}
      </div>

      {/* Blockchain Details */}
      {showDetails && blockchain && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          {/* Transaction Hash */}
          {blockchain.transactionHash && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Transaction:</span>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {blockchain.transactionHash.substring(0, 10)}...
                </code>
                {/* Only show Etherscan link for real transactions */}
                {!blockchain.transactionHash.startsWith('0xDEMO') && 
                 !blockchain.transactionHash.startsWith('0xLEGACY') ? (
                  <a
                    href={`${explorerUrl}/tx/${blockchain.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                    title="View on Etherscan"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <div 
                    className="text-gray-400 cursor-help"
                    title={
                      blockchain.transactionHash.startsWith('0xDEMO') 
                        ? "Demo mode transaction - will be synced to real blockchain"
                        : "Legacy migrated transaction - will be synced to real blockchain"
                    }
                  >
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Block Number */}
          {blockchain.blockNumber && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Block:</span>
              <span className="font-mono text-xs">#{blockchain.blockNumber}</span>
            </div>
          )}

          {/* Gas Used */}
          {blockchain.gasUsed && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gas Used:</span>
              <span className="font-mono text-xs">{parseInt(blockchain.gasUsed).toLocaleString()}</span>
            </div>
          )}

          {/* Network */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Network:</span>
            <span className="text-xs capitalize font-medium text-blue-600">
              {network}
            </span>
          </div>

          {/* Prescription ID */}
          {blockchain.prescriptionId && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Prescription ID:</span>
              <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {blockchain.prescriptionId.substring(0, 12)}...
              </code>
            </div>
          )}

          {/* Lab Result ID */}
          {blockchain.labResultId && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Lab Result ID:</span>
              <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {blockchain.labResultId.substring(0, 12)}...
              </code>
            </div>
          )}

          {/* Appointment Fee */}
          {blockchain.appointmentFee && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Fee Paid:</span>
              <span className="font-medium text-green-600">
                {blockchain.appointmentFee} ETH
              </span>
            </div>
          )}
        </div>
      )}

      {/* Web3 Badge */}
      {isOnBlockchain && (
        <div className="flex gap-2">
          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            <span>🔗</span>
            <span>TRUE WEB3</span>
          </div>
          
          {/* Transaction Type Badge */}
          {blockchain?.transactionHash && (
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              blockchain.transactionHash.startsWith('0xDEMO') 
                ? 'bg-yellow-100 text-yellow-800'
                : blockchain.transactionHash.startsWith('0xLEGACY')
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {blockchain.transactionHash.startsWith('0xDEMO') && (
                <>
                  <span>⚡</span>
                  <span>DEMO MODE</span>
                </>
              )}
              {blockchain.transactionHash.startsWith('0xLEGACY') && (
                <>
                  <span>📜</span>
                  <span>LEGACY</span>
                </>
              )}
              {!blockchain.transactionHash.startsWith('0xDEMO') && 
               !blockchain.transactionHash.startsWith('0xLEGACY') && (
                <>
                  <span>✅</span>
                  <span>REAL BLOCKCHAIN</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BlockchainStatus;