# Requirements Document

## Introduction

The Enhanced Two-Tier Pricing System creates a healthcare marketplace that serves both budget-conscious and premium patients in Ethiopia. The system implements intelligent auto-approval logic based on exact price matching, eliminating payment disputes and streamlining the booking process for premium services while maintaining affordable access through standardized pricing.

## Glossary

- **System**: The Elite Tena healthcare platform
- **Standard_Tier**: Fixed-price in-person consultations (400 ETB)
- **Premium_Tier**: Doctor-set pricing for video calls and chat consultations (2,000-20,000 ETB)
- **Auto_Approval**: Automatic appointment confirmation when patient pays exact doctor-set price
- **Manual_Approval**: Doctor review required for appointment confirmation
- **Price_Match**: Payment amount exactly equals doctor's set fee for that service type
- **Service_Type**: Consultation delivery method (in_person, video_call, chat)
- **Doctor_Wallet**: Direct payment destination for premium services
- **System_Wallet**: Platform-managed payment for standard services

## Requirements

### Requirement 1

**User Story:** As a doctor, I want to set my own pricing for premium services, so that I can charge according to my expertise and market value.

#### Acceptance Criteria

1. WHEN a doctor accesses pricing settings THEN the System SHALL display separate pricing controls for video_call and chat service types
2. WHEN a doctor sets a premium service price THEN the System SHALL validate the amount is between 2,000 and 20,000 ETB
3. WHEN a doctor saves pricing settings THEN the System SHALL store the fees with doctor_id, service_type, and fee_amount
4. WHEN a doctor updates existing pricing THEN the System SHALL preserve the previous pricing history for audit purposes
5. WHERE a doctor has not set premium pricing THEN the System SHALL display default suggested rates based on specialty and experience

### Requirement 2

**User Story:** As a patient, I want to see transparent pricing before booking, so that I can make informed decisions about my healthcare spending.

#### Acceptance Criteria

1. WHEN a patient views doctor selection THEN the System SHALL display both standard (400 ETB) and premium pricing for each doctor
2. WHEN displaying premium prices THEN the System SHALL show the exact fee amount set by each doctor for video_call and chat services
3. WHEN a patient selects a service type THEN the System SHALL clearly indicate whether the appointment requires manual approval or will be auto-approved
4. WHEN showing pricing THEN the System SHALL display availability timeframes for each service type
5. WHEN premium pricing is displayed THEN the System SHALL include market context showing typical price ranges for that specialty

### Requirement 3

**User Story:** As a patient, I want automatic approval for premium services when I pay the exact price, so that I can get immediate confirmation without waiting for doctor review.

#### Acceptance Criteria

1. WHEN a patient pays the exact doctor-set premium price THEN the System SHALL automatically approve the appointment
2. WHEN auto-approval occurs THEN the System SHALL immediately confirm the appointment and notify both patient and doctor
3. WHEN a patient pays an incorrect amount for premium services THEN the System SHALL route the appointment for manual doctor approval
4. WHEN auto-approval is triggered THEN the System SHALL transfer payment directly to the doctor's wallet
5. WHERE auto-approval occurs THEN the System SHALL prevent appointment cancellation to protect doctor's reserved time

### Requirement 4

**User Story:** As a doctor, I want to manually review standard in-person appointments, so that I can manage my schedule and ensure appropriate patient care.

#### Acceptance Criteria

1. WHEN a patient books a standard in-person consultation THEN the System SHALL route the appointment for doctor approval regardless of payment amount
2. WHEN a doctor reviews standard appointments THEN the System SHALL display patient information, payment status, and appointment details
3. WHEN a doctor approves a standard appointment THEN the System SHALL confirm the booking and schedule the consultation
4. WHEN a doctor rejects a standard appointment THEN the System SHALL refund the patient payment and notify both parties
5. WHILE reviewing appointments THEN the System SHALL allow doctors to suggest alternative time slots

### Requirement 5

**User Story:** As the system administrator, I want to manage the standard tier pricing, so that healthcare remains accessible while ensuring platform sustainability.

#### Acceptance Criteria

1. WHEN an administrator accesses pricing controls THEN the System SHALL display the current standard consultation fee (400 ETB)
2. WHEN an administrator updates standard pricing THEN the System SHALL apply the new rate to all future bookings immediately
3. WHEN standard pricing changes THEN the System SHALL notify all registered doctors of the updated rate
4. WHEN processing standard payments THEN the System SHALL hold funds in the system wallet until service completion
5. WHERE standard consultations are completed THEN the System SHALL transfer payment to doctors minus any platform fees

### Requirement 6

**User Story:** As a patient, I want different payment flows for different service tiers, so that I understand where my money goes and when.

#### Acceptance Criteria

1. WHEN a patient pays for premium services THEN the System SHALL process payment directly to the doctor's designated wallet
2. WHEN a patient pays for standard services THEN the System SHALL hold payment in the system wallet until consultation completion
3. WHEN payment processing occurs THEN the System SHALL clearly indicate the payment destination to the patient
4. WHEN premium payments are made THEN the System SHALL provide immediate payment confirmation and receipt
5. WHERE payment failures occur THEN the System SHALL provide clear error messages and alternative payment options

### Requirement 7

**User Story:** As a doctor, I want to receive immediate payment for auto-approved premium consultations, so that I have guaranteed income for my reserved time.

#### Acceptance Criteria

1. WHEN auto-approval occurs for premium services THEN the System SHALL transfer payment to the doctor's wallet within 5 minutes
2. WHEN premium payments are processed THEN the System SHALL send payment confirmation to the doctor immediately
3. WHEN doctors receive premium payments THEN the System SHALL provide detailed transaction records including patient information
4. WHERE payment processing fails THEN the System SHALL retry the transfer and notify the doctor of any delays
5. WHILE premium consultations are active THEN the System SHALL track payment status and consultation completion

### Requirement 8

**User Story:** As a patient, I want clear refund policies for different service tiers, so that I understand the financial commitment for each booking type.

#### Acceptance Criteria

1. WHEN a patient books auto-approved premium services THEN the System SHALL clearly state no-refund policy due to guaranteed doctor availability
2. WHEN standard appointments are rejected by doctors THEN the System SHALL process full refunds within 24 hours
3. WHEN patients cancel standard appointments before doctor approval THEN the System SHALL allow full refunds
4. WHERE technical issues prevent service delivery THEN the System SHALL provide full refunds regardless of service tier
5. WHEN refund processing occurs THEN the System SHALL notify patients of refund status and expected timeline

### Requirement 9

**User Story:** As a system operator, I want comprehensive audit trails for all pricing and payment activities, so that I can ensure system integrity and resolve disputes.

#### Acceptance Criteria

1. WHEN pricing changes occur THEN the System SHALL log the change with timestamp, user_id, old_value, and new_value
2. WHEN payments are processed THEN the System SHALL record transaction details including amount, destination, and approval_method
3. WHEN auto-approval logic executes THEN the System SHALL log the decision criteria and matching price validation
4. WHERE disputes arise THEN the System SHALL provide complete transaction history for investigation
5. WHILE auditing occurs THEN the System SHALL maintain data integrity and prevent unauthorized modifications

### Requirement 10

**User Story:** As a healthcare platform, I want to ensure pricing compliance and prevent abuse, so that the marketplace remains fair and sustainable.

#### Acceptance Criteria

1. WHEN doctors set premium pricing THEN the System SHALL validate prices are within acceptable market ranges (2,000-20,000 ETB)
2. WHEN suspicious pricing patterns are detected THEN the System SHALL flag accounts for administrative review
3. WHEN payment amounts don't match expected patterns THEN the System SHALL require additional verification
4. WHERE pricing abuse is confirmed THEN the System SHALL have mechanisms to suspend or restrict pricing privileges
5. WHILE monitoring pricing THEN the System SHALL generate reports on market trends and pricing distribution