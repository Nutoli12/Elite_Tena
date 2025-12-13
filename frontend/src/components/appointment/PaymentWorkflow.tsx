import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Clock, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  Phone,
  MessageSquare,
  Video,
  Shield
} from 'lucide-react';
import axios from '../../lib/axios';
import ChapaPaymentButton from '../payment/ChapaPaymentButton';
import ConsentRequestAfterPayment from '../consent/ConsentRequestAfterPayment';

interface PaymentWorkflowProps {
  appointmentId: string;
  patientWallet: string;
  onStatusChange?: (status: string) => void;
}

interface PaymentStatus {
  success: boolean;
  appointmentId: string;
  currentPhase: string;
  nextSteps: string[];
  canProceed: boolean;
  details: {
    requiresApproval: boolean;
    approvalStatus: string;
    fee: number;
    paymentStatus: string;
    latestPayment?: {
      id: string;
      amount: number;
      status: string;
      transactionId: string;
      createdAt: string;
    };
  };
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'peer_to_peer';
  enabled: boolean;
  logo?: string;
}

const PaymentWorkflow: React.FC<PaymentWorkflowProps> = ({
  appointmentId,
  patientWallet,
  onStatusChange
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('chapa');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentStatus();
    const interval = setInterval(fetchPaymentStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [appointmentId]);

  const fetchPaymentStatus = async () => {
    try {
      const response = await axios.get(`/appointment-payment/${appointmentId}/payment/status`);
      
      if (response.data.success) {
        setPaymentStatus(response.data.data);
        onStatusChange?.(response.data.data.currentPhase);
      }
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
      setError('Failed to load payment status');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('/api/payments/methods');
      if (response.data.success) {
        setPaymentMethods(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  };

  const initializePayment = async () => {
    if (!paymentStatus) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`/appointment-payment/${appointmentId}/payment/initialize`, {
        patientWallet,
        paymentMethod: selectedMethod
      });

      if (response.data.success) {
        const { checkoutUrl, demo } = response.data.data;
        
        if (demo) {
          // Handle demo payment
          handleDemoPayment(response.data.data.txRef);
        } else if (checkoutUrl) {
          // Redirect to payment gateway
          window.open(checkoutUrl, '_blank');
          
          // Start polling for payment verification
          startPaymentPolling(response.data.data.txRef);
        }
      }
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      setError(error.response?.data?.error || 'Payment initialization failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleDemoPayment = async (txRef: string) => {
    // Simulate demo payment completion after 3 seconds
    setTimeout(async () => {
      try {
        await axios.post('/api/payments/demo/complete', { txRef });
        fetchPaymentStatus(); // Refresh status
      } catch (error) {
        console.error('Demo payment completion failed:', error);
      }
    }, 3000);
  };

  const startPaymentPolling = (txRef: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/appointment-payment/${appointmentId}/payment/verify`, {
          params: { txRef, provider: selectedMethod }
        });

        if (response.data.success) {
          const status = response.data.data.status;
          
          if (status === 'completed' || status === 'failed') {
            clearInterval(pollInterval);
            fetchPaymentStatus(); // Refresh the full status
          }
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'awaiting_approval':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'awaiting_payment':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'awaiting_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'awaiting_payment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return <Video className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'inPerson':
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load payment information
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPhaseIcon(paymentStatus.currentPhase)}
            Payment Workflow Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phase Badge */}
            <div className="flex items-center gap-2">
              <Badge className={`${getPhaseColor(paymentStatus.currentPhase)} border`}>
                {paymentStatus.currentPhase.replace('_', ' ').toUpperCase()}
              </Badge>
              {paymentStatus.canProceed && (
                <Badge className="bg-green-100 text-green-800 border-green-200 border">
                  READY TO PROCEED
                </Badge>
              )}
            </div>

            {/* Next Steps */}
            <div>
              <h4 className="font-medium mb-2">Next Steps:</h4>
              <ul className="space-y-1">
                {paymentStatus.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Appointment Details */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Requires Approval:</span>
                <span className={`ml-2 ${paymentStatus.details.requiresApproval ? 'text-yellow-600' : 'text-green-600'}`}>
                  {paymentStatus.details.requiresApproval ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Fee:</span>
                <span className="ml-2 font-mono">
                  {paymentStatus.details.fee > 0 ? `${paymentStatus.details.fee} ETB` : 'Free'}
                </span>
              </div>
              {paymentStatus.details.requiresApproval && (
                <div>
                  <span className="font-medium">Approval Status:</span>
                  <Badge className={`ml-2 ${
                    paymentStatus.details.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    paymentStatus.details.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {paymentStatus.details.approvalStatus}
                  </Badge>
                </div>
              )}
              {paymentStatus.details.fee > 0 && (
                <div>
                  <span className="font-medium">Payment Status:</span>
                  <Badge className={`ml-2 ${
                    paymentStatus.details.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    paymentStatus.details.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {paymentStatus.details.paymentStatus}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Section - Enhanced Chapa Integration */}
      {paymentStatus.currentPhase === 'awaiting_payment' && paymentStatus.details.fee > 0 && (
        <ChapaPaymentButton
          appointmentId={appointmentId}
          patientWallet={patientWallet}
          amount={paymentStatus.details.fee}
          onPaymentSuccess={() => {
            fetchPaymentStatus();
            onStatusChange?.('payment_completed');
          }}
          onPaymentFailure={(error) => {
            setError(error);
          }}
          disabled={processing}
        />
      )}

      {/* Consent Request Section - Shows after payment */}
      {(paymentStatus.currentPhase === 'confirmed' || paymentStatus.currentPhase === 'awaiting_consent') && (
        <ConsentRequestAfterPayment
          appointmentId={appointmentId}
          patientWallet={patientWallet}
          serviceType={paymentStatus.details.serviceType}
          onConsentGranted={() => {
            fetchPaymentStatus();
            onStatusChange?.('consultation_ready');
          }}
          onConsentDenied={() => {
            onStatusChange?.('consent_denied');
          }}
        />
      )}

      {/* Latest Payment Info */}
      {paymentStatus.details.latestPayment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-xs">{paymentStatus.details.latestPayment.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>{paymentStatus.details.latestPayment.amount} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge className={`${
                  paymentStatus.details.latestPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  paymentStatus.details.latestPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {paymentStatus.details.latestPayment.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(paymentStatus.details.latestPayment.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentWorkflow;