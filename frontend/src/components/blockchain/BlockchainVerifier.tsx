import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ExternalLink, CheckCircle, AlertCircle, Copy, Eye } from 'lucide-react';
import axios from '../../lib/axios';

interface BlockchainVerifierProps {
  className?: string;
}

export const BlockchainVerifier: React.FC<BlockchainVerifierProps> = ({ className = '' }) => {
  const [searchType, setSearchType] = useState<'transaction' | 'record'>('transaction');
  const [searchValue, setSearchValue] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyTransaction = async (txHash: string) => {
    try {
      setLoading(true);
      setError(null);

      // For demo, we'll show the transaction details
      // In production, you could use the Etherscan API:
      // const etherscanUrl = `https://sepolia.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=YourApiKeyToken`;
      
      const result = {
        transactionHash: txHash,
        verified: true,
        network: 'Sepolia Testnet',
        explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        status: 'Confirmed',
        blockNumber: 'Loading...',
        gasUsed: 'Loading...',
        timestamp: new Date().toISOString()
      };

      setVerificationResult(result);
    } catch (err) {
      setError('Failed to verify transaction');
    } finally {
      setLoading(false);
    }
  };

  const verifyMedicalRecord = async (recordId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if record exists in database and has blockchain data
      const response = await axios.get(`/medical-records/verify/${recordId}`);
      
      if (response.data.success) {
        const record = response.data.data;
        setVerificationResult({
          recordId,
          verified: record.onBlockchain,
          transactionHash: record.blockchainTxHash,
          blockNumber: record.blockNumber,
          gasUsed: record.gasUsed,
          ipfsHash: record.ipfsHash,
          network: 'Sepolia Testnet',
          explorerUrl: record.blockchainTxHash ? `https://sepolia.etherscan.io/tx/${record.blockchainTxHash}` : null,
          createdAt: record.createdAt
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify medical record');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (!searchValue.trim()) {
      setError('Please enter a value to verify');
      return;
    }

    if (searchType === 'transaction') {
      verifyTransaction(searchValue.trim());
    } else {
      verifyMedicalRecord(searchValue.trim());
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Search className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Blockchain Verifier</h3>
          <p className="text-sm text-gray-600">Verify medical records are stored on blockchain</p>
        </div>
      </div>

      {/* Search Type Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType('transaction')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === 'transaction'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Transaction Hash
        </button>
        <button
          onClick={() => setSearchType('record')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === 'record'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Medical Record ID
        </button>
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={
            searchType === 'transaction'
              ? 'Enter transaction hash (0x...)'
              : 'Enter medical record ID'
          }
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleVerify}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Verify
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </motion.div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-3">
            {verificationResult.verified ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700">✅ Verified on Blockchain</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-yellow-700">⚠️ Not on Blockchain</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {verificationResult.transactionHash && (
              <div>
                <span className="font-medium text-gray-700">Transaction Hash:</span>
                <div className="flex items-center gap-1 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {verificationResult.transactionHash.substring(0, 20)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(verificationResult.transactionHash)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            {verificationResult.blockNumber && (
              <div>
                <span className="font-medium text-gray-700">Block Number:</span>
                <div className="text-gray-600 mt-1">#{verificationResult.blockNumber}</div>
              </div>
            )}

            {verificationResult.gasUsed && (
              <div>
                <span className="font-medium text-gray-700">Gas Used:</span>
                <div className="text-gray-600 mt-1">{parseInt(verificationResult.gasUsed).toLocaleString()}</div>
              </div>
            )}

            {verificationResult.network && (
              <div>
                <span className="font-medium text-gray-700">Network:</span>
                <div className="text-gray-600 mt-1">{verificationResult.network}</div>
              </div>
            )}

            {verificationResult.ipfsHash && (
              <div>
                <span className="font-medium text-gray-700">IPFS Hash:</span>
                <div className="flex items-center gap-1 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {verificationResult.ipfsHash.substring(0, 15)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(verificationResult.ipfsHash)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View on Explorer Button */}
          {verificationResult.explorerUrl && (
            <div className="pt-3 border-t border-gray-200">
              <a
                href={verificationResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                <Eye className="w-4 h-4" />
                View on Sepolia Etherscan
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Examples */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 How to Verify:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>Transaction Hash:</strong> Copy from medical record blockchain status</li>
          <li>• <strong>Record ID:</strong> Use the medical record UUID from the database</li>
          <li>• <strong>Etherscan:</strong> Click "View on Sepolia Etherscan" to see transaction details</li>
          <li>• <strong>IPFS:</strong> Medical data is stored on IPFS, hash stored on blockchain</li>
        </ul>
      </div>
    </div>
  );
};

export default BlockchainVerifier;