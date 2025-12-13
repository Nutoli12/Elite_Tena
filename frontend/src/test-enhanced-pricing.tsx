/**
 * Test file to verify Enhanced Two-Tier Pricing components work
 */
import React from 'react';
import DoctorPricingDashboard from './components/doctor/DoctorPricingDashboard';
import PremiumPricingSettings from './components/doctor/PremiumPricingSettings';
import TwoTierPaymentWorkflow from './components/payment/TwoTierPaymentWorkflow';

// Mock data for testing
const mockAppointmentData = {
  doctorId: 'doctor123',
  doctorName: 'Dr. Smith',
  serviceType: 'video_call' as const,
  scheduledTime: new Date().toISOString(),
  duration: 30,
  reason: 'Regular checkup'
};

const mockPricingData = {
  amount: 5000,
  doctorPrice: 5000,
  marketRate: 4500,
  pricingTier: 'premium' as const,
  autoApprovalEligible: true,
  priceMatch: true
};

const TestEnhancedPricing: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Enhanced Two-Tier Pricing System Test</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Doctor Pricing Dashboard</h2>
          <DoctorPricingDashboard />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Premium Pricing Settings</h2>
          <PremiumPricingSettings />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Two-Tier Payment Workflow</h2>
          <TwoTierPaymentWorkflow
            appointmentData={mockAppointmentData}
            pricingData={mockPricingData}
            onPaymentComplete={(result) => console.log('Payment complete:', result)}
            onCancel={() => console.log('Payment cancelled')}
          />
        </section>
      </div>
    </div>
  );
};

export default TestEnhancedPricing;