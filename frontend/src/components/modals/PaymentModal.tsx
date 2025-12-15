import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../services/modalService';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  supportedMethods?: string[];
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  amount: number;
  description?: string;
  onPaymentSuccess?: (paymentData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  amount: initialAmount,
  description = 'Healthcare Consultation Payment',
  onPaymentSuccess
}) => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [amount, setAmount] = useState<number>(initialAmount);

  // Customer details
  const [customerDetails, setCustomerDetails] = useState({
    email: user?.email || '',
    firstName: user?.fullName?.split(' ')[0] || '',
    lastName: user?.fullName?.split(' ').slice(1).join(' ') || '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
      setStep('select');
      setError(null);
      setAmount(initialAmount); // Reset amount when modal opens
    }
  }, [isOpen]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('/payments/methods');
      if (response.data.success) {
        setPaymentMethods(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedMethod(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setError('Failed to load payment methods');
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod || !customerDetails.email || !customerDetails.firstName || !customerDetails.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    // Prevent double-clicking
    if (loading || step === 'processing') {
      return;
    }

    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const response = await axios.post('/payments/initialize', {
        appointmentId,
        patientWallet: user?.walletAddress,
        amount,
        provider: selectedMethod,
        email: customerDetails.email,
        firstName: customerDetails.firstName,
        lastName: customerDetails.lastName,
        phoneNumber: customerDetails.phoneNumber,
        description
      });

      if (response.data.success) {
        const { checkoutUrl, txRef } = response.data.data;
        setPaymentData(response.data.data);

        // Open payment gateway in new window
        const paymentWindow = window.open(
          checkoutUrl,
          'payment',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for payment completion
        let pollCount = 0;
        const maxPolls = 120; // 6 minutes (120 * 3 seconds)
        
        const pollInterval = setInterval(async () => {
          pollCount++;
          
          try {
            console.log(`🔍 Polling payment status (${pollCount}/${maxPolls}):`, txRef);
            
            const verifyResponse = await axios.get(`/payments/verify?txRef=${txRef}&provider=${selectedMethod}`);
            
            console.log('📊 Payment verification response:', verifyResponse.data);
            
            if (verifyResponse.data.success) {
              if (verifyResponse.data.status === 'completed') {
                console.log('✅ Payment completed successfully!');
                clearInterval(pollInterval);
                paymentWindow?.close();
                setStep('success');
                onPaymentSuccess?.(verifyResponse.data.data);
                return;
              } else if (verifyResponse.data.status === 'failed') {
                console.log('❌ Payment failed');
                clearInterval(pollInterval);
                paymentWindow?.close();
                setStep('error');
                setError('Payment failed. Please try again.');
                return;
              }
            }
            
            // Check if payment window was closed manually
            if (paymentWindow?.closed) {
              console.log('🪟 Payment window closed by user');
              clearInterval(pollInterval);
              setStep('error');
              setError('Payment window was closed. Please try again if payment was not completed.');
              return;
            }
            
            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
              console.log('⏰ Payment polling timeout');
              clearInterval(pollInterval);
              paymentWindow?.close();
              setStep('error');
              setError('Payment verification timeout. Please check your payment status or try again.');
            }
          } catch (error) {
            console.error('❌ Payment polling error:', error);
            // Continue polling unless we've reached max attempts
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              paymentWindow?.close();
              setStep('error');
              setError('Unable to verify payment status. Please check manually.');
            }
          }
        }, 3000);

      } else {
        setStep('error');
        setError(response.data.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      setStep('error');
      setError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'chapa':
        return <CreditCard className="w-6 h-6" />;
      case 'telebirr':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getMethodColor = (methodId: string) => {
    switch (methodId) {
      case 'chapa':
        return 'from-blue-500 to-blue-600';
      case 'telebirr':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'select' && 'Payment Method'}
              {step === 'processing' && 'Processing Payment'}
              {step === 'success' && 'Payment Successful'}
              {step === 'error' && 'Payment Failed'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Payment Amount */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
                {appointmentId ? (
                  <p className="text-3xl font-bold text-gray-900">{amount} ETB</p>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={amount || ''}
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value) || 0;
                        setAmount(newAmount);
                      }}
                      min="1"
                      max="10000"
                      className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-300 text-center w-32 focus:outline-none focus:border-blue-500"
                      placeholder="500"
                    />
                    <span className="text-3xl font-bold text-gray-900">ETB</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
            </div>

            {step === 'select' && (
              <>
                {/* Customer Details */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-900">Customer Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={customerDetails.firstName}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={customerDetails.lastName}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={customerDetails.email}
                      onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerDetails.phoneNumber}
                      onChange={(e) => setCustomerDetails(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+251..."
                    />
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
                  
                  {paymentMethods.map((method) => (
                    <motion.div
                      key={method.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${getMethodColor(method.id)} text-white`}>
                          {getMethodIcon(method.id)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedMethod === method.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedMethod === method.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={loading || !selectedMethod}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Pay ${amount} ETB`
                  )}
                </button>
              </>
            )}

            {step === 'processing' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
                <p className="text-gray-600 mb-4">
                  Please complete your payment in the opened window.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  This window will automatically update when payment is complete.
                </p>
                
                {paymentData && (
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        try {
                          const verifyResponse = await axios.get(`/payments/verify?txRef=${paymentData.txRef}&provider=${selectedMethod}`);
                          if (verifyResponse.data.success && verifyResponse.data.status === 'completed') {
                            setStep('success');
                            onPaymentSuccess?.(verifyResponse.data.data);
                          } else {
                            Modal.error('Payment not yet completed. Please complete the payment first.', 'Alert');
                          }
                        } catch (error) {
                          Modal.error('Unable to verify payment. Please try again.', 'Alert');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      I've Completed Payment - Check Status
                    </button>
                    
                    <button
                      onClick={() => {
                        setStep('select');
                        setError(null);
                      }}
                      className="block mx-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                    >
                      Cancel & Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
                <p className="text-gray-600 mb-4">
                  Your payment of {amount} ETB has been processed successfully.
                </p>
                <button
                  onClick={onClose}
                  className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setStep('select')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};