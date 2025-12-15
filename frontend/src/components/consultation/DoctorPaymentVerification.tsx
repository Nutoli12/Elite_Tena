import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import type { Consultation } from '../../services/consultationService';

interface DoctorPaymentVerificationProps {
  onVerified?: () => void;
}

const DoctorPaymentVerification: React.FC<DoctorPaymentVerificationProps> = ({ onVerified }) => {
  const { user } = useAuth();
  const [pendingConsultations, setPendingConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingConsultations();
  }, [user?.walletAddress]);

  const loadPendingConsultations = async () => {
    if (!user?.walletAddress) return;
    
    try {
      const response = await consultationService.getConsultations({
        userWallet: user.walletAddress,
        role: 'doctor',
        status: 'payment_submitted'
      });
      setPendingConsultations(response.data || []);
    } catch (error) {
      console.error('Failed to load pending consultations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (consultationId: string) => {
    if (!window.confirm('Confirm that you have received this payment?')) return;

    setVerifyingId(consultationId);
    try {
      await consultationService.verifyPayment(consultationId, user?.walletAddress || '');
      setPendingConsultations(prev => prev.filter(c => c.id !== consultationId));
      onVerified?.();
    } catch (error) {
      console.error('Failed to verify payment:', error);
      alert('Failed to verify payment. Please try again.');
    } finally {
      setVerifyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (pendingConsultations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>⏳</span>
          Pending Payment Verifications ({pendingConsultations.length})
        </h2>
      </div>

      <div className="divide-y">
        {pendingConsultations.map((consultation) => (
          <div key={consultation.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  consultation.consultationType === 'chat' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <span className="text-2xl">
                    {consultation.consultationType === 'chat' ? '💬' : '🎥'}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {consultation.patient?.firstName || 'Patient'} {consultation.patient?.lastName || ''}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {consultation.consultationType === 'chat' ? 'Chat' : 'Video'} Consultation
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-500">Amount:</span>{' '}
                      <span className="font-semibold text-green-600">
                        {consultation.consultationFee} {consultation.currency}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Payment Method:</span>{' '}
                      <span className="font-medium capitalize">
                        {(consultation as any).paymentMethod?.replace('_', ' ')}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Reference:</span>{' '}
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {(consultation as any).paymentReference}
                      </span>
                    </p>
                    {consultation.scheduledTime && (
                      <p className="text-sm">
                        <span className="text-gray-500">Scheduled:</span>{' '}
                        {new Date(consultation.scheduledTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleVerify(consultation.id)}
                disabled={verifyingId === consultation.id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
              >
                {verifyingId === consultation.id ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Verify Payment
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorPaymentVerification;
