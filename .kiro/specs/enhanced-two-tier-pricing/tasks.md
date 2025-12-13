# Implementation Plan

## 1. Database Schema and Core Models

- [ ] 1.1 Create enhanced database schema for two-tier pricing system
  - Create `doctor_service_fees` table with proper constraints for pricing tiers
  - Create `enhanced_payment_transactions` table with approval method tracking
  - Create `pricing_audit_log` table for comprehensive audit trails
  - Create `market_rate_analytics` table for market intelligence
  - Add proper indexes for performance optimization
  - _Requirements: 1.3, 1.4, 9.1, 9.2_

- [ ] 1.2 Write property test for database schema constraints
  - **Property 1: Premium pricing validation**
  - **Validates: Requirements 1.2, 10.1**

- [ ] 1.3 Implement DoctorServiceFees model with validation
  - Create Sequelize model with proper associations
  - Implement price range validation (2,000-20,000 ETB for premium)
  - Add methods for pricing history and audit trail
  - Include market rate calculation helpers
  - _Requirements: 1.2, 1.3, 10.1_

- [ ] 1.4 Implement EnhancedPaymentTransaction model
  - Create model with approval method tracking
  - Add payment routing destination fields
  - Implement transaction status management
  - Include refund tracking capabilities
  - _Requirements: 6.1, 6.2, 7.1, 8.2_

- [ ] 1.5 Write property test for payment transaction model
  - **Property 2: Premium payment routing**
  - **Validates: Requirements 6.1, 7.1**

## 2. Pricing Engine Implementation

- [ ] 2.1 Implement core PricingEngine service
  - Create service class with pricing retrieval methods
  - Implement doctor pricing validation and storage
  - Add market rate calculation and caching
  - Include pricing history management
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 2.2 Implement pricing validation logic
  - Create validation functions for premium price ranges
  - Add specialty-based default pricing suggestions
  - Implement pricing change audit logging
  - Include suspicious pricing pattern detection
  - _Requirements: 1.2, 1.5, 10.1, 10.2_

- [ ] 2.3 Write property test for pricing validation
  - **Property 1: Premium pricing validation**
  - **Validates: Requirements 1.2, 10.1**

- [ ] 2.4 Implement market rate analytics
  - Create market rate calculation algorithms
  - Add specialty-based rate aggregation
  - Implement rate trend analysis
  - Include competitive pricing insights
  - _Requirements: 2.5, 10.5_

## 3. Auto-Approval Logic Engine

- [ ] 3.1 Implement AutoApprovalEngine service
  - Create core approval decision logic
  - Implement exact price matching validation
  - Add approval path determination algorithms
  - Include auto-approval execution workflows
  - _Requirements: 3.1, 3.2, 3.3, 4.1_

- [ ] 3.2 Write property test for auto-approval logic
  - **Property 3: Auto-approval logic**
  - **Validates: Requirements 3.1, 3.2, 3.4**

- [ ] 3.3 Implement manual approval routing
  - Create manual approval workflow handlers
  - Add doctor notification systems
  - Implement approval/rejection processing
  - Include alternative scheduling suggestions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.4 Write property test for manual approval routing
  - **Property 4: Manual approval for standard services**
  - **Validates: Requirements 4.1**

- [ ] 3.5 Write property test for price mismatch handling
  - **Property 6: Price mismatch handling**
  - **Validates: Requirements 3.3**

## 4. Payment Router Implementation

- [ ] 4.1 Implement PaymentRouter service
  - Create payment destination routing logic
  - Implement direct doctor wallet transfers
  - Add system wallet payment holding
  - Include payment status tracking
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [ ] 4.2 Write property test for payment routing
  - **Property 2: Premium payment routing**
  - **Validates: Requirements 6.1, 7.1**

- [ ] 4.3 Implement payment holding and release logic
  - Create system wallet payment holding
  - Add consultation completion triggers
  - Implement payment release to doctors
  - Include platform fee deduction
  - _Requirements: 5.4, 5.5, 6.2_

- [ ] 4.4 Write property test for payment holding
  - **Property 5: Payment holding for standard services**
  - **Validates: Requirements 6.2, 5.4, 5.5**

- [ ] 4.5 Implement refund processing system
  - Create refund workflow for rejected appointments
  - Add cancellation refund logic
  - Implement technical issue refund handling
  - Include refund notification systems
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 4.6 Write property test for refund processing
  - **Property 7: Refund processing**
  - **Validates: Requirements 8.2, 8.3, 4.4**

## 5. Audit Service Implementation

- [ ] 5.1 Implement comprehensive AuditService
  - Create audit logging for all pricing changes
  - Add payment transaction audit trails
  - Implement approval decision logging
  - Include suspicious activity detection
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 5.2 Write property test for audit trail completeness
  - **Property 8: Audit trail completeness**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 5.3 Implement audit report generation
  - Create audit report generation tools
  - Add dispute investigation support
  - Implement data integrity verification
  - Include unauthorized access prevention
  - _Requirements: 9.4, 9.5_

## 6. Frontend Components - Doctor Interface

- [ ] 6.1 Implement enhanced PremiumPricingSettings component
  - Update existing component for two-tier system
  - Add separate controls for video_call and chat pricing
  - Implement price range validation with helpful feedback
  - Include market rate guidance and suggestions
  - _Requirements: 1.1, 1.2, 1.5_

- [ ] 6.2 Implement DoctorPricingDashboard component
  - Create comprehensive pricing management interface
  - Add pricing history and analytics views
  - Implement market comparison tools
  - Include revenue projections and insights
  - _Requirements: 2.5, 10.5_

- [ ] 6.3 Implement enhanced AppointmentApprovalQueue
  - Update existing queue for two-tier system
  - Add auto-approval status indicators
  - Implement manual approval workflows
  - Include alternative scheduling tools
  - _Requirements: 4.2, 4.3, 4.5_

## 7. Frontend Components - Patient Interface

- [ ] 7.1 Implement enhanced DoctorSelection component
  - Update existing component for two-tier display
  - Add clear pricing tier visualization
  - Implement market context information
  - Include availability indicators per service type
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 7.2 Write property test for pricing display
  - **Property 10: Market rate display**
  - **Validates: Requirements 2.1, 2.2, 2.5**

- [ ] 7.3 Implement TwoTierPaymentWorkflow component
  - Create intelligent payment workflow
  - Add auto-approval vs manual approval indicators
  - Implement payment destination transparency
  - Include refund policy communication
  - _Requirements: 2.3, 6.3, 8.1_

- [ ] 7.4 Write property test for no-refund policy enforcement
  - **Property 9: No-refund policy enforcement**
  - **Validates: Requirements 3.5, 8.1**

- [ ] 7.5 Implement PaymentConfirmation component
  - Create payment confirmation interface
  - Add transaction receipt generation
  - Implement status tracking displays
  - Include refund request handling
  - _Requirements: 6.4, 7.2, 8.5_

## 8. Backend API Controllers

- [ ] 8.1 Implement TwoTierPricingController
  - Update existing controller for enhanced functionality
  - Add pricing CRUD operations with validation
  - Implement market rate API endpoints
  - Include pricing analytics endpoints
  - _Requirements: 1.1, 1.2, 2.5_

- [ ] 8.2 Implement EnhancedPaymentController
  - Create payment processing endpoints
  - Add auto-approval workflow APIs
  - Implement payment routing logic
  - Include refund processing endpoints
  - _Requirements: 3.1, 6.1, 7.1, 8.2_

- [ ] 8.3 Implement AppointmentApprovalController
  - Create appointment approval APIs
  - Add manual approval workflow endpoints
  - Implement approval notification systems
  - Include alternative scheduling APIs
  - _Requirements: 4.1, 4.3, 4.4, 4.5_

## 9. Admin Interface Implementation

- [ ] 9.1 Implement AdminPricingControls component
  - Create admin pricing management interface
  - Add standard rate update functionality
  - Implement doctor notification systems
  - Include pricing abuse monitoring tools
  - _Requirements: 5.1, 5.2, 5.3, 10.2, 10.4_

- [ ] 9.2 Implement PricingAnalyticsDashboard
  - Create comprehensive analytics interface
  - Add market trend visualization
  - Implement suspicious activity monitoring
  - Include revenue and usage reports
  - _Requirements: 10.2, 10.5_

## 10. Integration and Workflow Testing

- [ ] 10.1 Implement Chapa payment gateway integration
  - Update existing integration for two-tier routing
  - Add direct doctor wallet transfers
  - Implement payment holding mechanisms
  - Include enhanced error handling
  - _Requirements: 6.1, 6.2, 7.1_

- [ ] 10.2 Implement notification system enhancements
  - Update notification system for two-tier workflows
  - Add auto-approval notifications
  - Implement payment confirmation messages
  - Include refund status notifications
  - _Requirements: 3.2, 5.3, 7.2, 8.5_

- [ ] 10.3 Write integration tests for complete workflows
  - Test end-to-end auto-approval flow
  - Test manual approval workflow
  - Test payment routing and refund processes
  - Test audit trail generation

## 11. Final System Integration

- [ ] 11.1 Integrate all components into existing system
  - Update routing for new pricing endpoints
  - Integrate new components into existing pages
  - Update navigation for pricing management
  - Ensure backward compatibility
  - _Requirements: All_

- [ ] 11.2 Implement comprehensive error handling
  - Add error boundaries for new components
  - Implement graceful degradation strategies
  - Add user-friendly error messages
  - Include retry mechanisms for payment failures
  - _Requirements: 6.5, 7.4_

- [ ] 11.3 Performance optimization and monitoring
  - Optimize database queries for pricing lookups
  - Implement caching for market rate data
  - Add performance monitoring for payment flows
  - Include load testing for concurrent bookings
  - _Requirements: Performance and scalability_

## 12. Checkpoint - Ensure all tests pass
- Ensure all tests pass, ask the user if questions arise.