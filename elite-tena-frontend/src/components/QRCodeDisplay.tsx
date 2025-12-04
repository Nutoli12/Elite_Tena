import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, CheckCircle } from 'lucide-react';
import axios from '../lib/axios';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  appointmentId: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  appointmentId,
  className = ''
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => {
    generateQRCode();
  }, [appointmentId]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      // First, get or generate QR code data from backend
      const response = await axios.post(`/appointments/${appointmentId}/generate-qr`);
      
      if (response.data.success) {
        const qrCodeData = response.data.data.qrCodeData;
        setQrData(response.data.data.qrDataObject);

        // Generate QR code image
        const qrImageUrl = await QRCode.toDataURL(qrCodeData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1e40af',
            light: '#ffffff'
          }
        });

        setQrCodeUrl(qrImageUrl);
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `appointment-qr-${appointmentId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!qrCodeUrl) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Failed to generate QR code</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-xl border-2 border-gray-200 p-6 ${className}`}
    >
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Check-in QR Code</h3>
        </div>

        <div className="bg-white p-4 rounded-lg inline-block">
          <img
            src={qrCodeUrl}
            alt="Appointment QR Code"
            className="w-64 h-64"
          />
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Show this QR code at reception for quick check-in</p>
          <p className="text-xs text-gray-500">
            Appointment: {new Date(qrData?.date).toLocaleDateString()}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadQRCode}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download QR Code
        </motion.button>
      </div>
    </motion.div>
  );
};
