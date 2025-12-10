import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

interface QRCodeScannerProps {
  onSuccess?: (prescription: any) => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrToken.trim() || !pharmacyName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/prescriptions/access/qr-scan', {
        qrCodeToken: qrToken.trim(),
        pharmacistWalletAddress: user?.walletAddress,
        pharmacyName: pharmacyName.trim()
      });

      if (response.data.success) {
        setResult(response.data.data);
        setQrToken('');
        onSuccess?.(response.data.data.prescription);
      }
    } catch (error: any) {
      console.error('Failed to scan QR code:', error);
      setError(error.response?.data?.error || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setQrToken('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <QrCode className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Scan Patient QR Code</h3>
          <p className="text-sm text-gray-600">Get temporary access to prescription</p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleScan} className="space-y-4">
          {/* Pharmacy Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Pharmacy Name *
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., City Pharmacy"
              required
            />
          </div>

          {/* QR Code Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code Token *
            </label>
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste QR code token here"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Scan the patient's QR code or manually enter the token
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-red-900">Scan Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-2">How to scan:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Ask patient to show their QR code</li>
              <li>Scan it with your device camera</li>
              <li>Or manually enter the token from the QR code</li>
              <li>Submit to gain temporary access</li>
            </ol>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                Scan QR Code
              </>
            )}
          </button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-green-900">Access Granted!</h4>
                <p className="text-sm text-green-700 mt-1">
                  You now have temporary access to this prescription
                </p>
              </div>
            </div>
          </div>

          {/* Prescription Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Prescription Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Medication:</span>
                <p className="font-medium text-gray-900">{result.prescription.medicationName}</p>
              </div>
              <div>
                <span className="text-gray-600">Dosage:</span>
                <p className="font-medium text-gray-900">{result.prescription.dosage}</p>
              </div>
              <div>
                <span className="text-gray-600">Frequency:</span>
                <p className="font-medium text-gray-900">{result.prescription.frequency}</p>
              </div>
              <div>
                <span className="text-gray-600">Quantity:</span>
                <p className="font-medium text-gray-900">{result.prescription.quantity}</p>
              </div>
              {result.prescription.instructions && (
                <div>
                  <span className="text-gray-600">Instructions:</span>
                  <p className="text-gray-900 mt-1">{result.prescription.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Access Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
            <p>
              ⏰ Access expires: {new Date(result.accessGrant.expiresAt).toLocaleString()}
            </p>
            <p className="mt-1">
              📋 You can now view and dispense this prescription
            </p>
          </div>

          {/* Scan Another Button */}
          <button
            onClick={handleReset}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Scan Another QR Code
          </button>
        </motion.div>
      )}
    </div>
  );
};
