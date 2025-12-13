import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Video,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';

interface PaidAppointmentQueueProps {
  doctorWallet: string;
  onApprovalComplete?: () => void;
}

interface PaidAppointment {
  id: string;
  patientName: string;
  patientWallet: string;
  appointmentDate: string;
  serviceType: string;
  reason: string;
  fee: number;
  duration: number;
  paymentConfirmedAt: string;
  isPaid: boolean;
  priority: string;
}

const PaidAppointmentQueue: React.FC<PaidAppointmentQueueProps> = ({
  doctorWallet,
  onApprovalComplete
}) => {
  const [paidAppointments, setPaidAppointments] = useState<PaidAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPaidQueue();
    const interval = setInterval(fetchPaidQueue, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [doctorWallet]);

  const fetchPaidQueue = async () => {
    try {
      const response = await axios.get(`/payment-first/doctor-queue/${doctorWallet}`);
      
      if (response.data.success) {
        setPaidAppointments(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch paid queue:', error);
      setError(error.response?.data?.error || 'Failed to load paid appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (appointmentId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingId(appointmentId);
    setError(null);

    try {
      const response = await axios.post(`/payment-first/doctor-approval/${appointmentId}`, {
        doctorWallet,
        action,
        reason
      });

      if (response.data.success) {
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        showNotification(
          `Appointment ${actionText} successfully${action === 'reject' ? ' - refund initiated' : ''}`,
          action === 'approve' ? 'success' : 'info'
        );

        // Remove from queue
        setPaidAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        onApprovalComplete?.();
      }
    } catch (error: any) {
      console.error('Approval failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to process approval';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'inPerson':
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return 'Video Consultation';
      case 'chat':
        return 'Chat Consultation';
      case 'inPerson':
      default:
        return 'In-Person Consultation';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeSincePayment = (paymentDate: string) => {
    const now = new Date();
    const payment = new Date(paymentDate);
    const diffMs = now.getTime() - payment.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMins / 1440)} days ago`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading paid appointments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Paid Appointment Requests
            {paidAppointments.length > 0 && (
              <Badge className="bg-green-100 text-green-800 border-green-200 border">
                {paidAppointments.length} PAID
              </Badge>
            )}
          </div>
          <Button
            onClick={fetchPaidQueue}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {paidAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Paid Appointments Pending</p>
            <p className="text-sm">
              Paid appointment requests will appear here for your review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Priority Notice */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <div className="text-sm">
                  <div className="font-medium">Priority Queue - Paid Requests</div>
                  <div>These patients have already paid. Review and approve/reject to confirm or refund.</div>
                </div>
              </div>
            </div>

            {/* Paid Appointments List */}
            <div className="space-y-4">
              {paidAppointments.map((appointment) => (
                <Card key={appointment.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getServiceIcon(appointment.serviceType)}
                          <div>
                            <div className="font-medium">{appointment.patientName}</div>
                            <div className="text-sm text-gray-600">
                              {getServiceTypeLabel(appointment.serviceType)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 border-green-200 border">
                            PAID {appointment.fee} ETB
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
                            PRIORITY
                          </Badge>
                        </div>
                      </div>

                      {/* Appointment Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{formatDateTime(appointment.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{appointment.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span>Paid {getTimeSincePayment(appointment.paymentConfirmedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="truncate">{appointment.patientWallet.slice(0, 10)}...</span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <div className="text-sm font-medium mb-1">Reason for Consultation:</div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {appointment.reason}
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApproval(appointment.id, 'approve')}
                          disabled={processingId === appointment.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {processingId === appointment.id ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Approve & Confirm
                            </div>
                          )}
                        </Button>

                        <Button
                          onClick={() => {
                            const reason = prompt('Please provide a reason for rejection:');
                            if (reason) {
                              handleApproval(appointment.id, 'reject', reason);
                            }
                          }}
                          disabled={processingId === appointment.id}
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject & Refund
                        </Button>
                      </div>

                      {/* Payment Info */}
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="text-xs text-green-700">
                          <div className="font-medium">💰 Payment Confirmed</div>
                          <div>Patient has paid {appointment.fee} ETB. Approve to confirm appointment or reject for automatic refund.</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaidAppointmentQueue;