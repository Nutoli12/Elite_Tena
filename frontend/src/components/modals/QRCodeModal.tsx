import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Loader2, Clock, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: any;
  onSuccess?: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [validityHours, setValidityHours] = useState(24);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/prescriptions/${prescription.id}/access/qr-generate`,
        {
          patientWalletAddress: user?.walletAddress,
          validityHours
        }
      );

      if (response.data.success) {
        setQrData(response.data.data);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      alert(error.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const regenerateQRCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/prescriptions/${prescription.id}/access/qr-regenerate`,
        {
          patientWalletAddress: user?.walletAddress,
          oldGrantId: qrData?.accessGrant?.id,
          validityHours
        }
      );

      if (response.data.success) {
        setQrData(response.data.data);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to regenerate QR code:', error);
      alert(error.response?.data?.error || 'Failed to regenerate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `prescription-qr-${prescription.id}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setQrData(null);
      setValidityHours(24);
      onClose();
    }
  };

  const getExpiryTime = () => {
    if (!qrData?.accessGrant?.expiresAt) return '';
    return new Date(qrData.accessGrant.expiresAt).toLocaleString();
  };

  const isExpired = () => {
    if (!qrData?.accessGrant?.expiresAt) return false;
    return new Date(qrData.accessGrant.expiresAt) < new Date();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">QR Code Access</h2>
                  <p className="text-sm text-gray-600">For walk-in pharmacy visits</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Prescription Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Prescription</h3>
                <p className="text-gray-800 font-medium">{prescription.medicationName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {prescription.dosage} • {prescription.frequency}
                </p>
              </div>

              {!qrData ? (
                <>
                  {/* Validity Hours Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Validity
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 24, 72].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setValidityHours(hours)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            validityHours === hours
                              ? 'border-purple-500 bg-purple-50 text-purple-900'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl font-bold">{hours}</div>
                            <div className="text-xs text-gray-600">
                              {hours === 1 ? 'hour' : 'hours'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                    <p className="font-semibold mb-2">How it works:</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Generate a time-limited QR code</li>
                      <li>Show it to the pharmacist</li>
                      <li>They scan it to gain temporary access</li>
                      <li>QR code expires after the set time</li>
                    </ol>
                    <p className="mt-3">
                      💡 You can regenerate the QR code unlimited times if it expires
                    </p>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateQRCode}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Generate QR Code
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* QR Code Display */}
                  <div className="flex flex-col items-center">
                    <div className={`p-6 bg-white border-4 rounded-2xl ${
                      isExpired() ? 'border-red-300' : 'border-purple-300'
                    }`}>
                      <QRCodeCanvas
                        id="qr-code-canvas"
                        value={qrData.qrCodeData}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    {/* Status */}
                    <div className={`mt-4 px-4 py-2 rounded-full text-sm font-medium ${
                      isExpired()
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {isExpired() ? '⚠️ Expired' : '✓ Active'}
                    </div>

                    {/* Expiry Info */}
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {isExpired() ? 'Expired at' : 'Expires at'}: {getExpiryTime()}
                        </span>
                      </div>
                      {qrData.regenerationCount > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Regenerated {qrData.regenerationCount} time(s)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
                    <p className="font-semibold mb-2">Instructions:</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Show this QR code to the pharmacist</li>
                      <li>They will scan it with their device</li>
                      <li>They'll get temporary access to dispense your prescription</li>
                    </ol>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>
                    <button
                      onClick={regenerateQRCode}
                      disabled={loading}
                      className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
