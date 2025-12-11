import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, Clock, AlertCircle, Zap, ExternalLink } from 'lucide-react';
import axios from '../../lib/axios';

interface SyncStatus {
  total: number;
  demo: number;
  real: number;
  web2only: number;
  syncEnabled: boolean;
  lastCheck: string;
}

interface BlockchainSyncStatusProps {
  className?: string;
}

export const BlockchainSyncStatus: React.FC<BlockchainSyncStatusProps> = ({ className = '' }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      const response = await axios.get('/blockchain-sync/status');
      if (response.data.success) {
        setSyncStatus(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const response = await axios.post('/blockchain-sync/trigger');
      if (response.data.success) {
        // Refresh status after a delay
        setTimeout(fetchSyncStatus, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading sync status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!syncStatus) return null;

  const syncProgress = syncStatus.total > 0 ? (syncStatus.real / syncStatus.total) * 100 : 0;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Blockchain Sync Status</h3>
            <p className="text-sm text-gray-600">Demo → Real Web3 Migration</p>
          </div>
        </div>
        
        <button
          onClick={triggerSync}
          disabled={syncing || !syncStatus.syncEnabled}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Sync Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Migration Progress</span>
          <span className="text-sm text-gray-600">{Math.round(syncProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${syncProgress}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{syncStatus.total}</div>
          <div className="text-xs text-gray-600">Total Records</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{syncStatus.demo}</div>
          <div className="text-xs text-yellow-700">Demo Mode</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{syncStatus.real}</div>
          <div className="text-xs text-green-700">Real Blockchain</div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{syncStatus.web2only}</div>
          <div className="text-xs text-blue-700">Web2 Only</div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">Sync Service</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            syncStatus.syncEnabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {syncStatus.syncEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {syncStatus.demo > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-700">Pending Sync</span>
            </div>
            <span className="text-xs text-yellow-700">
              {syncStatus.demo} record{syncStatus.demo !== 1 ? 's' : ''} waiting
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-700">Last Check</span>
          </div>
          <span className="text-xs text-gray-600">
            {new Date(syncStatus.lastCheck).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">🚀 How Hybrid Web3 Works:</h4>
        <div className="text-xs text-gray-700 space-y-1">
          <div>1. 🎭 <strong>Demo Mode:</strong> Records created instantly with mock blockchain data</div>
          <div>2. 🔄 <strong>Background Sync:</strong> System uploads to real blockchain automatically</div>
          <div>3. ✅ <strong>Real Verification:</strong> Users get actual blockchain proof</div>
          <div>4. 🌐 <strong>Best of Both:</strong> Fast UX + True Web3 security</div>
        </div>
      </div>

      {/* Etherscan Link */}
      {syncStatus.real > 0 && (
        <div className="mt-4 text-center">
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            View Real Transactions on Sepolia Etherscan
          </a>
        </div>
      )}
    </div>
  );
};

export default BlockchainSyncStatus;