// Healthcare Domain Types

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  title: string;
  diagnosis: string;
  treatment: string;
  symptoms?: string;
  notes?: string;
  date: string;
  ipfsHash?: string;
  isEncrypted: boolean;
  blockchainTxHash?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  refills: number;
  status: 'active' | 'filled' | 'expired' | 'cancelled';
  issued: string;
  expires: string;
  isFilled: boolean;
  filledBy?: string;
  filledAt?: string;
  blockchainTxHash?: string;
  ipfsHash?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  doctorId: string;
  labTechId: string;
  testName: string;
  testType: string;
  results: string;
  normalRange: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted: string;
  approved?: string;
  rejectionReason?: string;
  files?: string[];
  ipfsHash?: string;
  blockchainTxHash?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: 'in-person' | 'telemedicine';
  location: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'scheduled' | 'approved';
  reason?: string;
  notes?: string;
  fee?: number;
  
  // Phase 3: Payment & Approval
  serviceType?: 'inPerson' | 'videoCall' | 'chat';
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  paymentMethod?: 'telebirr' | 'cbe_birr' | 'cash' | 'free';
  paymentStatus?: 'pending' | 'paid' | 'confirmed' | 'refunded';
  paymentReceiptUrl?: string;
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: string;
  
  // Phase 4: Check-in & Queue
  checkInStatus?: 'not_checked_in' | 'checked_in' | 'waiting' | 'in_progress' | 'completed';
  checkedInAt?: string;
  checkedInBy?: string;
  queueNumber?: number;
  qrCodeData?: string;
  estimatedWaitTime?: number;
  consultationStartedAt?: string;
  consultationEndedAt?: string;
}

export interface Consent {
  id: string;
  patientId: string;
  providerId: string;
  providerName: string;
  consentType: 'medical_records' | 'prescriptions' | 'lab_results' | 'emergency';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  granted: string;
  expires?: string;
  revoked?: string;
  purpose: string;
  blockchainTxHash?: string;
  revocationTxHash?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  currency: 'ETH' | 'ETB';
  purpose: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
}
