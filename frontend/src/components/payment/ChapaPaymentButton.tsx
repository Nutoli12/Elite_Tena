import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';

interface ChapaPaymentButtonProps {
  appointmentId: string;
  patientWallet: string;
  amount: number;
  onPaymentSuccess?: () => void;
  onPaymentFailure?: (error: string) => void;
  disabled?: boolean;
}



interface PaymentStatus {
  status: string;
  txRef?: string;
  checkoutUrl?: string;
  demo?: boolean;
}

const ChapaPaymentButton: React.FC<ChapaPaymentButtonProps> = ({
  appointmentId,
  patientWallet,
  amount,
  onPaymentSuccess,
  onPaymentFailure,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { showNotification } = useNotification();

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const initializePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/chapa-payment/initialize', {
        appointmentId,
        patientWallet,
        returnUrl: `${window.location.origin}/appointments/${appointmentId}/payment-success`
      });

      if (response.data.success) {
        const { checkoutUrl, txRef, demo } = response.data.data;
        
        setPaymentStatus({
          status: 'initialized',
          txRef,
          checkoutUrl,
          demo
        });

        if (demo) {
          // Handle demo payment
          showNotification('Demo payment mode activated', 'info');
          handleDemoPayment(txRef);
        } else if (checkoutUrl) {
          // Open Chapa checkout in new window
          const paymentWindow = window.open(
            checkoutUrl, 
            'chapa-payment',
            'width=600,height=700,scrollbars=yes,resizable=yes'
          );

          if (paymentWindow) {
            // Start polling for payment verification
            startPaymentPolling(txRef);
            
            // Monitor if payment window is closed
            const windowCheckInterval = setInterval(() => {
              if (paymentWindow.closed) {
                clearInterval(windowCheckInterval);
                // Check payment status one more time
                verifyPayment(txRef);
              }
            }, 1000);
          } else {
            throw new Error('Payment window blocked. Please allow popups and try again.');
          }
        }
      }
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Payment initialization failed';
      setError(errorMessage);
      onPaymentFailure?.(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPayment = async (txRef: string) => {
    setPaymentStatus(prev => prev ? { ...prev, status: 'processing' } : null);
    
    // Simulate demo payment completion after 3 seconds
    setTimeout(async () => {
      try {
        await verifyPayment(txRef);
      } catch (error) {
        console.error('Demo payment verification failed:', error);
      }
    }, 3000);
  };

  const startPaymentPolling = (txRef: string) => {
    const interval = setInterval(async () => {
      try {
        const isComplete = await verifyPayment(txRef);
        if (isComplete) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 600000);
  };

  const verifyPayment = async (txRef: string): Promise<boolean> => {
    try {
      const response = await axios.get(`/chapa-payment/verify/${txRef}`);

      if (response.data.success) {
        const { status, demo } = response.data.data;
        
        setPaymentStatus(prev => prev ? { ...prev, status } : null);

        if (status === 'completed') {
          showNotification('Payment completed successfully!', 'success');
          onPaymentSuccess?.();
          return true;
        } else if (status === 'failed') {
          const errorMsg = 'Payment failed';
          setError(errorMsg);
          onPaymentFailure?.(errorMsg);
          showNotification(errorMsg, 'error');
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return false;
    }
  };

  const retryPayment = () => {
    setPaymentStatus(null);
    setError(null);
    initializePayment();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initialized':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initialized':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (paymentStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(paymentStatus.status)}
            Chapa Payment Status

          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(paymentStatus.status)} border`}>
                {paymentStatus.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">
                Amount: {amount} ETB
              </span>
            </div>

            {/* Status Messages */}
            {paymentStatus.status === 'initialized' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm">
                    Payment window opened. Complete your payment in the Chapa window.
                  </span>
                </div>
              </div>
            )}

            {paymentStatus.status === 'processing' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    Processing your payment with Chapa. Please wait...
                  </span>
                </div>
              </div>
            )}

            {paymentStatus.status === 'completed' && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Payment completed successfully! Consent request has been sent.
                  </span>
                </div>
              </div>
            )}

            {paymentStatus.status === 'failed' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Payment failed. Please try again or contact support.
                  </span>
                </div>
                <Button
                  onClick={retryPayment}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Payment
                </Button>
              </div>
            )}

            {/* Transaction Reference */}
            {paymentStatus.txRef && (
              <div className="text-xs text-gray-500">
                Transaction ID: {paymentStatus.txRef}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Direct Payment - No Method Selection */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center space-y-4">
          {/* Amount Display */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-blue-600">{amount} ETB</p>
          </div>

          {/* Direct Payment Button */}
          <Button
            onClick={initializePayment}
            disabled={disabled || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 text-lg"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connecting to Chapa...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                Pay Now with Chapa
              </div>
            )}
          </Button>

          {/* Simple Security Note */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>🔒</span>
            <span>Secure Ethiopian Payment Gateway</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="text-xs text-center text-gray-500">
        You'll be redirected to Chapa to complete your payment securely
      </div>
    </div>
  );
};

export default ChapaPaymentButton;