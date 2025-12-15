import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';

interface P2PPaymentSubmitProps {
  consultation: {
    id: string;
    consultationFee: number;
    currency: string;
    consultationType: string;
  };
  paymentMethod: {
    id: string;
    name: string;
    details?: string;
  };
  doctorPaymentInfo?: {
    telebirrNumber?: string;
    cbeBirrAccount?: string;
    cbeBirrName?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const P2PPaymentSubmit: React.FC<P2PPaymentSubmitProps> = ({
  consultation,
  paymentMethod,
  doctorPaymentInfo,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getPaymentInstructions = () => {
    switch (paymentMethod.id) {
      case 'telebirr':
        return {
          icon: '📱',
          title: 'Telebirr Payment',
          number: doctorPaymentInfo?.telebirrNumber || paymentMethod.details,
          steps: [
            'Open Telebirr app',
            `Send ${consultation.consultationFee} ETB to: ${doctorPaymentInfo?.telebirrNumber || paymentMethod.details}`,
            'Copy the transaction reference number',
            'Paste it below and submit'
          ]
        };
      case 'cbe_birr':
        return {
          icon: '🏦',
          title: 'CBE Birr Payment',
          number: doctorPaymentInfo?.cbeBirrAccount || paymentMethod.details,
          name: doctorPaymentInfo?.cbeBirrName,
          steps: [
            'Open CBE Birr app',
            `Transfer ${consultation.consultationFee} ETB to account: ${doctorPaymentInfo?.cbeBirrAccount || paymentMethod.details}`,
            'Copy the transaction reference',
            'Paste it below and submit'
          ]
        };
      case 'bank_transfer':
        return {
          icon: '🏛️',
          title: 'Bank Transfer',
          bank: doctorPaymentInfo?.bankName,
          number: doctorPaymentInfo?.bankAccountNumber || paymentMethod.details,
          name: doctorPaymentInfo?.bankAccountName,
          steps: [
            `Transfer ${consultation.consultationFee} ETB to:`,
            `Bank: ${doctorPaymentInfo?.bankName || 'N/A'}`,
            `Account: ${doctorPaymentInfo?.bankAccountNumber || paymentMethod.details}`,
            `Name: ${doctorPaymentInfo?.bankAccountName || 'N/A'}`,
            'Enter the transaction reference below'
          ]
        };
      default:
        return {
          icon: '💰',
          title: 'Payment',
          steps: ['Complete payment and enter reference number']
        };
    }
  };

  const instructions = getPaymentInstructions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) {
      setError('Please enter the payment reference number');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await consultationService.submitPayment(consultation.id, {
        paymentMethod: paymentMethod.id,
        paymentReference: paymentReference.trim(),
        patientWallet: user?.walletAddress || ''
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => onSuccess?.(), 2000);
      } else {
        setError(response.error || 'Failed to submit payment');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Submitted!</h2>
        <p className="text-gray-600">
          The doctor will verify your payment and activate the consultation.
          You'll receive a notification once it's ready.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">{instructions.icon}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">{instructions.title}</h2>
      </div>

      {/* Amount */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white text-center mb-6">
        <p className="text-sm opacity-80">Amount to Pay</p>
        <p className="text-3xl font-bold">
          {consultation.consultationFee} {consultation.currency}
        </p>
        <p className="text-sm opacity-80 mt-1">
          {consultation.consultationType === 'chat' ? '24-hour Chat' : 'Video'} Consultation
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Payment Instructions:</h3>
        <ol className="space-y-2">
          {instructions.steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Payment Reference Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Reference Number
          </label>
          <input
            type="text"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Enter reference number from your payment"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the transaction ID or reference number from your payment receipt
          </p>
        </div>

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
            disabled={isSubmitting || !paymentReference.trim()}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Payment'}
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">
        ⚠️ Make sure you've completed the payment before submitting
      </p>
    </div>
  );
};

export default P2PPaymentSubmit;
