import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
const LAB_API_URL = `${API_BASE_URL}/api/lab`;

// Types for Lab Workflow
export type LabTest = {
  id: number;
  testCode: string;
  testName: string;
  testCategory: string;
  description: string;
  sampleType: string;
  fastingRequired: boolean;
  standardPrice: number;
  turnaroundTimeHours: number;
  referenceRanges: Record<string, any>;
  criticalValues: Record<string, any>;
  isActive: boolean;
}

export type LabOrder = {
  id: number;
  orderNumber: string;
  patientWalletAddress: string;
  doctorWalletAddress: string;
  testCodes: string[];
  priority: 'routine' | 'urgent' | 'stat';
  sampleType: string;
  specialInstructions?: string;
  collectionDate?: string;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  consentStatus: 'pending' | 'granted' | 'denied';
  createdAt: string;
  updatedAt: string;
  patient?: {
    walletAddress: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  doctor?: {
    walletAddress: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type LabResult = {
  id: number;
  labOrderId: number;
  technicianWalletAddress: string;
  resultData: Record<string, any>;
  interpretation?: string;
  technicianNotes?: string;
  referenceRanges: Record<string, any>;
  reportFiles: any[];
  rawDataFiles: any[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  hasCriticalValues: boolean;
  criticalValues: any[];
  resultDate: string;
  createdAt: string;
  labOrder?: LabOrder;
  technician?: {
    walletAddress: string;
    firstName: string;
    lastName: string;
  };
}

// API Service Class
class LabWorkflowAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const walletAddress = localStorage.getItem('user_wallet');
    const userRole = localStorage.getItem('user_role');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (walletAddress) {
      headers['x-wallet-address'] = walletAddress;
    }
    
    if (userRole) {
      headers['x-user-role'] = userRole;
    }
    
    return headers;
  }

  // Lab Test Catalog
  async getLabTestCatalog(params?: { category?: string; search?: string }) {
    const response = await axios.get(`${LAB_API_URL}/catalog`, { params });
    return response.data;
  }

  async getTestDetails(testCodes: string[]) {
    const response = await axios.post(`${LAB_API_URL}/catalog/details`, { testCodes });
    return response.data;
  }

  // Lab Orders
  async createLabOrder(orderData: {
    patientWalletAddress: string;
    testCodes: string[];
    priority?: string;
    sampleType?: string;
    specialInstructions?: string;
    collectionDate?: string;
  }) {
    const response = await axios.post(`${LAB_API_URL}/orders`, orderData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getLabOrders(params?: {
    status?: string;
    priority?: string;
    patientWallet?: string;
    doctorWallet?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await axios.get(`${LAB_API_URL}/orders`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getLabOrder(id: number) {
    const response = await axios.get(`${LAB_API_URL}/orders/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateLabOrderStatus(id: number, status: string, notes?: string) {
    const response = await axios.patch(`${LAB_API_URL}/orders/${id}/status`, 
      { status, notes }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getLabOrderStats() {
    const response = await axios.get(`${LAB_API_URL}/orders/stats/summary`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // PROPER MEDICAL LAB WORKFLOW

  // STEP 1: Create lab result record (PROPER WORKFLOW)
  async createLabResultRecord(data: {
    labOrderId: number;
    technicianId?: number;
    testCodes: string[];
  }) {
    const response = await axios.post(`${LAB_API_URL}/results/create-record`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // STEP 2: Submit lab results for validation
  async submitLabResults(data: {
    resultRecordId: number;
    resultData: Record<string, any>;
    interpretation: string;
    technicianNotes?: string;
    qualityChecks: Record<string, boolean>;
    reportFiles?: any[];
    rawDataFiles?: any[];
  }) {
    const response = await axios.post(`${LAB_API_URL}/results/submit`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // STEP 3: Release results to doctor (technician releases, NOT completes)
  async releaseResultsToDoctor(data: {
    resultRecordId: number;
    finalValidation?: boolean;
  }) {
    const response = await axios.post(`${LAB_API_URL}/results/release-to-doctor`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // STEP 4: Doctor review and completion (DOCTOR completes, not technician)
  async doctorReviewLabResults(data: {
    resultRecordId: number;
    action: 'accept' | 'request_correction';
    doctorNotes?: string;
    doctorInterpretation?: string;
  }) {
    const response = await axios.post(`${LAB_API_URL}/results/doctor-review`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // LAB WORKSHEET SYSTEM (NEW PROPER WORKFLOW)

  // Create lab worksheet with accession number
  async createLabWorksheet(worksheetData: {
    labOrderId: number;
    accessionNumber: string;
    technicianId: string;
    sampleCollectionStatus: string;
    processingStatus: string;
    chainOfCustody: any[];
  }) {
    const response = await axios.post(`${LAB_API_URL}/worksheets`, worksheetData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Record sample collection
  async recordSampleCollection(worksheetId: number, collectionData: {
    sampleType: string;
    collectionMethod: string;
    sampleVolume: number;
    containerType: string;
    storageLocation: string;
    collectedBy: string;
    collectionDateTime: Date;
    barcode: string;
    specialHandling?: string;
  }) {
    const response = await axios.post(`${LAB_API_URL}/worksheets/${worksheetId}/sample-collection`, collectionData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Start processing
  async startProcessing(worksheetId: number, processingData: {
    instrumentUsed: string;
    operatorId: string;
    startTime: Date;
  }) {
    const response = await axios.post(`${LAB_API_URL}/worksheets/${worksheetId}/start-processing`, processingData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Get worksheet details
  async getLabWorksheet(worksheetId: number) {
    const response = await axios.get(`${LAB_API_URL}/worksheets/${worksheetId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Get worksheets by status
  async getLabWorksheets(params?: {
    status?: string;
    technicianId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await axios.get(`${LAB_API_URL}/worksheets`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // LEGACY: Upload lab results (DEPRECATED - use proper workflow above)
  async uploadLabResult(resultData: {
    labOrderId: number;
    resultData: Record<string, any>;
    interpretation?: string;
    technicianNotes?: string;
    reportFiles?: any[];
    rawDataFiles?: any[];
  }) {
    const response = await axios.post(`${LAB_API_URL}/results`, resultData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getLabResults(params?: {
    patientWallet?: string;
    doctorWallet?: string;
    labOrderId?: number;
    verificationStatus?: string;
    hasCriticalValues?: boolean;
    page?: number;
    limit?: number;
  }) {
    const response = await axios.get(`${LAB_API_URL}/results`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getLabResult(id: number) {
    const response = await axios.get(`${LAB_API_URL}/results/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async verifyLabResult(id: number, verificationStatus: string, verificationNotes?: string) {
    const response = await axios.patch(`${LAB_API_URL}/results/${id}/verify`, 
      { verificationStatus, verificationNotes }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async addResultToMedicalRecord(id: number, doctorInterpretation: string, clinicalNotes?: string) {
    const response = await axios.post(`${LAB_API_URL}/results/${id}/medical-record`, 
      { doctorInterpretation, clinicalNotes }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getCriticalResults() {
    const response = await axios.get(`${LAB_API_URL}/results/critical/alerts`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Patient Selection
  async getPatients(params?: { search?: string; limit?: number }) {
    const response = await axios.get(`${LAB_API_URL}/patients`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Dashboard APIs
  async getDoctorOverview() {
    const response = await axios.get(`${LAB_API_URL}/doctor/overview`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getTechnicianDashboard() {
    const response = await axios.get(`${LAB_API_URL}/technician/dashboard`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getTechnicianQueue(params?: { priority?: string; status?: string }) {
    const response = await axios.get(`${LAB_API_URL}/technician/queue`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getPatientHistory() {
    const response = await axios.get(`${LAB_API_URL}/patient/history`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Audit & Reporting
  async getAccessLogs(params?: {
    labResultId?: number;
    labOrderId?: number;
    userWalletAddress?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const response = await axios.get(`${LAB_API_URL}/audit/access-logs`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }
}

export const labWorkflowAPI = new LabWorkflowAPI();