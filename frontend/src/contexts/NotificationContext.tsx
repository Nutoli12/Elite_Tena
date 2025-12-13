import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationModal } from '../components/modals/NotificationModal';

interface NotificationState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface NotificationContextType {
  showNotification: (
    message: string, 
    type?: 'success' | 'error' | 'warning' | 'info',
    options?: {
      title?: string;
      autoClose?: boolean;
      autoCloseDelay?: number;
    }
  ) => void;
  hideNotification: () => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    message: '',
    autoClose: true,
    autoCloseDelay: 5000
  });

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    options: {
      title?: string;
      autoClose?: boolean;
      autoCloseDelay?: number;
    } = {}
  ) => {
    setNotification({
      isOpen: true,
      type,
      message,
      title: options.title,
      autoClose: options.autoClose ?? true,
      autoCloseDelay: options.autoCloseDelay ?? 5000
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Convenience methods
  const showSuccess = (message: string, title?: string) => {
    showNotification(message, 'success', { title });
  };

  const showError = (message: string, title?: string) => {
    showNotification(message, 'error', { 
      title, 
      autoClose: false // Errors should not auto-close
    });
  };

  const showWarning = (message: string, title?: string) => {
    showNotification(message, 'warning', { title });
  };

  const showInfo = (message: string, title?: string) => {
    showNotification(message, 'info', { title });
  };

  const contextValue: NotificationContextType = {
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.autoClose}
        autoCloseDelay={notification.autoCloseDelay}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};