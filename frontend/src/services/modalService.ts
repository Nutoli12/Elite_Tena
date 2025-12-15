import { createRoot } from 'react-dom/client';
import React from 'react';
import { AlertModal } from '../components/modals/AlertModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { SuccessModal } from '../components/modals/SuccessModal';
import { ErrorModal } from '../components/modals/ErrorModal';
import { InfoModal } from '../components/modals/InfoModal';
import { WarningModal } from '../components/modals/WarningModal';

interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

interface SuccessOptions {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void | Promise<void>;
  showConfetti?: boolean;
  loading?: boolean;
}

interface ErrorOptions {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  retryText?: string;
  showRetry?: boolean;
  loading?: boolean;
}

class ModalService {
  private createModalContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'modal-container';
    document.body.appendChild(container);
    return container;
  }

  private renderModal(
    component: React.ReactElement,
    container: HTMLDivElement
  ): Promise<void> {
    return new Promise((resolve) => {
      const root = createRoot(container);
      
      const handleClose = () => {
        root.unmount();
        document.body.removeChild(container);
        resolve();
      };

      const modalWithClose = React.cloneElement(component, {
        isOpen: true,
        onClose: handleClose,
      } as any);

      root.render(modalWithClose);
    });
  }

  // Alert Modal (replaces alert())
  async showAlert(
    type: 'success' | 'error' | 'info' | 'warning',
    options: AlertOptions
  ): Promise<void> {
    const container = this.createModalContainer();
    
    const modal = React.createElement(AlertModal, {
      type,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      loading: options.loading,
      isOpen: true,
      onClose: () => {},
    });

    return this.renderModal(modal, container);
  }

  // Success Modal
  async showSuccess(options: SuccessOptions): Promise<void> {
    const container = this.createModalContainer();
    
    const modal = React.createElement(SuccessModal, {
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      showConfetti: options.showConfetti,
      loading: options.loading,
      isOpen: true,
      onClose: () => {},
    });

    return this.renderModal(modal, container);
  }

  // Error Modal
  async showError(options: ErrorOptions): Promise<void> {
    const container = this.createModalContainer();
    
    const modal = React.createElement(ErrorModal, {
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      onRetry: options.onRetry,
      retryText: options.retryText,
      showRetry: options.showRetry,
      loading: options.loading,
      isOpen: true,
      onClose: () => {},
    });

    return this.renderModal(modal, container);
  }

  // Info Modal
  async showInfo(options: AlertOptions): Promise<void> {
    const container = this.createModalContainer();
    
    const modal = React.createElement(InfoModal, {
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      loading: options.loading,
      isOpen: true,
      onClose: () => {},
    });

    return this.renderModal(modal, container);
  }

  // Warning Modal
  async showWarning(options: AlertOptions): Promise<void> {
    const container = this.createModalContainer();
    
    const modal = React.createElement(WarningModal, {
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      loading: options.loading,
      isOpen: true,
      onClose: () => {},
    });

    return this.renderModal(modal, container);
  }

  // Confirm Modal (replaces confirm())
  async showConfirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const container = this.createModalContainer();
      const root = createRoot(container);
      
      const handleClose = () => {
        root.unmount();
        document.body.removeChild(container);
      };

      const handleConfirm = async () => {
        try {
          await options.onConfirm();
          resolve(true);
        } catch (error) {
          console.error('Confirm action failed:', error);
          resolve(false);
        } finally {
          handleClose();
        }
      };

      const handleCancel = () => {
        if (options.onCancel) {
          options.onCancel();
        }
        resolve(false);
        handleClose();
      };

      const modal = React.createElement(ConfirmModal, {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        onConfirm: handleConfirm,
        type: options.type,
        loading: options.loading,
        isOpen: true,
        onClose: handleCancel,
      });

      root.render(modal);
    });
  }

  // Convenience methods that match the old alert() and confirm() API
  async alert(message: string, title: string = 'Alert'): Promise<void> {
    return this.showAlert('info', { title, message });
  }

  async confirm(
    message: string, 
    title: string = 'Confirm',
    onConfirm: () => void | Promise<void> = () => {}
  ): Promise<boolean> {
    return this.showConfirm({
      title,
      message,
      onConfirm,
      type: 'info'
    });
  }

  // Quick success/error methods
  async success(
    message: string, 
    title: string = 'Success!',
    showConfetti: boolean = true
  ): Promise<void> {
    return this.showSuccess({ title, message, showConfetti });
  }

  async error(
    message: string, 
    title: string = 'Error',
    showRetry: boolean = false,
    onRetry?: () => void | Promise<void>
  ): Promise<void> {
    return this.showError({ title, message, showRetry, onRetry });
  }

  async warning(message: string, title: string = 'Warning'): Promise<void> {
    return this.showWarning({ title, message });
  }

  async info(message: string, title: string = 'Information'): Promise<void> {
    return this.showInfo({ title, message });
  }
}

// Create singleton instance
export const Modal = new ModalService();

// Export for backward compatibility
export default Modal;