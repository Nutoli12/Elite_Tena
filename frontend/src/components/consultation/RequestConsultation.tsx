import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';

interface RequestConsultationProps {
  doctor: {
    walletAddress: string;
    firstName?: string;
    lastName?: string;
    specialty?: string;
    profileData?: any;
  };
  onSuccess?: (consultation: any) => void;
  onCancel?: () => void;
}

const RequestConsultation: React.FC<RequestConsultationProps> = ({ doctor, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [consultationType, setConsultationType] = useState<'chat' | 'video'>('chat');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const doctorName = doctor.firstName 
    ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`
    : doctor.profileData?.fullName || 'Doctor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let scheduledDateTime: string | undefined;
      if (consultationType === 'video') {
        if (!scheduledDate || !scheduledTime) {
          setError('Please select date and time for video consultation');
          setIsLoading(false);
          return;
        }
        scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
      }

      const response = await consultationService.requestConsultation({
        patientWallet: user?.walletAddress || '',
        doctorWallet: doctor.walletAddress,
        consultationType,
        scheduledTime: scheduledDateTime
      });

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Failed to request consultation');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to request consultation');
    } finally {
      setIsLoading(false);
    }
  };

  // Show payment options after request is created
  if (result) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Consultation Requested!</h2>
          <p className="text-gray-600 mt-2">
            {consultationType === 'chat' ? '24-hour chat' : 'Video'} consultation with {doctorName}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Fee:</span>
            <span className="text-2xl font-bold text-blue-600">
              {result.fee} {result.currency}
            </span>
          </div>
          {result.scheduledTime && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Scheduled:</span>
              <span className="font-medium">
                {new Date(result.scheduledTime).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Payment Options:</h3>
          {result.paymentMethods?.map((method: any) => (
            <button
              key={method.id}
              onClick={() => {
                if (method.id === 'chapa') {
                  handleChapaPayment(result.consultationId);
                } else {
                  // Show P2P payment modal
                  onSuccess?.({ ...result, selectedPaymentMethod: method });
                }
              }}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{method.name}</p>
                  {method.details && (
                    <p className="text-sm text-gray-500">{method.details}</p>
                  )}
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  const handleChapaPayment = async (consultationId: string) => {
    try {
      setIsLoading(true);
      const response = await consultationService.initializeChapaPayment(
        consultationId,
        user?.walletAddress || '',
        `${window.location.origin}/consultations/${consultationId}/payment-success`
      );
      if (response.success && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">👨‍⚕️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{doctorName}</h2>
          <p className="text-gray-600">{doctor.specialty || 'General Practitioner'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consultation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Consultation Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConsultationType('chat')}
              className={`p-4 rounded-xl border-2 transition-all ${
                consultationType === 'chat'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-3xl block mb-2">💬</span>
              <span className="font-medium">Chat</span>
              <p className="text-xs text-gray-500 mt-1">24-hour access</p>
            </button>
            <button
              type="button"
              onClick={() => setConsultationType('video')}
              className={`p-4 rounded-xl border-2 transition-all ${
                consultationType === 'video'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-3xl block mb-2">🎥</span>
              <span className="font-medium">Video</span>
              <p className="text-xs text-gray-500 mt-1">Scheduled call</p>
            </button>
          </div>
        </div>

        {/* Schedule (for video) */}
        {consultationType === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {isLoading ? 'Requesting...' : 'Request Consultation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestConsultation;
