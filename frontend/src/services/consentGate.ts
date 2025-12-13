import axios from '../lib/axios';

export interface ConsentStatus {
  hasAccess: boolean;
  consent?: {
    id: string;
    status: 'active' | 'expired' | 'revoked';
    permissions: string[];
    expiresAt: string;
    grantedAt: string;
  };
  patientName?: string;
}

export interface ConsentGateResult {
  allowed: boolean;
  reason?: string;
  action?: 'request_consent' | 'show_error' | 'emergency_override';
  consentStatus?: ConsentStatus;
}

class ConsentGateService {
  private consentCache = new Map<string, ConsentStatus>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Main consent gate - checks if doctor can perform action on patient
   */
  async checkConsent(
    patientWallet: string,
    doctorWallet: string,
    action: 'viewRecords' | 'createRecord' | 'prescribe' | 'orderLab' | 'consultation' | 'videoCall' | 'chat',
    appointmentId?: string // 🆕 For appointment-specific consent
  ): Promise<ConsentGateResult> {
    try {
      // Check cache first
      const cacheKey = `${doctorWallet}-${patientWallet}`;
      const cached = this.getCachedConsent(cacheKey);
      
      if (cached) {
        return this.evaluateConsent(cached, action, patientWallet);
      }

      // Fetch fresh consent status
      const consentStatus = appointmentId 
        ? await this.fetchAppointmentConsentStatus(appointmentId)
        : await this.fetchConsentStatus(patientWallet, doctorWallet);
      
      // Cache the result
      this.cacheConsent(cacheKey, consentStatus);
      
      return this.evaluateConsent(consentStatus, action, patientWallet);
      
    } catch (error) {
      console.error('Consent gate error:', error);
      return {
        allowed: false,
        reason: 'Unable to verify consent. Please try again.',
        action: 'show_error'
      };
    }
  }

  /**
   * Request consent from patient
   */
  async requestConsent(
    patientWallet: string,
    doctorWallet: string,
    permissions: string[] = ['viewMedicalHistory', 'createRecords'],
    reason: string = 'Medical consultation access'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post('/consent/request', {
        patientWalletAddress: patientWallet,
        doctorWalletAddress: doctorWallet,
        permissions,
        purpose: reason,
        durationType: 'hours',
        durationValue: 24, // 24 hours by default
        requestReason: reason
      });

      if (response.data.success) {
        // Clear cache to force refresh
        const cacheKey = `${doctorWallet}-${patientWallet}`;
        this.clearCache(cacheKey);
        
        return {
          success: true,
          message: 'Consent request sent to patient successfully'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to send consent request'
      };
      
    } catch (error: any) {
      console.error('Request consent error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send consent request'
      };
    }
  }

  /**
   * Check if emergency override is available
   */
  async checkEmergencyOverride(
    patientWallet: string,
    doctorWallet: string,
    justification: string
  ): Promise<{ allowed: boolean; message: string }> {
    try {
      const response = await axios.post('/consent/emergency-check', {
        patientWalletAddress: patientWallet,
        doctorWalletAddress: doctorWallet,
        justification
      });

      return {
        allowed: response.data.allowed || false,
        message: response.data.message || 'Emergency access not available'
      };
      
    } catch (error) {
      return {
        allowed: false,
        message: 'Emergency override check failed'
      };
    }
  }

  /**
   * Clear consent cache for specific patient-doctor pair
   */
  clearCache(cacheKey?: string) {
    if (cacheKey) {
      this.consentCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } else {
      this.consentCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get real-time consent updates (for WebSocket integration)
   */
  onConsentUpdate(callback: (patientWallet: string, doctorWallet: string, status: ConsentStatus) => void) {
    // This would integrate with your WebSocket service
    // For now, we'll implement polling-based updates
    return this.setupConsentPolling(callback);
  }

  // Private methods
  private async fetchConsentStatus(patientWallet: string, doctorWallet: string): Promise<ConsentStatus> {
    try {
      const response = await axios.get(`/consent/status/${patientWallet}/${doctorWallet}`);
      
      if (response.data.success && response.data.data) {
        const consent = response.data.data;
        return {
          hasAccess: consent.status === 'active' && new Date(consent.expiresAt) > new Date(),
          consent: {
            id: consent.id,
            status: consent.status,
            permissions: consent.permissions || [],
            expiresAt: consent.expiresAt,
            grantedAt: consent.grantedAt
          },
          patientName: consent.patient?.user?.name || consent.patient?.name || 'Patient'
        };
      }

      return { hasAccess: false };
      
    } catch (error) {
      console.error('Fetch consent status error:', error);
      return { hasAccess: false };
    }
  }

  private evaluateConsent(
    consentStatus: ConsentStatus,
    action: string,
    _patientWallet: string
  ): ConsentGateResult {
    if (!consentStatus.hasAccess) {
      return {
        allowed: false,
        reason: `You need patient consent to ${this.getActionDescription(action)}.`,
        action: 'request_consent',
        consentStatus
      };
    }

    // Check if consent has required permissions for this action
    const requiredPermissions = this.getRequiredPermissions(action);
    const hasPermissions = requiredPermissions.every(permission => 
      consentStatus.consent?.permissions.includes(permission)
    );

    if (!hasPermissions) {
      return {
        allowed: false,
        reason: `Current consent doesn't include permission to ${this.getActionDescription(action)}.`,
        action: 'request_consent',
        consentStatus
      };
    }

    return {
      allowed: true,
      consentStatus
    };
  }

  // 🆕 Fetch appointment-specific consent status
  private async fetchAppointmentConsentStatus(appointmentId: string): Promise<ConsentStatus> {
    try {
      const response = await axios.get(`/appointments/${appointmentId}/consent-status`);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        return {
          hasAccess: data.hasConsent && data.consent?.status === 'active' && !data.consent?.isExpired,
          consent: data.consent ? {
            id: data.consent.id,
            status: data.consent.status,
            permissions: Object.keys(data.consent.permissions || {}).filter(key => data.consent.permissions[key]),
            expiresAt: data.consent.expiresAt,
            grantedAt: data.consent.grantedAt
          } : undefined
        };
      }

      return { hasAccess: false };
      
    } catch (error) {
      console.error('Fetch appointment consent status error:', error);
      return { hasAccess: false };
    }
  }

  private getActionDescription(action: string): string {
    const descriptions = {
      viewRecords: 'view medical records',
      createRecord: 'create medical records',
      prescribe: 'prescribe medications',
      orderLab: 'order lab tests',
      consultation: 'start consultation',
      videoCall: 'start video call consultation',
      chat: 'start chat consultation'
    };
    return descriptions[action as keyof typeof descriptions] || 'perform this action';
  }

  private getRequiredPermissions(action: string): string[] {
    const permissionMap = {
      viewRecords: ['canViewHistory'],
      createRecord: ['canViewHistory'],
      prescribe: ['canWritePrescriptions', 'canViewHistory'],
      orderLab: ['canOrderTests', 'canViewHistory'],
      consultation: ['canViewHistory'],
      videoCall: ['canVideoCall', 'canViewHistory'],
      chat: ['canChat', 'canViewHistory']
    };
    return permissionMap[action as keyof typeof permissionMap] || ['canViewHistory'];
  }

  private getCachedConsent(cacheKey: string): ConsentStatus | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && Date.now() > expiry) {
      this.consentCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }
    return this.consentCache.get(cacheKey) || null;
  }

  private cacheConsent(cacheKey: string, status: ConsentStatus) {
    this.consentCache.set(cacheKey, status);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
  }

  private setupConsentPolling(callback: (patientWallet: string, doctorWallet: string, status: ConsentStatus) => void) {
    // Implement polling for consent updates
    const interval = setInterval(async () => {
      // Check for consent updates for cached entries
      for (const [cacheKey] of this.consentCache) {
        const [doctorWallet, patientWalletAddr] = cacheKey.split('-');
        try {
          const freshStatus = await this.fetchConsentStatus(patientWalletAddr, doctorWallet);
          const cachedStatus = this.consentCache.get(cacheKey);
          
          if (cachedStatus && freshStatus.hasAccess !== cachedStatus.hasAccess) {
            this.cacheConsent(cacheKey, freshStatus);
            callback(patientWalletAddr, doctorWallet, freshStatus);
          }
        } catch (error) {
          console.error('Consent polling error:', error);
        }
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }
}

export const consentGate = new ConsentGateService();