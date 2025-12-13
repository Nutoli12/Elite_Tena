import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  CreditCard, 
  User, 
  Video, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Shield
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';
import ChapaPaymentButton from '../payment/ChapaPaymentButton';

interface PaymentFirstBookingProps {
  doctorWallet: string;
  doctorName?: string;
  specialization?: string;
  onBookingComplete?: (appointmentId: string) => void;
}

interface ServicePricing {
  serviceType: string;
  fee: number;
  paymentRequired: boolean;
  paymentTiming: 'BEFORE_APPROVAL' | 'AFTER_APPROVAL';
  doctorName: string;
  specialization: string;
  message: string;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  minimumFee?: number;
}

const PaymentFirstBooking: React.FC<PaymentFirstBookingProps> = ({
  doctorWallet,
  doctorName = 'Doctor',
  specialization = 'General Practice',
  onBookingComplete
}) => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [servicePricing, setServicePricing] = useState<ServicePricing | null>(null);
  const [appointmentData, setAppointmentData] = useState({
    appointmentDate: '',
    reason: '',
    duration: 30
  });
  const [loading, setLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<'select' | 'details' | 'payment' | 'confirmation'>('select');
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { showNotification } = useNotification();

  // Service options with clear payment requirements
  const serviceOptions: ServiceOption[] = [
    {
      id: 'inPerson',
      name: 'In-Person Consultation',
      description: 'Visit doctor at clinic',
      icon: <User className="h-5 w-5" />,
      minimumFee: 0 // Can be free
    },
    {
      id: 'videoCall',
      name: 'Video Consultation',
      description: 'Online video consultation',
      icon: <Video className="h-5 w-5" />,
      minimumFee: 400 // MINIMUM 400 ETB
    },
    {
      id: 'chat',
      name: 'Chat Consultation',
      description: 'Text-based consultation',
      icon: <MessageSquare className="h-5 w-5" />,
      minimumFee: 400 // MINIMUM 400 ETB
    }
  ];

  useEffect(() => {
    if (selectedService) {
      fetchServicePricing(selectedService);
    }
  }, [selectedService]);

  const fetchServicePricing = async (serviceType: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/payment-first/pricing/${doctorWallet}/${serviceType}`);
      
      if (response.data.success) {
        setServicePricing(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch service pricing:', error);
      setError(error.response?.data?.error || 'Failed to get pricing information');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceType: string) => {
    setSelectedService(serviceType);
    setBookingStep('details');
    setError(null);
  };

  const handleBookingSubmit = async () => {
    if (!servicePricing || !appointmentData.appointmentDate || !appointmentData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (servicePricing.paymentRequired && servicePricing.paymentTiming === 'BEFORE_APPROVAL') {
        // Premium service: Initialize payment first
        await initializePremiumPayment();
      } else {
        // Free service: Create appointment directly
        await createFreeAppointment();
      }
    } catch (error: any) {
      console.error('Booking submission failed:', error);
      setError(error.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const initializePremiumPayment = async () => {
    try {
      const response = await axios.post('/api/payment-first/initialize-premium-payment', {
        patientWallet: 'current-user-wallet', // TODO: Get from auth context
        doctorWallet,
        serviceType: selectedService,
        appointmentDate: appointmentData.appointmentDate,
        reason: appointmentData.reason,
        duration: appointmentData.duration
      });

      if (response.data.success) {
        setPendingAppointment(response.data.data);
        setBookingStep('payment');
        showNotification('Payment required before doctor review', 'info');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const createFreeAppointment = async () => {
    try {
      const response = await axios.post('/api/payment-first/create-appointment', {
        patientWallet: 'current-user-wallet', // TODO: Get from auth context
        doctorWallet,
        serviceType: selectedService,
        appointmentDate: appointmentData.appointmentDate,
        reason: appointmentData.reason,
        duration: appointmentData.duration
      });

      if (response.data.success) {
        setBookingStep('confirmation');
        showNotification('Appointment request sent to doctor', 'success');
        onBookingComplete?.(response.data.data.id);
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        // Payment required
        setError(error.response.data.message);
        showNotification('Payment required for this service', 'warning');
      } else {
        throw error;
      }
    }
  };

  const handlePaymentSuccess = () => {
    setBookingStep('confirmation');
    showNotification('Payment successful! Request sent to doctor for approval.', 'success');
    onBookingComplete?.(pendingAppointment?.appointment?.id);
  };

  const getServiceIcon = (serviceType: string) => {
    const service = serviceOptions.find(s => s.id === serviceType);
    return service?.icon || <User className="h-5 w-5" />;
  };

  const getPaymentRequiredBadge = (serviceType: string) => {
    const service = serviceOptions.find(s => s.id === serviceType);
    if (!service?.minimumFee || service.minimumFee === 0) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 border">FREE</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">PAYMENT REQUIRED</Badge>;
  };

  // Step 1: Service Selection
  if (bookingStep === 'select') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Book Appointment with {doctorName}
          </CardTitle>
          <p className="text-sm text-gray-600">{specialization}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Select Consultation Type:</h4>
              <div className="grid gap-3">
                {serviceOptions.map((service) => (
                  <div
                    key={service.id}
                    className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50"
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {service.icon}
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-600">{service.description}</div>
                          {service.minimumFee && service.minimumFee > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              Minimum: {service.minimumFee} ETB
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getPaymentRequiredBadge(service.id)}
                        {service.minimumFee && service.minimumFee > 0 && (
                          <div className="text-xs text-gray-500">
                            💳 Pay first, then doctor reviews
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment-First Explanation */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2 text-blue-800">
                <Shield className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium mb-1">How Our Booking Works</div>
                  <div className="space-y-1">
                    <div>• <strong>Video/Chat:</strong> Pay first → Doctor reviews your PAID request → Approval/Refund</div>
                    <div>• <strong>In-Person:</strong> Doctor sets fee → Pay if required → Doctor reviews</div>
                    <div>• <strong>Refunds:</strong> Automatic refund if doctor rejects your request</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Appointment Details
  if (bookingStep === 'details') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getServiceIcon(selectedService)}
            {serviceOptions.find(s => s.id === selectedService)?.name}
          </CardTitle>
          {servicePricing && (
            <div className="flex items-center gap-2">
              <Badge className={servicePricing.paymentRequired ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                {servicePricing.fee > 0 ? `${servicePricing.fee} ETB` : 'FREE'}
              </Badge>
              {servicePricing.paymentTiming === 'BEFORE_APPROVAL' && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border">
                  PAYMENT FIRST
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pricing Information */}
            {servicePricing && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-700">
                  {servicePricing.message}
                </div>
              </div>
            )}

            {/* Appointment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Appointment Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={appointmentData.appointmentDate}
                  onChange={(e) => setAppointmentData(prev => ({
                    ...prev,
                    appointmentDate: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for Consultation *
                </label>
                <textarea
                  value={appointmentData.reason}
                  onChange={(e) => setAppointmentData(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                  placeholder="Describe your symptoms or reason for consultation..."
                  className="w-full p-2 border rounded-lg h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expected Duration (minutes)
                </label>
                <select
                  value={appointmentData.duration}
                  onChange={(e) => setAppointmentData(prev => ({
                    ...prev,
                    duration: parseInt(e.target.value)
                  }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setBookingStep('select')}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleBookingSubmit}
                disabled={loading || !appointmentData.appointmentDate || !appointmentData.reason}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : servicePricing?.paymentRequired ? (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pay {servicePricing.fee} ETB & Book
                  </div>
                ) : (
                  'Send Request to Doctor'
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Payment (for premium services)
  if (bookingStep === 'payment' && pendingAppointment) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <div className="text-blue-800 text-sm">
                <div className="font-medium mb-1">Payment Required Before Doctor Review</div>
                <div>Your request will be sent to the doctor only after payment is confirmed.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ChapaPaymentButton
          appointmentId={pendingAppointment.appointment.id}
          patientWallet="current-user-wallet" // TODO: Get from auth context
          amount={pendingAppointment.appointment.fee}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={(error) => setError(error)}
        />
      </div>
    );
  }

  // Step 4: Confirmation
  if (bookingStep === 'confirmation') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Booking Successful!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-green-800 text-sm">
                {servicePricing?.paymentRequired ? (
                  <div>
                    <div className="font-medium mb-1">Payment Confirmed & Request Sent</div>
                    <div>Your paid appointment request has been sent to {doctorName} for approval. You'll be notified of their decision.</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium mb-1">Request Sent to Doctor</div>
                    <div>Your appointment request has been sent to {doctorName} for approval.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <div className="font-medium mb-2">What happens next:</div>
              <div className="space-y-1">
                <div>1. Doctor reviews your request</div>
                <div>2. You'll receive approval/rejection notification</div>
                {servicePricing?.paymentRequired && (
                  <div>3. If rejected, automatic refund will be processed</div>
                )}
                <div>{servicePricing?.paymentRequired ? '4' : '3'}. If approved, consultation consent will be requested</div>
              </div>
            </div>

            <Button
              onClick={() => {
                setBookingStep('select');
                setSelectedService('');
                setServicePricing(null);
                setPendingAppointment(null);
                setAppointmentData({ appointmentDate: '', reason: '', duration: 30 });
              }}
              className="w-full"
            >
              Book Another Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PaymentFirstBooking;