/**
 * Two-Tier Payment Workflow Component
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 7.3: TwoTierPaymentWorkflow component**
 * **Requirements: 2.3, 6.3, 8.1**
 * 
 * Creates intelligent payment workflow with auto-approval vs manual approval indicators,
 * payment destination transparency, and refund policy communication.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Eye,
  ArrowRight,
  Shield,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  Video,
  MessageSquare,
  Stethoscope,
  Star,

} from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface PaymentWorkflowProps {
  appointmentData: {
    doctorId: string;
    doctorName: string;
    serviceType: 'in_person' | 'video_call' | 'chat';
    scheduledTime: string;
    duration: number;
    reason?: string;
  };
  pricingData: {
    amount: number;
    doctorPrice?: number;
    marketRate?: number;
    pricingTier: 'standard' | 'premium';
    autoApprovalEligible: boolean;
    priceMatch: boolean;
  };
  onPaymentComplete: (result: any) => void;
  onCancel: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  processingTime: string;
  fees: string;
  available: boolean;
}

const TwoTierPaymentWorkflow: React.FC<PaymentWorkflowProps> = ({
  appointmentData,
  pricingData,
  onPaymentComplete,
  onCancel
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'chapa',
      name: 'Chapa',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Pay with mobile money, bank transfer, or card',
      processingTime: 'Instant',
      fees: 'No additional fees',
      available: true
    },
    {
      id: 'telebirr',
      name: 'TeleBirr',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Pay with TeleBirr mobile wallet',
      processingTime: 'Instant',
      fees: 'No additional fees',
      available: true
    },
    {
      id: 'cbe_birr',
      name: 'CBE Birr',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Pay with CBE Birr mobile banking',
      processingTime: '1-2 minutes',
      fees: 'No additional fees',
      available: true
    }
  ];

  const steps = [
    { id: 1, title: 'Review Details', description: 'Confirm appointment and pricing' },
    { id: 2, title: 'Payment Method', description: 'Choose how to pay' },
    { id: 3, title: 'Payment Processing', description: 'Complete your payment' },
    { id: 4, title: 'Confirmation', description: 'Payment complete' }
  ];

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'video_call':
        return <Video className="w-5 h-5 text-blue-500" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'in_person':
      default:
        return <Stethoscope className="w-5 h-5 text-gray-500" />;
    }
  };

  const getServiceLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'video_call':
        return 'Video Call Consultation';
      case 'chat':
        return 'Chat Consultation';
      case 'in_person':
      default:
        return 'In-Person Consultation';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-ET', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-ET', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getApprovalMethodInfo = () => {
    if (pricingData.autoApprovalEligible) {
      return {
        type: 'auto',
        icon: <Zap className="w-5 h-5 text-green-500" />,
        title: 'Instant Confirmation',
        description: 'Your appointment will be confirmed immediately after payment',
        badge: (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Zap className="w-3 h-3 mr-1" />
            Auto-Approved
          </Badge>
        ),
        paymentDestination: 'Doctor receives payment directly',
        refundPolicy: 'No refunds available - appointment is guaranteed'
      };
    } else {
      return {
        type: 'manual',
        icon: <Eye className="w-5 h-5 text-blue-500" />,
        title: 'Doctor Review Required',
        description: 'Doctor will review and approve your appointment request',
        badge: (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Eye className="w-3 h-3 mr-1" />
            Manual Review
          </Badge>
        ),
        paymentDestination: 'Payment held securely until appointment approval',
        refundPolicy: 'Full refund if doctor rejects your request'
      };
    }
  };

  const getPriceMatchInfo = () => {
    if (pricingData.pricingTier === 'premium' && pricingData.doctorPrice) {
      return {
        isMatch: pricingData.priceMatch,
        paidAmount: pricingData.amount,
        doctorPrice: pricingData.doctorPrice,
        marketRate: pricingData.marketRate
      };
    }
    return null;
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setCurrentStep(3);
  };

  const processPayment = async () => {
    if (!selectedPaymentMethod || !agreementAccepted || !refundPolicyAccepted) {
      showNotification('Please complete all required fields', 'error');
      return;
    }

    setProcessing(true);

    try {
      const paymentPayload = {
        appointmentId: `temp_${Date.now()}`, // This would be generated earlier
        patientId: user?.id,
        doctorId: appointmentData.doctorId,
        serviceType: appointmentData.serviceType,
        amount: pricingData.amount,
        paymentMethod: selectedPaymentMethod,
        paymentDetails: {
          scheduledTime: appointmentData.scheduledTime,
          duration: appointmentData.duration,
          reason: appointmentData.reason
        }
      };

      const response = await axios.post('/enhanced-payment/process', paymentPayload);

      if (response.data.success) {
        setPaymentDetails(response.data.data);
        setCurrentStep(4);
        
        // Call completion callback
        onPaymentComplete(response.data.data);
        
        showNotification(
          response.data.message || 'Payment processed successfully',
          'success'
        );
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      showNotification(
        error.response?.data?.error || 'Payment processing failed',
        'error'
      );
    } finally {
      setProcessing(false);
    }
  };

  const approvalInfo = getApprovalMethodInfo();
  const priceMatchInfo = getPriceMatchInfo();
  const dateTime = formatDateTime(appointmentData.scheduledTime);

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep >= step.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {currentStep > step.id ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.id
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`
                w-16 h-1 mx-2
                ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-gray-900">{steps[currentStep - 1].title}</h3>
        <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Doctor</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{appointmentData.doctorName}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Service Type</label>
              <div className="flex items-center gap-2 mt-1">
                {getServiceIcon(appointmentData.serviceType)}
                <span className="font-medium">{getServiceLabel(appointmentData.serviceType)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Date</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{dateTime.date}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Time</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{dateTime.time} ({appointmentData.duration} min)</span>
              </div>
            </div>
          </div>
          {appointmentData.reason && (
            <div>
              <label className="text-sm font-medium text-gray-600">Reason for Visit</label>
              <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{appointmentData.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">{formatCurrency(pricingData.amount)}</div>
              <div className="text-sm text-gray-600">
                {pricingData.pricingTier === 'premium' ? 'Premium Tier' : 'Standard Tier'}
              </div>
            </div>
            <Badge className={
              pricingData.pricingTier === 'premium' 
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : 'bg-gray-100 text-gray-800 border-gray-200'
            }>
              {pricingData.pricingTier === 'premium' ? (
                <>
                  <Star className="w-3 h-3 mr-1" />
                  Premium
                </>
              ) : (
                'Standard'
              )}
            </Badge>
          </div>

          {priceMatchInfo && (
            <div className={`p-3 rounded-lg ${
              priceMatchInfo.isMatch 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {priceMatchInfo.isMatch ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                )}
                <span className={`font-medium ${
                  priceMatchInfo.isMatch ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {priceMatchInfo.isMatch ? 'Exact Price Match' : 'Price Difference Detected'}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Your Payment:</span>
                  <span className="font-medium">{formatCurrency(priceMatchInfo.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Doctor's Rate:</span>
                  <span className="font-medium">{formatCurrency(priceMatchInfo.doctorPrice)}</span>
                </div>
                {priceMatchInfo.marketRate && (
                  <div className="flex justify-between">
                    <span>Market Average:</span>
                    <span className="font-medium">{formatCurrency(priceMatchInfo.marketRate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Method Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {approvalInfo.icon}
            Approval Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{approvalInfo.title}</h4>
              <p className="text-sm text-gray-600">{approvalInfo.description}</p>
            </div>
            {approvalInfo.badge}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Destination:</strong> {approvalInfo.paymentDestination}
            </AlertDescription>
          </Alert>

          <Alert className={
            approvalInfo.type === 'auto' 
              ? 'border-red-200 bg-red-50' 
              : 'border-green-200 bg-green-50'
          }>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Refund Policy:</strong> {approvalInfo.refundPolicy}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={() => setCurrentStep(2)} className="flex-1">
          Continue to Payment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPaymentMethodStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-colors
                  ${selectedPaymentMethod === method.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => method.available && handlePaymentMethodSelect(method.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {method.icon}
                    <div>
                      <h4 className="font-medium">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-green-600">{method.processingTime}</div>
                    <div className="text-gray-500">{method.fees}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Total Amount</span>
              <span className="text-2xl font-bold">{formatCurrency(pricingData.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Payment Method</span>
              <span className="capitalize">{selectedPaymentMethod}</span>
            </div>
          </div>

          {/* Agreements */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(e) => setAgreementAccepted(e.target.checked)}
                className="mt-1"
              />
              <div className="text-sm">
                <span>I agree to the </span>
                <button className="text-blue-600 hover:underline">Terms of Service</button>
                <span> and </span>
                <button className="text-blue-600 hover:underline">Privacy Policy</button>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={refundPolicyAccepted}
                onChange={(e) => setRefundPolicyAccepted(e.target.checked)}
                className="mt-1"
              />
              <div className="text-sm">
                I understand and accept the refund policy: {approvalInfo.refundPolicy}
              </div>
            </label>
          </div>

          {/* Payment Button */}
          <Button
            onClick={processPayment}
            disabled={processing || !agreementAccepted || !refundPolicyAccepted}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing Payment...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pay {formatCurrency(pricingData.amount)}
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => setCurrentStep(2)} variant="outline" className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600">
          {approvalInfo.type === 'auto' 
            ? 'Your appointment has been confirmed automatically'
            : 'Your payment is being held securely while the doctor reviews your request'
          }
        </p>
      </div>

      {paymentDetails && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-sm">{paymentDetails.payment_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-sm">{paymentDetails.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className="bg-green-100 text-green-800">
                  {paymentDetails.payment_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Appointment Status:</span>
                <Badge className={
                  paymentDetails.appointment_status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }>
                  {paymentDetails.appointment_status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {approvalInfo.type === 'auto' 
            ? 'You will receive a confirmation email and SMS with appointment details.'
            : 'You will be notified once the doctor reviews and responds to your appointment request.'
          }
        </AlertDescription>
      </Alert>

      <Button onClick={() => window.location.href = '/appointments'} className="w-full">
        View My Appointments
      </Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
        <p className="text-gray-600">Secure payment with transparent pricing and clear policies</p>
      </div>

      {renderStepIndicator()}

      <div className="min-h-[400px]">
        {currentStep === 1 && renderReviewStep()}
        {currentStep === 2 && renderPaymentMethodStep()}
        {currentStep === 3 && renderProcessingStep()}
        {currentStep === 4 && renderConfirmationStep()}
      </div>
    </div>
  );
};

export default TwoTierPaymentWorkflow;