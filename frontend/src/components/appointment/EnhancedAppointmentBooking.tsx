import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Calendar,
  Clock,
  User,
  Video,
  MessageSquare,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Shield,
  DollarSign
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';
import ChapaPaymentButton from '../payment/ChapaPaymentButton';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  wallet: string;
  pricing: {
    inPerson: number;
    videoCall: number;
    chat: number;
  };
  services: {
    inPerson: boolean;
    videoCall: boolean;
    chat: boolean;
  };
}

interface Department {
  id: string;
  name: string;
  description: string;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const EnhancedAppointmentBooking: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    duration: 30,
    reason: ''
  });
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showNotification } = useNotification();

  // Mock departments - replace with API call
  const departments: Department[] = [
    { id: 'ent', name: 'ENT (Ear, Nose, Throat)', description: 'Ear, nose, and throat specialists' },
    { id: 'general', name: 'General Practice', description: 'General medical consultation' },
    { id: 'internal', name: 'Internal Medicine', description: 'Internal medicine specialists' },
    { id: 'neurology', name: 'Neurology', description: 'Brain and nervous system' },
    { id: 'obstetrics', name: 'Obstetrics & Gynecology', description: 'Women\'s health specialists' },
    { id: 'ophthalmology', name: 'Ophthalmology', description: 'Eye care specialists' },
    { id: 'orthopedics', name: 'Orthopedics', description: 'Bone and joint specialists' },
    { id: 'pediatrics', name: 'Pediatrics', description: 'Children\'s health specialists' },
    { id: 'psychiatry', name: 'Psychiatry', description: 'Mental health specialists' },
    { id: 'surgery', name: 'Surgery', description: 'Surgical specialists' }
  ];

  // Mock doctors - replace with API call
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: '1',
      name: 'Dr. Engeda Teshome',
      specialization: 'ENT Specialist',
      wallet: '0x123...abc',
      pricing: { inPerson: 400, videoCall: 5000, chat: 2000 },
      services: { inPerson: true, videoCall: true, chat: true }
    },
    {
      id: '2',
      name: 'Dr. Abite Kebede',
      specialization: 'General Practitioner',
      wallet: '0x456...def',
      pricing: { inPerson: 400, videoCall: 3000, chat: 1500 },
      services: { inPerson: true, videoCall: true, chat: true }
    }
  ]);

  const serviceOptions: ServiceOption[] = [
    {
      id: 'in_person',
      name: 'In-Person Consultation',
      description: 'Visit doctor at clinic',
      icon: <User className="h-5 w-5" />
    },
    {
      id: 'video_call',
      name: 'Video Consultation',
      description: 'Online video consultation',
      icon: <Video className="h-5 w-5" />
    },
    {
      id: 'chat',
      name: 'Chat Consultation',
      description: 'Text-based consultation',
      icon: <MessageSquare className="h-5 w-5" />
    }
  ];

  const getServicePrice = (serviceId: string): number => {
    if (!selectedDoctor) return 0;
    switch (serviceId) {
      case 'in_person': return selectedDoctor.pricing.inPerson;
      case 'video_call': return selectedDoctor.pricing.videoCall;
      case 'chat': return selectedDoctor.pricing.chat;
      default: return 0;
    }
  };

  const isServiceAvailable = (serviceId: string): boolean => {
    if (!selectedDoctor) return false;
    switch (serviceId) {
      case 'in_person': return selectedDoctor.services.inPerson;
      case 'video_call': return selectedDoctor.services.videoCall;
      case 'chat': return selectedDoctor.services.chat;
      default: return false;
    }
  };

  const handleDepartmentSelect = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setCurrentStep(2);
    setError(null);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setCurrentStep(3);
    setError(null);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedService || !appointmentData.date || !appointmentData.time || !appointmentData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointmentDateTime = new Date(`${appointmentData.date}T${appointmentData.time}`);
      
      const response = await axios.post('/api/enhanced-appointments/appointments', {
        doctorWallet: selectedDoctor?.wallet,
        appointmentDate: appointmentDateTime.toISOString(),
        serviceType: selectedService,
        duration: appointmentData.duration,
        reason: appointmentData.reason
      });

      if (response.data.success) {
        setCreatedAppointment(response.data.data);
        setCurrentStep(4);
        showNotification('Appointment created! Please proceed to payment.', 'success');
      }
    } catch (error: any) {
      console.error('Schedule appointment error:', error);
      setError(error.response?.data?.error || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const response = await axios.post(
        `/api/enhanced-appointments/appointments/${createdAppointment.appointment.id}/payment`,
        {
          amount: paymentData.amount,
          paymentReference: paymentData.reference,
          paymentMethod: 'chapa'
        }
      );

      if (response.data.success) {
        const result = response.data.data;
        
        if (result.type === 'auto_approved') {
          showNotification('Payment successful! Appointment automatically confirmed.', 'success');
        } else {
          showNotification('Payment successful! Appointment sent to doctor for review.', 'info');
        }
        
        // Reset form or redirect
        setTimeout(() => {
          resetForm();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setError(error.response?.data?.error || 'Payment processing failed');
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedDepartment('');
    setSelectedDoctor(null);
    setSelectedService('');
    setAppointmentData({ date: '', time: '', duration: 30, reason: '' });
    setCreatedAppointment(null);
    setError(null);
  };

  // Step 1: Department Selection
  if (currentStep === 1) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Appointment - Step 1 of 4
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
              <span>Department</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">2</div>
              <span>Doctor</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">3</div>
              <span>Schedule</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">4</div>
              <span>Payment</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Select Department</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50"
                  onClick={() => handleDepartmentSelect(dept.id)}
                >
                  <div className="font-medium">{dept.name}</div>
                  <div className="text-sm text-gray-600">{dept.description}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Doctor Selection
  if (currentStep === 2) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Book Appointment - Step 2 of 4
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Department</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
              <span>Doctor</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">3</div>
              <span>Schedule</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">4</div>
              <span>Payment</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Select Doctor</h3>
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back to Departments
              </Button>
            </div>
            
            <div className="grid gap-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50"
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-lg">{doctor.name}</div>
                      <div className="text-gray-600">{doctor.specialization}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-2">Service Fees (ETB)</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>In-Person: {doctor.pricing.inPerson}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="h-3 w-3" />
                          <span>Video: {doctor.pricing.videoCall}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat: {doctor.pricing.chat}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Schedule & Service Selection
  if (currentStep === 3) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Book Appointment - Step 3 of 4
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Department</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Doctor</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
              <span>Schedule</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">4</div>
              <span>Payment</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-lg">Schedule with {selectedDoctor?.name}</h3>
                <p className="text-gray-600">{selectedDoctor?.specialization}</p>
              </div>
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Change Doctor
              </Button>
            </div>

            {/* Service Type Selection */}
            <div>
              <h4 className="font-medium mb-3">Select Consultation Type:</h4>
              <div className="grid gap-3">
                {serviceOptions.map((service) => {
                  const price = getServicePrice(service.id);
                  const available = isServiceAvailable(service.id);
                  
                  return (
                    <div
                      key={service.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        available 
                          ? selectedService === service.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-blue-300 hover:bg-blue-50'
                          : 'opacity-50 cursor-not-allowed bg-gray-50'
                      }`}
                      onClick={() => available && setSelectedService(service.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {service.icon}
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-gray-600">{service.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-lg">{price} ETB</div>
                          {service.id === 'in_person' && (
                            <div className="text-xs text-gray-500">Fixed by admin</div>
                          )}
                          {price > 400 && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Exact payment = Auto-approved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Appointment Date *
                </label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Appointment Time *
                </label>
                <input
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Expected Duration (minutes)
              </label>
              <select
                value={appointmentData.duration}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for Consultation *
              </label>
              <textarea
                value={appointmentData.reason}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe your symptoms or reason for consultation..."
                className="w-full p-2 border rounded-lg h-24 resize-none"
              />
            </div>

            {/* Pricing Information */}
            {selectedService && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 text-blue-800">
                  <Shield className="h-4 w-4 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium mb-1">Smart Approval System</div>
                    <div className="space-y-1">
                      <div>• <strong>Exact Payment ({getServicePrice(selectedService)} ETB):</strong> Instant auto-approval</div>
                      <div>• <strong>Different Amount:</strong> Doctor reviews manually</div>
                      <div>• <strong>Refund Policy:</strong> Full refund if doctor rejects</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleScheduleSubmit}
                disabled={loading || !selectedService || !appointmentData.date || !appointmentData.time || !appointmentData.reason}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </div>
                ) : (
                  'Proceed to Payment'
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

  // Step 4: Payment
  if (currentStep === 4 && createdAppointment) {
    const paymentAmount = createdAppointment.paymentRequired.amount;
    
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Book Appointment - Step 4 of 4
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Department</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Doctor</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Schedule</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">4</div>
              <span>Payment</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Appointment Created Successfully!</span>
              </div>
              <div className="text-sm text-green-700">
                Your appointment has been scheduled. Complete payment to confirm.
              </div>
            </div>

            {/* Appointment Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Appointment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Doctor:</span>
                  <span className="font-medium">{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{selectedService?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="font-medium">{appointmentData.date} at {appointmentData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{appointmentData.duration} minutes</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{paymentAmount} ETB</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2 text-blue-800">
                <DollarSign className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium mb-1">Payment & Approval Process</div>
                  <div className="space-y-1">
                    <div>• Pay <strong>exactly {paymentAmount} ETB</strong> for instant approval</div>
                    <div>• Pay different amount for manual doctor review</div>
                    <div>• Full refund if doctor rejects your request</div>
                    <div>• No refunds for approved appointments (doctor's time reserved)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <ChapaPaymentButton
              appointmentId={createdAppointment.appointment.id}
              patientWallet={createdAppointment.appointment.patientWallet}
              amount={paymentAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentFailure={(error) => setError(error)}
            />

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

  return null;
};

export default EnhancedAppointmentBooking;