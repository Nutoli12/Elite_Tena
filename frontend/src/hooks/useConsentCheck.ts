import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

interface ConsentCheckResult {
  hasAccess: boolean;
  loading: boolean;
  consent: any | null;
  checkAccess: () => Promise<void>;
  requestAccess: () => void;
}

export const useConsentCheck = (
  patientWalletAddress: string | undefined,
  action?: string
): ConsentCheckResult => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<any | null>(null);

  const checkAccess = async () => {
    if (!user?.walletAddress || !patientWalletAddress) {
      setLoading(false);
      return;
    }

    // If user is viewing their own records, they always have access
    if (user.walletAddress === patientWalletAddress || user.role === 'patient') {
      setHasAccess(true);
      setLoading(false);
      return;
    }

    // For doctors, check consent
    if (user.role === 'doctor') {
      try {
        const params = action ? { action } : {};
        const response = await axios.get(
          `/consent/check/${user.walletAddress}/${patientWalletAddress}`,
          { params }
        );

        setHasAccess(response.data.hasAccess);
        setConsent(response.data.consent);
      } catch (error) {
        console.error('Failed to check consent:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const requestAccess = () => {
    // This will be handled by the RequestAccessModal
    // Just a placeholder for now
    console.log('Request access for:', patientWalletAddress);
  };

  useEffect(() => {
    checkAccess();
  }, [user?.walletAddress, patientWalletAddress, action]);

  return {
    hasAccess,
    loading,
    consent,
    checkAccess,
    requestAccess
  };
};
