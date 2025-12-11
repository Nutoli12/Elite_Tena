import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Loader2, ChevronRight, ChevronLeft, Star, Video, MessageSquare, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from '../../lib/axios';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Data states
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Form values
  const selectedDepartment = watch('department');
  const selectedDoctorId = watch('doctorId');
  const selectedServiceType = watch('serviceType');

  // Find selected doctor
  const selectedDoctor = doctors.find(d => d.walletAddress === selectedDoctorId);

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

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Add service type and fee information
      const appointmentData = {
        ...data,
        serviceType: selectedServiceType,
        fee: selectedDoctor?.availableServices?.[selectedServiceType]?.fee || 0,
        requiresApproval: selectedServiceType !== 'inPerson',
        paymentRequired: selectedServiceType !== 'inPerson'
      };

      await onSubmit(appointmentData);
      onClose();
      setStep(1); // Reset for next time
    } catch (error) {
      console.error('Failed to book appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const canProceedToStep2 = selectedDepartment;
  const canProceedToStep3 = selectedDoctorId && selectedServiceType;

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
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-medical-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {s}
                    </div>
                    {s < 4 && (
                      <div className={`w-12 h-1 mx-2 ${step > s ? 'bg-medical-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>Department</span>
                <span>Doctor</span>
                <span>Service</span>
                <span>Schedule</span>
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
                                  {doctor?.profileData?.name || doctor?.profileData?.fullName || (doctor?.profileData?.firstName && doctor?.profileData?.lastName ? `${doctor.profileData.firstName} ${doctor.profileData.lastName}` : doctor?.user?.name || doctor?.name || 'Doctor')}
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

              {/* Step 3: Select Service Type */}
              {step === 3 && selectedDoctor && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Select Service Type</h3>
                  <div className="space-y-3">
                    {/* Free In-Person */}
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
                          <p className="font-semibold text-gray-900">Free In-Person Consultation</p>
                          <span className="text-green-600 font-bold">FREE</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Visit the clinic for consultation</p>
                        <p className="text-xs text-green-600 mt-1">✓ Immediate confirmation</p>
                      </div>
                    </label>

                    {/* Paid Video Call */}
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
                          <span className="text-blue-600 font-bold">
                            {selectedDoctor.availableServices?.videoCall?.fee || 500} Birr
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Online video consultation from anywhere</p>
                        <p className="text-xs text-yellow-600 mt-1">⏳ Requires doctor approval & payment</p>
                      </div>
                    </label>

                    {/* Paid Chat */}
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
                          <span className="text-purple-600 font-bold">
                            {selectedDoctor.availableServices?.chat?.fee || 300} Birr
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Text-based consultation at your convenience</p>
                        <p className="text-xs text-yellow-600 mt-1">⏳ Requires doctor approval & payment</p>
                      </div>
                    </label>
                  </div>
                  {errors.serviceType && <p className="text-red-500 text-sm">{errors.serviceType.message as string}</p>}
                </motion.div>
              )}

              {/* Step 4: Schedule & Details */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Appointment</h3>

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

                  {/* Summary */}
                  <div className="bg-medical-50 border border-medical-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Department:</strong> {selectedDepartment}</p>
                      <p><strong>Doctor:</strong> {selectedDoctor?.profileData?.name || selectedDoctor?.profileData?.fullName || (selectedDoctor?.profileData?.firstName && selectedDoctor?.profileData?.lastName ? `${selectedDoctor.profileData.firstName} ${selectedDoctor.profileData.lastName}` : selectedDoctor?.user?.name || selectedDoctor?.name || 'Doctor')}</p>
                      <p><strong>Service:</strong> {selectedServiceType === 'inPerson' ? 'Free In-Person' : selectedServiceType === 'videoCall' ? 'Video Call' : 'Chat'}</p>
                      {selectedServiceType !== 'inPerson' && (
                        <p><strong>Fee:</strong> {selectedDoctor?.availableServices?.[selectedServiceType]?.fee} Birr</p>
                      )}
                    </div>
                  </div>

                  {selectedServiceType !== 'inPerson' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> This appointment requires doctor approval and payment before confirmation.
                      </p>
                    </div>
                  )}

                  {selectedServiceType === 'inPerson' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <strong>Note:</strong> Your appointment will be confirmed immediately. No payment required.
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

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !canProceedToStep2) ||
                      (step === 2 && !selectedDoctorId) ||
                      (step === 3 && !canProceedToStep3)
                    }
                    className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      'Book Appointment'
                    )}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
