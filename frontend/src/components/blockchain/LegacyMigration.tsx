import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Clock, AlertCircle, Zap, RefreshCw, FileText } from 'lucide-react';
import axios from '../../lib/axios';

interface MigrationStatus {
  total: number;
  onBlockchain: number;
  web2only: number;
  demo: number;
  legacy: number;
  real: number;
  migrationAvailable: boolean;
}

interface LegacyRecord {
  id: string;
  title: string;
  createdAt: string;
  patientWallet: string;
  doctorWallet: string;
}

interface LegacyMigrationProps {
  className?: string;
}

export const LegacyMigration: React.FC<LegacyMigrationProps> = ({ className = '' }) => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [legacyRecords, setLegacyRecords] = useState<LegacyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  useEffect(() => {
    fetchMigrationData();
  }, []);

  const fetchMigrationData = async () => {
    try {
      setError(null);
      
      // Fetch migration status
      const statusResponse = await axios.get('/legacy-migration/status');
      if (statusResponse.data.success) {
        setMigrationStatus(statusResponse.data.data);
      }

      // Fetch legacy records
      const recordsResponse = await axios.get('/legacy-migration/records');
      if (recordsResponse.data.success) {
        setLegacyRecords(recordsResponse.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch migration data');
    } finally {
      setLoading(false);
    }
  };

  const migrateAllRecords = async () => {
    try {
      setMigrating(true);
      setError(null);
      
      const response = await axios.post('/legacy-migration/migrate-all');
      if (response.data.success) {
        // Refresh data after a delay
        setTimeout(() => {
          fetchMigrationData();
          setMigrating(false);
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start migration');
      setMigrating(false);
    }
  };

  const migrateSelectedRecords = async () => {
    if (selectedRecords.length === 0) {
      setError('Please select records to migrate');
      return;
    }

    try {
      setMigrating(true);
      setError(null);
      
      const response = await axios.post('/legacy-migration/migrate-specific', {
        recordIds: selectedRecords
      });
      
      if (response.data.success) {
        // Refresh data
        await fetchMigrationData();
        setSelectedRecords([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to migrate selected records');
    } finally {
      setMigrating(false);
    }
  };

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const selectAllRecords = () => {
    setSelectedRecords(legacyRecords.map(record => record.id));
  };

  const clearSelection = () => {
    setSelectedRecords([]);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading migration status...</span>
        </div>
      </div>
    );
  }

  if (!migrationStatus) return null;

  // Don't show if no legacy records
  if (!migrationStatus.migrationAvailable) {
    return (
      <div className={`bg-green-50 rounded-xl border border-green-200 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">All Records on Blockchain!</h3>
            <p className="text-sm text-green-700">All your medical records are already stored on blockchain.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Upload className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Legacy Record Migration</h3>
            <p className="text-sm text-gray-600">Upgrade old Web2 records to blockchain storage</p>
          </div>
        </div>
      </div>

      {/* Migration Status */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{migrationStatus.total}</div>
          <div className="text-xs text-gray-600">Total Records</div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{migrationStatus.web2only}</div>
          <div className="text-xs text-red-700">Web2 Only</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{migrationStatus.demo}</div>
          <div className="text-xs text-yellow-700">Demo Mode</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{migrationStatus.legacy}</div>
          <div className="text-xs text-purple-700">Legacy Migrated</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{migrationStatus.real}</div>
          <div className="text-xs text-green-700">Real Blockchain</div>
        </div>
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

      {/* Migration Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={migrateAllRecords}
          disabled={migrating || migrationStatus.web2only === 0}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className={`w-4 h-4 ${migrating ? 'animate-pulse' : ''}`} />
          {migrating ? 'Migrating...' : `Migrate All (${migrationStatus.web2only})`}
        </button>

        <button
          onClick={migrateSelectedRecords}
          disabled={migrating || selectedRecords.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          Migrate Selected ({selectedRecords.length})
        </button>

        <button
          onClick={fetchMigrationData}
          disabled={migrating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legacy Records List */}
      {legacyRecords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">
              Records Needing Migration ({legacyRecords.length})
            </h4>
            <div className="flex gap-2">
              <button
                onClick={selectAllRecords}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {legacyRecords.map((record) => (
              <div
                key={record.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRecords.includes(record.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => toggleRecordSelection(record.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedRecords.includes(record.id)}
                  onChange={() => toggleRecordSelection(record.id)}
                  className="w-4 h-4 text-blue-600"
                />
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{record.title}</div>
                  <div className="text-sm text-gray-600">
                    Created: {new Date(record.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  Web2 Only
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg border border-orange-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">🚀 Legacy Migration Process:</h4>
        <div className="text-xs text-gray-700 space-y-1">
          <div>1. 📋 <strong>Identify:</strong> Find old Web2-only records</div>
          <div>2. 🔗 <strong>Upgrade:</strong> Add blockchain metadata (demo mode)</div>
          <div>3. ✅ <strong>Verify:</strong> Records become verifiable with blockchain tools</div>
          <div>4. 🔄 <strong>Sync:</strong> Background service will sync to real blockchain later</div>
        </div>
      </div>
    </div>
  );
};

export default LegacyMigration;