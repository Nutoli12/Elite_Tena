import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const appointmentType = watch('type');

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Failed to book appointment:', error);
    } finally {
      setLoading(false);
    }
  };

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

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor/Specialist *</label>
                <select
                  {...register('doctorId', { required: 'Please select a doctor' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                >
                  <option value="">Select doctor</option>
                  <option value="0xDOCTOR12345678901234567890123456789012345">Dr. Alemayehu - Cardiology</option>
                  <option value="0xDOCTOR23456789012345678901234567890123456">Dr. Selam - Dermatology</option>
                  <option value="0xDOCTOR34567890123456789012345678901234567">Dr. Mekdes - Pediatrics</option>
                  <option value="0xDOCTOR45678901234567890123456789012345678">Dr. Solomon - General Practice</option>
                </select>
                {errors.doctorId && <p className="text-red-500 text-sm mt-1">{errors.doctorId.message as string}</p>}
              </div>

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
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                  {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message as string}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type *</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="relative flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-medical-500 transition-colors">
                    <input
                      type="radio"
                      {...register('type', { required: 'Please select appointment type' })}
                      value="in-person"
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">In-Person</p>
                      <p className="text-sm text-gray-600">Visit the clinic</p>
                    </div>
                  </label>
                  <label className="relative flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-medical-500 transition-colors">
                    <input
                      type="radio"
                      {...register('type', { required: 'Please select appointment type' })}
                      value="telemedicine"
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Telemedicine</p>
                      <p className="text-sm text-gray-600">Video call</p>
                    </div>
                  </label>
                </div>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message as string}</p>}
              </div>

              {appointmentType === 'in-person' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    {...register('location')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    placeholder="Main Hospital - Room 304"
                    defaultValue="Main Hospital"
                  />
                </motion.div>
              )}

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

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> You will receive a confirmation email and SMS once your appointment is confirmed.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
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
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
