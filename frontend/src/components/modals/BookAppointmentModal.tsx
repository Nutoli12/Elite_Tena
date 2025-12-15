import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Loader2, ChevronRight, ChevronLeft, Star, Video, MessageSquare, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from '../../lib/axios';
import ChapaPaymentButton from '../payment/ChapaPaymentButton';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../services/modalService';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { user } = useAuth();

  // Data states
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  // Pricing states
  const [doctorPricing, setDoctorPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // Form values
  const selectedDepartment = watch('department');
  const selectedDoctorId = watch('doctorId');
  const selectedServiceType = watch('serviceType');

  // Find selected doctor
  const selectedDoctor = doctors.find(d => d.walletAddress === selectedDoctorId);
  
  // Calculate current price based on selected service
  const getCurrentPrice = () => {
    if (!doctorPricing || !selectedServiceType) return 0;
    const serviceMap: Record<string, string> = {
      'inPerson': 'inPerson',
      'videoCall': 'videoCall', 
      'chat': 'chat'
    };
    const serviceKey = serviceMap[selectedServiceType];
    return doctorPricing.services?.[serviceKey]?.fee || 0;
  };
  
  const currentPrice = getCurrentPrice();

  // Fetch departments on mount
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      setStep(1); // Reset to first step
    }
  }, [isOpen]);

  // Fetch doctors when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchDoctors(selectedDepartment);
    }
  }, [selectedDepartment]);

  // Fetch pricing when doctor is selected
  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorPricing(selectedDoctorId);
    } else {
      setDoctorPricing(null);
    }
  }, [selectedDoctorId]);

  const fetchDoctorPricing = async (doctorWallet: string) => {
    setLoadingPricing(true);
    try {
      const response = await axios.get(`/two-tier-pricing/doctor/${doctorWallet}/pricing`);
      if (response.data.success) {
        console.log('💰 Doctor pricing loaded:', response.data.data);
        setDoctorPricing(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch doctor pricing:', error);
      // Set default pricing on error
      setDoctorPricing({
        services: {
          inPerson: { fee: 400, setBy: 'system' },
          videoCall: { fee: 500, setBy: 'default' },
          chat: { fee: 300, setBy: 'default' }
        }
      });
    } finally {
      setLoadingPricing(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/doctors/departments');
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchDoctors = async (department: string) => {
    setLoadingDoctors(true);
    console.log('🔍 Fetching doctors for department:', department);
    try {
      const response = await axios.get(`/doctors/department/${department}`);
      console.log('📋 Doctors response:', response.data);
      if (response.data.success) {
        console.log('✅ Setting doctors:', response.data.data.length, 'doctors found');
        setDoctors(response.data.data);
      } else {
        console.log('❌ Response not successful');
        setDoctors([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch doctors:', error);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const createPendingAppointment = async () => {
    console.log('🏥 Creating pending appointment for payment...');
    setLoading(true);
    
    try {
      const data = watch(); // Get current form data
      
      // Use dynamic pricing from doctorPricing state
      const fee = currentPrice || (selectedServiceType === 'inPerson' ? 400 : 
             selectedServiceType === 'videoCall' ? 500 : 300);
      
      const appointmentData = {
        patientWalletAddress: user?.walletAddress,
        doctorWalletAddress: selectedDoctorId,
        appointmentDate: `${data.date} ${data.time}`,
        reason: data.reason,
        duration: 30,
        serviceType: selectedServiceType,
        fee: fee,
        paymentStatus: 'pending', // Mark as pending payment
        paymentMethod: 'chapa',
        status: 'payment_pending' // Special status for payment-first flow
      };
      
      console.log('💰 Using dynamic price:', fee, 'ETB for', selectedServiceType);

      console.log('🏥 Creating pending appointment:', appointmentData);
      
      const appointmentResponse = await axios.post('/appointments', appointmentData);
      
      if (!appointmentResponse.data.success) {
        throw new Error(appointmentResponse.data.error || 'Failed to create pending appointment');
      }

      const appointmentId = appointmentResponse.data.data.id;
      console.log('✅ Pending appointment created with ID:', appointmentId);
      setCreatedAppointmentId(appointmentId);
      return appointmentId;

    } catch (error: any) {
      console.error('❌ Failed to create pending appointment:', error);
      Modal.showError({
        title: 'Appointment Creation Failed',
        message: error.response?.data?.error || error.message || 'Failed to create pending appointment'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 Payment successful! Confirming appointment...');
    setLoading(true);
    
    try {
      if (!createdAppointmentId) {
        throw new Error('No appointment ID found');
      }

      // Update appointment status to confirmed after successful payment
      const updateResponse = await axios.put(`/appointments/${createdAppointmentId}`, {
        paymentStatus: 'paid',
        status: 'scheduled' // Change from payment_pending to scheduled
      });
      
      if (!updateResponse.data.success) {
        throw new Error(updateResponse.data.error || 'Failed to confirm appointment');
      }

      console.log('✅ Appointment confirmed after payment');
      setPaymentCompleted(true);

      // Show success and close modal after delay
      setTimeout(async () => {
        Modal.showSuccess({
          title: 'Appointment Confirmed!',
          message: `Appointment confirmed! ID: ${createdAppointmentId}\n\nYour appointment is now visible in your appointments list.`,
          showConfetti: true
        });
        
        // Call onSubmit to trigger parent refresh (this will call fetchAppointments in Appointments.tsx)
        try {
          await onSubmit({ appointmentId: createdAppointmentId, paymentCompleted: true });
        } catch (e) {
          // Ignore errors from onSubmit - the appointment is already created
          console.log('Note: onSubmit callback completed');
        }
        
        onClose();
        setStep(1);
        setCreatedAppointmentId(null);
        setPaymentCompleted(false);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Failed to confirm appointment after payment:', error);
      Modal.showError({
        title: 'Confirmation Failed',
        message: error.response?.data?.error || error.message || 'Failed to confirm appointment after payment'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailure = (error: string) => {
    console.error('💳 Payment failed:', error);
    Modal.showError({
      title: 'Payment Failed',
      message: `Payment failed: ${error}. Please try again.`,
      showRetry: true
    });
    setLoading(false);
  };

  const handleFormSubmit = async (data: any) => {
    // This is just for form validation, actual submission happens in createAppointment
    console.log('Form submitted with data:', data);
  };

  const nextStep = () => {
    const newStep = Math.min(step + 1, 5);
    setStep(newStep);
    
    // Don't create appointment automatically - wait for payment completion
  };
  
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const canProceedToStep2 = selectedDepartment;
  const canProceedToStep3 = selectedDoctorId;
  const canProceedToStep4 = watch('date') && watch('time') && watch('reason');
  const canProceedToStep5 = selectedServiceType;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Book Appointment</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-medical-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {s}
                    </div>
                    {s < 5 && (
                      <div className={`w-8 h-1 mx-1 ${step > s ? 'bg-medical-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>Department</span>
                <span>Doctor</span>
                <span>Schedule</span>
                <span>Service</span>
                <span>Payment</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              {/* Step 1: Select Department */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Select Department</h3>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {departments.map((dept) => (
                      <label
                        key={dept}
                        className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedDepartment === dept
                          ? 'border-medical-500 bg-medical-50'
                          : 'border-gray-300 hover:border-medical-300'
                          }`}
                      >
                        <input
                          type="radio"
                          {...register('department', { required: 'Please select a department' })}
                          value={dept}
                          className="sr-only"
                        />
                        <div className="text-center w-full">
                          <p className="font-medium text-gray-900 text-sm">{dept}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.department && <p className="text-red-500 text-sm">{errors.department.message as string}</p>}
                </motion.div>
              )}

              {/* Step 2: Select Doctor */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Select Doctor in {selectedDepartment}</h3>

                  {loadingDoctors ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-medical-500" />
                      <p className="text-gray-600 mt-2">Loading doctors...</p>
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No doctors available in this department</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {doctors.map((doctor) => (
                        <label
                          key={doctor.walletAddress}
                          className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedDoctorId === doctor.walletAddress
                            ? 'border-medical-500 bg-medical-50'
                            : 'border-gray-300 hover:border-medical-300'
                            }`}
                        >
                          <input
                            type="radio"
                            {...register('doctorId', { required: 'Please select a doctor' })}
                            value={doctor.walletAddress}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {doctor?.user?.profileData?.name || doctor?.user?.profileData?.fullName || (doctor?.user?.profileData?.firstName && doctor?.user?.profileData?.lastName ? `${doctor.user.profileData.firstName} ${doctor.user.profileData.lastName}` : doctor?.name || 'Doctor')}
                                </p>
                                <p className="text-sm text-gray-600">{doctor.specialization}</p>
                              </div>
                              {doctor.rating > 0 && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{doctor.rating.toFixed(1)}</span>
                                  <span className="text-gray-500">({doctor.reviewCount})</span>
                                </div>
                              )}
                            </div>
                            {doctor.bio && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{doctor.bio}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {doctor.languages?.map((lang: string) => (
                                <span key={lang} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.doctorId && <p className="text-red-500 text-sm">{errors.doctorId.message as string}</p>}
                </motion.div>
              )}

              {/* Step 3: Schedule */}
              {step === 3 && selectedDoctor && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Appointment</h3>
                  
                  {/* Date & Time Selection */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Select Date & Time</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          {...register('date', { required: 'Date is required' })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        />
                        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message as string}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                        <select
                          {...register('time', { required: 'Time is required' })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        >
                          <option value="">Select time</option>
                          <option value="09:00">09:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="14:00">02:00 PM</option>
                          <option value="15:00">03:00 PM</option>
                          <option value="16:00">04:00 PM</option>
                        </select>
                        {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message as string}</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit *</label>
                    <textarea
                      {...register('reason', { required: 'Reason is required' })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="Describe your symptoms or reason for appointment..."
                    />
                    {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message as string}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                      {...register('notes')}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="Any additional information..."
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Service Selection with Dynamic Pricing */}
              {step === 4 && selectedDoctor && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Select Service Type</h3>
                  
                  {/* Doctor's Pricing Info */}
                  {doctorPricing && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💰</span>
                        <h4 className="font-semibold text-blue-900">
                          {doctorPricing.doctorName}'s Service Rates
                        </h4>
                      </div>
                      <p className="text-sm text-blue-700">
                        Prices set by the doctor based on their expertise and service type
                      </p>
                    </div>
                  )}

                  {loadingPricing ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-medical-500" />
                      <p className="text-sm text-gray-600 mt-2">Loading pricing...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* In-Person Consultation */}
                      <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedServiceType === 'inPerson'
                        ? 'border-medical-500 bg-medical-50'
                        : 'border-gray-300 hover:border-medical-300'
                        }`}>
                        <input
                          type="radio"
                          {...register('serviceType', { required: 'Please select service type' })}
                          value="inPerson"
                          className="sr-only"
                        />
                        <MapPin className="w-6 h-6 text-medical-600 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">In-Person Consultation</p>
                            <div className="text-right">
                              <span className="text-medical-600 font-bold text-lg">
                                {doctorPricing?.services?.inPerson?.fee || 400} ETB
                              </span>
                              {doctorPricing?.services?.inPerson?.setBy === 'system' && (
                                <p className="text-xs text-gray-500">Standard rate</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {doctorPricing?.services?.inPerson?.description || 'Visit the clinic for consultation'}
                          </p>
                          <p className="text-xs text-green-600 mt-1">✓ Immediate confirmation after payment</p>
                        </div>
                      </label>

                      {/* Video Call Consultation */}
                      <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedServiceType === 'videoCall'
                        ? 'border-medical-500 bg-medical-50'
                        : 'border-gray-300 hover:border-medical-300'
                        }`}>
                        <input
                          type="radio"
                          {...register('serviceType', { required: 'Please select service type' })}
                          value="videoCall"
                          className="sr-only"
                        />
                        <Video className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">Video Call Consultation</p>
                            <div className="text-right">
                              <span className="text-blue-600 font-bold text-lg">
                                {doctorPricing?.services?.videoCall?.fee || 500} ETB
                              </span>
                              {doctorPricing?.services?.videoCall?.setBy === 'doctor' && (
                                <p className="text-xs text-blue-500">Doctor's rate</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {doctorPricing?.services?.videoCall?.description || 'Online video consultation from anywhere'}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {doctorPricing?.services?.videoCall?.autoApprove 
                              ? '✓ Auto-approved at this rate' 
                              : '⏳ Requires doctor approval after payment'}
                          </p>
                        </div>
                      </label>

                      {/* Chat Consultation */}
                      <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedServiceType === 'chat'
                        ? 'border-medical-500 bg-medical-50'
                        : 'border-gray-300 hover:border-medical-300'
                        }`}>
                        <input
                          type="radio"
                          {...register('serviceType', { required: 'Please select service type' })}
                          value="chat"
                          className="sr-only"
                        />
                        <MessageSquare className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">Chat Consultation</p>
                            <div className="text-right">
                              <span className="text-purple-600 font-bold text-lg">
                                {doctorPricing?.services?.chat?.fee || 300} ETB
                              </span>
                              {doctorPricing?.services?.chat?.setBy === 'doctor' && (
                                <p className="text-xs text-purple-500">Doctor's rate</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {doctorPricing?.services?.chat?.description || 'Text-based consultation at your convenience'}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {doctorPricing?.services?.chat?.autoApprove 
                              ? '✓ Auto-approved at this rate' 
                              : '⏳ Requires doctor approval after payment'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Real-time Price Summary */}
                  {selectedServiceType && doctorPricing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mt-4"
                    >
                      <h4 className="font-semibold text-green-900 mb-2">💳 Price Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Service Fee:</span>
                          <span className="font-medium">{currentPrice} ETB</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Platform Fee:</span>
                          <span>0 ETB</span>
                        </div>
                        <div className="border-t border-green-200 pt-2 flex justify-between">
                          <span className="font-semibold text-green-900">Total Amount:</span>
                          <span className="font-bold text-green-700 text-lg">{currentPrice} ETB</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {errors.serviceType && <p className="text-red-500 text-sm">{errors.serviceType.message as string}</p>}
                </motion.div>
              )}

              {/* Step 5: Payment & Confirmation */}
              {step === 5 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Payment & Confirmation</h3>

                  {/* Appointment Summary */}
                  <div className="bg-medical-50 border border-medical-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Department:</strong> {selectedDepartment}</p>
                      <p><strong>Doctor:</strong> {doctorPricing?.doctorName || selectedDoctor?.user?.profileData?.name || selectedDoctor?.name || 'Doctor'}</p>
                      <p><strong>Service:</strong> {selectedServiceType === 'inPerson' ? 'In-Person Consultation' : selectedServiceType === 'videoCall' ? 'Video Call' : 'Chat Consultation'}</p>
                      <p><strong>Date:</strong> {watch('date')}</p>
                      <p><strong>Time:</strong> {watch('time')}</p>
                      <p><strong>Reason:</strong> {watch('reason')}</p>
                    </div>
                  </div>

                  {/* Dynamic Price Breakdown */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">💳 Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {selectedServiceType === 'inPerson' ? 'In-Person' : selectedServiceType === 'videoCall' ? 'Video Call' : 'Chat'} Fee
                          {doctorPricing?.services?.[selectedServiceType]?.setBy === 'doctor' && (
                            <span className="ml-1 text-xs text-blue-600">(Doctor's rate)</span>
                          )}
                        </span>
                        <span className="font-medium">{currentPrice} ETB</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Platform Fee</span>
                        <span>0 ETB</span>
                      </div>
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-green-900">Total Amount</span>
                          <span className="text-2xl font-bold text-green-700">{currentPrice} ETB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Payment & Approval Process</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      {selectedServiceType === 'inPerson' ? (
                        <>
                          <p>• Pay <strong>exactly {currentPrice} ETB</strong> for instant confirmation</p>
                          <p>• In-person appointments are automatically approved after payment</p>
                        </>
                      ) : (
                        <>
                          <p>• Pay <strong>exactly {currentPrice} ETB</strong> (doctor's rate) for {doctorPricing?.services?.[selectedServiceType]?.autoApprove ? 'instant approval' : 'doctor review'}</p>
                          {!doctorPricing?.services?.[selectedServiceType]?.autoApprove && (
                            <p>• Doctor will review and approve your appointment</p>
                          )}
                        </>
                      )}
                      <p>• Full refund if doctor rejects your request</p>
                      <p>• No refunds for approved appointments (doctor's time reserved)</p>
                    </div>
                  </div>

                  {/* Payment FIRST - Simple Implementation */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Complete Payment First</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Payment First Policy:</strong> Complete payment to secure your appointment slot. 
                        Your appointment will be created automatically after successful payment.
                      </p>
                    </div>

                    {/* Real Chapa Payment Integration */}
                    {!createdAppointmentId ? (
                      <button
                        onClick={createPendingAppointment}
                        disabled={loading || !currentPrice}
                        className="w-full bg-medical-600 hover:bg-medical-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Appointment...
                          </>
                        ) : (
                          <>
                            📋 Create Appointment & Proceed to Payment
                          </>
                        )}
                      </button>
                    ) : !paymentCompleted ? (
                      <ChapaPaymentButton
                        appointmentId={createdAppointmentId}
                        patientWallet={user?.walletAddress || ''}
                        amount={currentPrice || 400}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentFailure={handlePaymentFailure}
                        disabled={loading}
                      />
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <span className="font-semibold">Payment Successful & Appointment Confirmed!</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Appointment ID: {createdAppointmentId}
                        </p>
                      </div>
                    )}
                  </div>

                  {paymentCompleted && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="font-semibold">Payment Successful!</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Your appointment has been {selectedServiceType === 'inPerson' ? 'confirmed' : 'sent to the doctor for approval'}.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !canProceedToStep2) ||
                      (step === 2 && !canProceedToStep3) ||
                      (step === 3 && !canProceedToStep4) ||
                      (step === 4 && !canProceedToStep5)
                    }
                    className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex-1 text-center">
                    <p className="text-sm text-gray-600 mb-2">Complete payment below to secure your appointment</p>
                    {loading && (
                      <div className="flex items-center justify-center gap-2 text-medical-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating appointment...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};