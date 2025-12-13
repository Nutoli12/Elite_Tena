import React from 'react';
import EnhancedAppointmentBooking from '../components/appointment/EnhancedAppointmentBooking';

const TestEnhancedBooking: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Appointment Booking System
          </h1>
          <p className="text-gray-600">
            Test the new 4-step flow: Department → Doctor → Schedule → Payment
          </p>
        </div>
        
        <EnhancedAppointmentBooking />
      </div>
    </div>
  );
};

export default TestEnhancedBooking;