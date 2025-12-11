import { useState, useCallback } from 'react';

export interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string
  ) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    showAlert('success', title, message);
  }, [showAlert]);

  const showError = useCallback((title: string, message: string) => {
    showAlert('error', title, message);
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string) => {
    showAlert('info', title, message);
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert('warning', title, message);
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    alertState,
    showAlert,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideAlert
  };
};