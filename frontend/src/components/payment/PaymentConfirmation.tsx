/**
 * Payment Confirmation Component
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 7.5: PaymentConfirmation component**
 * **Requirements: 6.4, 7.2, 8.5**
 * 
 * Creates payment confirmation interface with transaction receipt generation,
 * status tracking displays, and refund request handling.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Eye,
  CreditCard,
  Calendar,
  User,
  DollarSign,
  FileText,
  Mail,
  Phone,
  Copy,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  Star,
  Video,
  MessageSquare,
  Stethoscope
} from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface PaymentConfirmationProps {
  paymentId: string;
  onBack?: () => void;
  onViewAppointments?: () => void;
}

interface PaymentDetails {
  payment_id: string;
  transaction_id: string;
  status: string;
  amount: number;
  routing_destination: string;
  approval_method: string;
  appointment_status: string;
  created_at: string;
  updated_at: string;
  appointment: {
    id: string;
    doctor_name: string;
    service_type: string;
    scheduled_time: string;
    duration: number;
    reason?: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization: string;
    rating: number;
    experience: string;
  };
  refund_eligibility?: {
    eligible: boolean;
    reason: string;
    deadline?: string;
  };
  receipt_url?: string;
}

const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  paymentId,
  onBack,
  onViewAppointments
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
    
    // Set up polling for status updates
    const interval = setInterval(() => {
      if (paymentDetails?.status === 'processing' || paymentDetails?.appointment_status === 'pending_approval') {
        fetchPaymentDetails(true);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [paymentId]);

  const fetchPaymentDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await axios.get(`/enhanced-payment/status/${paymentId}`, {
        params: { userId: user?.id }
      });

      if (response.data.success) {
        setPaymentDetails(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
      showNotification('Failed to load payment details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      showNotification('Please provide a reason for the refund request', 'error');
      return;
    }

    setProcessingRefund(true);

    try {
      const response = await axios.post('/api/enhanced-payment/refund', {
        appointmentId: paymentDetails?.appointment.id,
        refundType: 'cancellation',
        refundReason: refundReason.trim(),
        requestedBy: user?.id
      });

      if (response.data.success) {
        showNotification('Refund request submitted successfully', 'success');
        setShowRefundForm(false);
        setRefundReason('');
        fetchPaymentDetails();
      }
    } catch (error: any) {
      console.error('Refund request failed:', error);
      showNotification(
        error.response?.data?.error || 'Failed to submit refund request',
        'error'
      );
    } finally {
      setProcessingRefund(false);
    }
  };

  const downloadReceipt = async () => {
    try {
      if (paymentDetails?.receipt_url) {
        window.open(paymentDetails.receipt_url, '_blank');
      } else {
        // Generate receipt
        const response = await axios.get(`/enhanced-payment/receipt/${paymentId}`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt-${paymentId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      showNotification('Failed to download receipt', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(`${label} copied to clipboard`, 'success');
    });
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      processing: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      held: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Shield },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: RefreshCw }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getAppointmentStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

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

  const getApprovalMethodInfo = () => {
    if (!paymentDetails) return null;

    if (paymentDetails.approval_method === 'auto') {
      return {
        icon: <Zap className="w-5 h-5 text-green-500" />,
        title: 'Auto-Approved',
        description: 'Your appointment was confirmed automatically',
        badge: (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Zap className="w-3 h-3 mr-1" />
            Instant
          </Badge>
        )
      };
    } else {
      return {
        icon: <Eye className="w-5 h-5 text-blue-500" />,
        title: 'Manual Review',
        description: 'Doctor is reviewing your appointment request',
        badge: (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        )
      };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Not Found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find the payment details you're looking for.
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvalInfo = getApprovalMethodInfo();
  const appointmentDateTime = formatDateTime(paymentDetails.appointment.scheduled_time);
  const paymentDateTime = formatDateTime(paymentDetails.created_at);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Confirmation</h1>
          <p className="text-gray-600">Transaction details and appointment status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchPaymentDetails(true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  {getStatusBadge(paymentDetails.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">{formatCurrency(paymentDetails.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Destination:</span>
                  <span className="text-sm">
                    {paymentDetails.routing_destination === 'doctor_wallet' 
                      ? 'Doctor Wallet' 
                      : 'System Wallet (Held)'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Appointment Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  {getAppointmentStatusBadge(paymentDetails.appointment_status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Approval:</span>
                  {approvalInfo?.badge}
                </div>
                {paymentDetails.appointment_status === 'pending_approval' && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Awaiting doctor's response
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Payment ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {paymentDetails.payment_id}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(paymentDetails.payment_id, 'Payment ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {paymentDetails.transaction_id}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(paymentDetails.transaction_id, 'Transaction ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Payment Date</label>
                <div className="mt-1">
                  <div className="text-sm">{paymentDateTime.date}</div>
                  <div className="text-sm text-gray-500">{paymentDateTime.time}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <div className="mt-1">
                  <div className="text-sm">{formatDateTime(paymentDetails.updated_at).date}</div>
                  <div className="text-sm text-gray-500">{formatDateTime(paymentDetails.updated_at).time}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Doctor</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{paymentDetails.appointment.doctor_name}</span>
                </div>
                {paymentDetails.doctor && (
                  <div className="text-sm text-gray-600 ml-6">
                    {paymentDetails.doctor.specialization} • {paymentDetails.doctor.experience}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span>{paymentDetails.doctor.rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Service Type</label>
                <div className="flex items-center gap-2 mt-1">
                  {getServiceIcon(paymentDetails.appointment.service_type)}
                  <span className="font-medium">{getServiceLabel(paymentDetails.appointment.service_type)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Appointment Date & Time</label>
                <div className="mt-1">
                  <div className="font-medium">{appointmentDateTime.date}</div>
                  <div className="text-sm text-gray-600">
                    {appointmentDateTime.time} ({paymentDetails.appointment.duration} minutes)
                  </div>
                </div>
              </div>
              
              {paymentDetails.appointment.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Reason for Visit</label>
                  <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    {paymentDetails.appointment.reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status-specific Information */}
      {paymentDetails.appointment_status === 'pending_approval' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Awaiting Doctor Approval:</strong> Your payment is being held securely while the doctor reviews your appointment request. 
            You will be notified once they respond. If rejected, you will receive a full refund.
          </AlertDescription>
        </Alert>
      )}

      {paymentDetails.appointment_status === 'confirmed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Appointment Confirmed:</strong> Your appointment has been confirmed! 
            You will receive reminder notifications before your scheduled time.
          </AlertDescription>
        </Alert>
      )}

      {paymentDetails.appointment_status === 'rejected' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Appointment Rejected:</strong> Unfortunately, the doctor was unable to accept your appointment request. 
            A full refund has been processed and will be returned to your original payment method.
          </AlertDescription>
        </Alert>
      )}

      {/* Refund Section */}
      {paymentDetails.refund_eligibility?.eligible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Refund Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showRefundForm ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {paymentDetails.refund_eligibility.reason}
                    </p>
                    {paymentDetails.refund_eligibility.deadline && (
                      <p className="text-sm text-red-600 mt-1">
                        Refund deadline: {formatDateTime(paymentDetails.refund_eligibility.deadline).date}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setShowRefundForm(true)}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Request Refund
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Reason for refund request
                  </label>
                  <Textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Please explain why you're requesting a refund..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleRefundRequest}
                    disabled={processingRefund || !refundReason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {processingRefund ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Submit Refund Request
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRefundForm(false);
                      setRefundReason('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadReceipt} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email Receipt
            </Button>
            
            {paymentDetails.appointment_status === 'confirmed' && (
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            )}
            
            {onViewAppointments && (
              <Button onClick={onViewAppointments}>
                <Eye className="w-4 h-4 mr-2" />
                View All Appointments
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Support Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Contact Support</p>
              <p className="text-gray-600">
                If you have questions about your payment or appointment, our support team is here to help.
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>+251-11-XXX-XXXX</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>support@elitetena.com</span>
                </div>
              </div>
            </div>
            
            <div>
              <p className="font-medium mb-2">Payment Issues</p>
              <p className="text-gray-600">
                For payment-related inquiries, please have your transaction ID ready when contacting support.
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Help Center
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentConfirmation;