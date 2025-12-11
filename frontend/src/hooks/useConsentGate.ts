import { useState, useEffect, useCallback } from 'react';
import { consentGate } from '../services/consentGate';
import type { ConsentGateResult, ConsentStatus } from '../services/consentGate';
import { useAuth } from '../contexts/AuthContext';

interface UseConsentGateOptions {
  patientWallet?: string;
  autoCheck?: boolean;
  onConsentGranted?: (status: ConsentStatus) => void;
  onConsentRevoked?: (status: ConsentStatus) => void;
}

export const useConsentGate = (options: UseConsentGateOptions = {}) => {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { patientWallet, autoCheck = true, onConsentGranted, onConsentRevoked } = options;

  /**
   * Check if doctor can perform specific action on patient
   */
  const checkConsent = useCallback(async (
    action: 'viewRecords' | 'createRecord' | 'prescribe' | 'orderLab' | 'consultation',
    targetPatientWallet?: string
  ): Promise<ConsentGateResult> => {
    if (!user?.walletAddress) {
      return {
        allowed: false,
        reason: 'Doctor not authenticated',
        action: 'show_error'
      };
    }

    const patientAddr = targetPatientWallet || patientWallet;
    if (!patientAddr) {
      return {
        allowed: false,
        reason: 'Patient wallet address required',
        action: 'show_error'
      };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await consentGate.checkConsent(
        patientAddr,
        user.walletAddress,
        action
      );

      if (result.consentStatus) {
        setConsentStatus(result.consentStatus);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Consent check failed';
      setError(errorMsg);
      return {
        allowed: false,
        reason: errorMsg,
        action: 'show_error'
      };
    } finally {
      setLoading(false);
    }
  }, [user?.walletAddress, patientWallet]);

  /**
   * Request consent from patient
   */
  const requestConsent = useCallback(async (
    targetPatientWallet?: string,
    permissions: string[] = ['viewMedicalHistory', 'createRecords'],
    reason: string = 'Medical consultation access'
  ) => {
    if (!user?.walletAddress) {
      throw new Error('Doctor not authenticated');
    }

    const patientAddr = targetPatientWallet || patientWallet;
    if (!patientAddr) {
      throw new Error('Patient wallet address required');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await consentGate.requestConsent(
        patientAddr,
        user.walletAddress,
        permissions,
        reason
      );

      if (!result.success) {
        setError(result.message);
        throw new Error(result.message);
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [user?.walletAddress, patientWallet]);

  /**
   * Request emergency override
   */
  const requestEmergencyOverride = useCallback(async (
    justification: string,
    targetPatientWallet?: string
  ) => {
    if (!user?.walletAddress) {
      throw new Error('Doctor not authenticated');
    }

    const patientAddr = targetPatientWallet || patientWallet;
    if (!patientAddr) {
      throw new Error('Patient wallet address required');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await consentGate.checkEmergencyOverride(
        patientAddr,
        user.walletAddress,
        justification
      );

      if (!result.allowed) {
        setError(result.message);
        throw new Error(result.message);
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [user?.walletAddress, patientWallet]);

  /**
   * Clear consent cache
   */
  const clearCache = useCallback(() => {
    if (user?.walletAddress && patientWallet) {
      const cacheKey = `${user.walletAddress}-${patientWallet}`;
      consentGate.clearCache(cacheKey);
    } else {
      consentGate.clearCache();
    }
  }, [user?.walletAddress, patientWallet]);

  /**
   * Refresh consent status
   */
  const refreshConsent = useCallback(async () => {
    if (patientWallet) {
      clearCache();
      await checkConsent('viewRecords');
    }
  }, [patientWallet, clearCache, checkConsent]);

  // Auto-check consent on mount if enabled
  useEffect(() => {
    if (autoCheck && patientWallet && user?.walletAddress) {
      checkConsent('viewRecords');
    }
  }, [autoCheck, patientWallet, user?.walletAddress, checkConsent]);

  // Setup real-time consent updates
  useEffect(() => {
    if (!user?.walletAddress || !patientWallet) return;

    const cleanup = consentGate.onConsentUpdate((updatedPatientWallet, doctorWallet, status) => {
      if (updatedPatientWallet === patientWallet && doctorWallet === user.walletAddress) {
        const previousStatus = consentStatus;
        setConsentStatus(status);

        // Trigger callbacks
        if (status.hasAccess && !previousStatus?.hasAccess && onConsentGranted) {
          onConsentGranted(status);
        } else if (!status.hasAccess && previousStatus?.hasAccess && onConsentRevoked) {
          onConsentRevoked(status);
        }
      }
    });

    return cleanup;
  }, [user?.walletAddress, patientWallet, consentStatus, onConsentGranted, onConsentRevoked]);

  return {
    consentStatus,
    loading,
    error,
    checkConsent,
    requestConsent,
    requestEmergencyOverride,
    clearCache,
    refreshConsent,
    hasAccess: consentStatus?.hasAccess || false,
    patientName: consentStatus?.patientName
  };
};