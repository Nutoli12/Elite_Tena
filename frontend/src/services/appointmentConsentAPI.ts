import axios from '../lib/axios';

export interface AppointmentConsentRequest {
  doctorWalletAddress: string;
  customPermissions?: {
    allow_consultation?: boolean;
    allow_medical_history_view?: boolean;
    allow_prescription_write?: boolean;
    allow_lab_test_order?: boolean;
    allow_diagnosis_recording?: boolean;
    allow_video_call?: boolean;
    allow_chat?: boolean;
    valid_for_hours?: number;
    purpose?: string;
  };
  purpose?: string;
  consultationType?: string;
}

export interface AppointmentConsentGrant {
  patientWalletAddress: string;
  customPermissions?: any;
  customDuration?: number;
}

export interface AppointmentConsentDeny {
  patientWalletAddress: string;
  reason?: string;
}

export interface AppointmentConsentRevoke {
  patientWalletAddress: string;
  reason?: string;
}

export interface AppointmentConsentResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  reason?: string;
  status?: string;
  permissions?: any;
  expiresAt?: string;
  consent?: any;
}

class AppointmentConsentAPI {
  // Note: axios baseURL already includes /api, so we don't need to add it again
  private baseURL = '/appointment-consent';

  /**
   * Request consent for a specific appointment (Doctor)
   */
  async requestConsent(appointmentId: string, request: AppointmentConsentRequest): Promise<AppointmentConsentResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/request/${appointmentId}`, request);
      return response.data;
    } catch (error: any) {
      console.error('❌ Request consent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request consent',
        error: error.message
      };
    }
  }

  /**
   * Grant consent for a specific appointment (Patient)
   */
  async grantConsent(appointmentId: string, grant: AppointmentConsentGrant): Promise<AppointmentConsentResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/grant/${appointmentId}`, grant);
      return response.data;
    } catch (error: any) {
      console.error('❌ Grant consent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to grant consent',
        error: error.message
      };
    }
  }

  /**
   * Deny consent for a specific appointment (Patient)
   */
  async denyConsent(appointmentId: string, deny: AppointmentConsentDeny): Promise<AppointmentConsentResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/deny/${appointmentId}`, deny);
      return response.data;
    } catch (error: any) {
      console.error('❌ Deny consent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to deny consent',
        error: error.message
      };
    }
  }

  /**
   * Revoke consent for a specific appointment (Patient)
   */
  async revokeConsent(appointmentId: string, revoke: AppointmentConsentRevoke): Promise<AppointmentConsentResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/revoke/${appointmentId}`, revoke);
      return response.data;
    } catch (error: any) {
      console.error('❌ Revoke consent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to revoke consent',
        error: error.message
      };
    }
  }

  /**
   * Check consent status for an appointment
   */
  async checkConsent(appointmentId: string, action?: string): Promise<ConsentCheckResult> {
    try {
      const params = action ? { action } : {};
      const response = await axios.get(`${this.baseURL}/check/${appointmentId}`, { params });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return {
          hasConsent: false,
          reason: response.data.message || 'Consent check failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Check consent error:', error);
      return {
        hasConsent: false,
        reason: error.response?.data?.message || 'Failed to check consent'
      };
    }
  }

  /**
   * Get consent details for an appointment
   */
  async getConsentDetails(appointmentId: string): Promise<AppointmentConsentResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/${appointmentId}`);
      return response.data;
    } catch (error: any) {
      // 404 is expected when no consent exists yet - don't log as error
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'No consent found for this appointment',
          error: 'NOT_FOUND'
        };
      }
      console.error('❌ Get consent details error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get consent details',
        error: error.message
      };
    }
  }

  /**
   * Get patient's appointment consent requests
   */
  async getPatientConsents(patientWalletAddress: string, status?: string): Promise<AppointmentConsentResponse> {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(`${this.baseURL}/patient/${patientWalletAddress}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('❌ Get patient consents error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get patient consents',
        error: error.message
      };
    }
  }

  /**
   * Get doctor's appointment consent requests
   */
  async getDoctorConsents(doctorWalletAddress: string, status?: string): Promise<AppointmentConsentResponse> {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(`${this.baseURL}/doctor/${doctorWalletAddress}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('❌ Get doctor consents error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get doctor consents',
        error: error.message
      };
    }
  }

  /**
   * Check if consultation can proceed for appointment
   */
  async canStartConsultation(appointmentId: string): Promise<{
    canProceed: boolean;
    reason?: string;
    workflowState?: string;
    consentStatus?: string;
    nextStep?: string;
  }> {
    try {
      const consentCheck = await this.checkConsent(appointmentId, 'allow_consultation');
      
      if (consentCheck.hasConsent) {
        return {
          canProceed: true
        };
      } else {
        return {
          canProceed: false,
          reason: consentCheck.reason,
          consentStatus: consentCheck.status
        };
      }
    } catch (error: any) {
      console.error('❌ Can start consultation check error:', error);
      return {
        canProceed: false,
        reason: 'Failed to check consultation permissions'
      };
    }
  }

  /**
   * Check specific permission for appointment
   */
  async hasPermission(appointmentId: string, permission: string): Promise<boolean> {
    try {
      const consentCheck = await this.checkConsent(appointmentId, permission);
      return consentCheck.hasConsent;
    } catch (error) {
      console.error(`❌ Permission check error for ${permission}:`, error);
      return false;
    }
  }

  /**
   * Get consent status summary for appointment
   */
  async getConsentSummary(appointmentId: string): Promise<{
    status: 'not_requested' | 'requested' | 'granted' | 'denied' | 'expired' | 'revoked';
    message: string;
    canRequest: boolean;
    canGrant: boolean;
    canRevoke: boolean;
    expiresAt?: string;
  }> {
    try {
      const response = await this.getConsentDetails(appointmentId);
      
      if (!response.success || !response.data) {
        return {
          status: 'not_requested',
          message: 'No consent request found',
          canRequest: true,
          canGrant: false,
          canRevoke: false
        };
      }

      const consent = response.data;
      const now = new Date();
      const expiresAt = consent.expiresAt ? new Date(consent.expiresAt) : null;
      const isExpired = expiresAt && now > expiresAt;

      let status = consent.status;
      if (status === 'granted' && isExpired) {
        status = 'expired';
      }

      const statusMessages: Record<string, string> = {
        not_requested: 'Consent has not been requested',
        requested: 'Consent request pending patient approval',
        granted: isExpired ? 'Consent has expired' : 'Consent granted and active',
        denied: 'Consent was denied by patient',
        expired: 'Consent has expired',
        revoked: 'Consent was revoked by patient'
      };

      return {
        status: status as any,
        message: statusMessages[status as string] || 'Unknown consent status',
        canRequest: ['not_requested', 'denied', 'expired', 'revoked'].includes(status),
        canGrant: status === 'requested',
        canRevoke: status === 'granted' && !isExpired,
        expiresAt: consent.expiresAt
      };
    } catch (error) {
      console.error('❌ Get consent summary error:', error);
      return {
        status: 'not_requested',
        message: 'Failed to check consent status',
        canRequest: false,
        canGrant: false,
        canRevoke: false
      };
    }
  }
}

export const appointmentConsentAPI = new AppointmentConsentAPI();
export default appointmentConsentAPI;