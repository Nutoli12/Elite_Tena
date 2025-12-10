import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import axios from '../../lib/axios';

interface PaymentStatusProps {
  appointmentId: string;
  onPaymentRequired?: (amount: number) => void;
  className?: string;
}

interface PaymentInfo {
  appointmentId: string;
  paymentStatus: 'pending' | 'paid' | 'confirmed' | 'refunded';
  fee: number;
  payment?: {
    id: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    paymentMethod: 'chapa' | 'telebirr';
    transactionId: string;
    createdAt: string;
    verifiedAt?: string;
  };
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  appointmentId,
  onPaymentRequired,
  className = ''
}) => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentStatus();
  }, [appointmentId]);

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/payments/appointment/${appointmentId}/status`);
      
      if (response.data.success) {
        setPaymentInfo(response.data.data);
      } else {
        setError('Failed to fetch payment status');
      }
    } catch (error: any) {
      console.error('Failed to fetch payment status:', error);
      setError(error.response?.data?.message || 'Failed to fetch payment status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string, paymentStatus?: string) => {
    // If there's a payment record, use payment status
    if (paymentStatus) {
      switch (paymentStatus) {
        case 'completed':
          return {
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            borderColor: 'border-green-200',
            label: 'Payment Completed',
            description: 'Payment has been successfully processed'
          };
        case 'pending':
          return {
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            borderColor: 'border-yellow-200',
            label: 'Payment Processing',
            description: 'Payment is being processed'
          };
        case 'failed':
          return {
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-200',
            label: 'Payment Failed',
            description: 'Payment was not successful'
          };
        case 'cancelled':
          return {
            icon: XCircle,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-200',
            label: 'Payment Cancelled',
            description: 'Payment was cancelled'
          };
        default:
          return {
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            borderColor: 'border-orange-200',
            label: 'Unknown Status',
            description: 'Payment status unknown'
          };
      }
    }

    // Use appointment payment status
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Paid',
          description: 'Payment confirmed'
        };
      case 'pending':
        return {
          icon: DollarSign,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          label: 'Payment Required',
          description: 'Click to make payment'
        };
      case 'confirmed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Confirmed',
          description: 'Payment confirmed by doctor'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'No Payment Required',
          description: 'Free consultation'
        };
    }
  };

  const handlePaymentClick = () => {
    if (paymentInfo && paymentInfo.fee > 0 && onPaymentRequired) {
      onPaymentRequired(paymentInfo.fee);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 p-3 bg-gray-50 rounded-lg ${className}`}>
        <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-600">Loading payment status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-700">{error}</span>
        <button
          onClick={fetchPaymentStatus}
          className="ml-auto p-1 hover:bg-red-100 rounded"
        >
          <RefreshCw className="w-4 h-4 text-red-500" />
        </button>
      </div>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  const config = getStatusConfig(
    paymentInfo.paymentStatus, 
    paymentInfo.payment?.status
  );
  const StatusIcon = config.icon;

  const isPaymentRequired = paymentInfo.paymentStatus === 'pending' && 
                           paymentInfo.fee > 0 && 
                           !paymentInfo.payment;

  const isPaymentFailed = paymentInfo.payment?.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border rounded-xl ${config.borderColor} ${config.bgColor} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
              {paymentInfo.fee > 0 && (
                <span className="text-sm font-medium text-gray-700">
                  {paymentInfo.fee} ETB
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            
            {paymentInfo.payment && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  Payment Method: {paymentInfo.payment.paymentMethod.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">
                  Transaction: {paymentInfo.payment.transactionId}
                </p>
                {paymentInfo.payment.verifiedAt && (
                  <p className="text-xs text-gray-500">
                    Verified: {new Date(paymentInfo.payment.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {(isPaymentRequired || isPaymentFailed) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePaymentClick}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPaymentFailed ? 'Retry Payment' : 'Pay Now'}
            </motion.button>
          )}
          
          <button
            onClick={fetchPaymentStatus}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            title="Refresh payment status"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};