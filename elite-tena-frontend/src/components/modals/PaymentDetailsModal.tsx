import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle, DollarSign, CreditCard, Phone } from 'lucide-react';
import axios from '../../lib/axios';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  onUploadReceipt: () => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  onUploadReceipt
}) => {
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchPaymentDetails();
    }
  }, [isOpen, appointmentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/appointments/${appointmentId}/payment-details`);
      if (response.data.success) {
        setPaymentDetails(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
      alert('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-medical-500 border-t-transparent rounded-full"
                />
              </div>
            ) : paymentDetails ? (
              <>
                {/* Amount */}
                <div className="bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-6 h-6" />
                    <p className="text-sm opacity-90">Total Amount</p>
                  </div>
                  <p className="text-4xl font-bold">{paymentDetails.amount} ETB</p>
                  <p className="text-sm opacity-90 mt-1 capitalize">
                    {paymentDetails.serviceType?.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Choose Payment Method</h3>

                  {paymentDetails.paymentMethods?.map((method: any, index: number) => (
                    <motion.div
                      key={method.method}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-medical-500 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {method.method === 'telebirr' ? (
                            <Phone className="w-6 h-6 text-medical-600" />
                          ) : (
                            <CreditCard className="w-6 h-6 text-medical-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 capitalize mb-1">
                            {method.method.replace('_', ' ')}
                          </h4>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Account Number:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{method.accountNumber}</span>
                                <button
                                  onClick={() => copyToClipboard(method.accountNumber, method.method)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  {copied === method.method ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Account Name:</span>
                              <span className="font-semibold">{method.accountName}</span>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                            {method.instructions}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Important Instructions</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                    <li>Send the exact amount to one of the accounts above</li>
                    <li>Take a screenshot of the payment confirmation</li>
                    <li>Upload the receipt using the button below</li>
                    <li>Wait for doctor to confirm your payment</li>
                    <li>You'll receive a confirmation notification</li>
                  </ol>
                </div>

                {/* Upload Receipt Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onUploadReceipt();
                  }}
                  className="w-full bg-medical-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-medical-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  I've Made Payment - Upload Receipt
                </motion.button>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Failed to load payment details</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
