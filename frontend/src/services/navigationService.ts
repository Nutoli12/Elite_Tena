/**
 * Navigation Service for Quick Actions
 * Centralizes all navigation logic for quick action buttons
 */

import { useNavigate } from 'react-router-dom';

// Define our own NavigateFunction type since it might not be exported in newer versions
type NavigateFunction = ReturnType<typeof useNavigate>;

export interface QuickAction {
  name: string;
  icon: string;
  href?: string;
  action?: () => void;
  description?: string;
  color?: string;
  disabled?: boolean;
}

export class NavigationService {
  private navigate: NavigateFunction;

  constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  // Patient Quick Actions
  getPatientQuickActions(): QuickAction[] {
    return [
      {
        name: 'Book Appointment',
        icon: '📅',
        action: () => this.navigate('/appointments'),
        description: 'Schedule a new appointment'
      },
      {
        name: 'View Records',
        icon: '📁',
        action: () => this.navigate('/medical-records'),
        description: 'Access your medical records'
      },
      {
        name: 'Prescriptions',
        icon: '💊',
        action: () => this.navigate('/prescriptions'),
        description: 'Manage your prescriptions'
      },
      {
        name: 'Lab Results',
        icon: '🧪',
        action: () => this.navigate('/lab-results'),
        description: 'View lab test results'
      }
    ];
  }

  // Doctor Quick Actions
  getDoctorQuickActions(): QuickAction[] {
    return [
      {
        name: 'View Appointments',
        icon: '📅',
        action: () => this.navigate('/appointments'),
        description: 'Manage your appointments'
      },
      {
        name: 'Medical Records',
        icon: '📁',
        action: () => this.navigate('/medical-records'),
        description: 'Access patient records'
      },
      {
        name: 'Patient Access',
        icon: '🛡️',
        action: () => this.navigate('/doctor/consent'),
        description: 'Manage patient consent'
      },
      {
        name: 'Issue Prescription',
        icon: '💊',
        action: () => this.navigate('/prescriptions'),
        description: 'Create prescriptions'
      }
    ];
  }

  // Pharmacy Quick Actions
  getPharmacyQuickActions(): QuickAction[] {
    return [
      {
        name: 'Scan QR Code',
        icon: '📱',
        action: () => this.handlePharmacyAction('scan'),
        description: 'Scan prescription QR code',
        color: 'purple'
      },
      {
        name: 'Accessible Rx',
        icon: '🛡️',
        action: () => this.handlePharmacyAction('accessible'),
        description: 'View accessible prescriptions',
        color: 'blue'
      },
      {
        name: 'Check Inventory',
        icon: '📦',
        action: () => this.navigate('/prescriptions'),
        description: 'Manage inventory'
      },
      {
        name: 'Reports',
        icon: '📊',
        action: () => this.navigate('/prescriptions'),
        description: 'View reports'
      }
    ];
  }

  // Lab Technician Quick Actions
  getLabQuickActions(): QuickAction[] {
    return [
      {
        name: 'Upload Results',
        icon: '📤',
        action: () => this.navigate('/lab-results'),
        description: 'Upload test results'
      },
      {
        name: 'View Tests',
        icon: '🧪',
        action: () => this.navigate('/lab-results'),
        description: 'View all tests'
      },
      {
        name: 'Patient Samples',
        icon: '🩸',
        action: () => this.navigate('/lab-results'),
        description: 'Manage samples'
      },
      {
        name: 'Reports',
        icon: '📊',
        action: () => this.navigate('/lab-results'),
        description: 'Generate reports'
      }
    ];
  }

  // Admin Quick Actions
  getAdminQuickActions(): QuickAction[] {
    return [
      {
        name: 'Register Staff',
        icon: '👥',
        action: () => this.navigate('/admin/staff'),
        description: 'Add doctors, lab techs, pharmacists'
      },
      {
        name: 'Manage Users',
        icon: '👤',
        action: () => this.navigate('/admin/users'),
        description: 'View and manage all users'
      },
      {
        name: 'System Stats',
        icon: '📊',
        action: () => this.navigate('/admin/analytics'),
        description: 'View detailed analytics'
      },
      {
        name: 'AdminJS Panel',
        icon: '🛡️',
        action: () => window.open('http://localhost:3003/admin', '_blank'),
        description: 'Database management tool'
      }
    ];
  }

  // Handle special pharmacy actions
  private handlePharmacyAction(actionType: 'scan' | 'accessible') {
    // These actions will trigger state changes in the pharmacy dashboard
    // We'll emit custom events that the dashboard can listen to
    const event = new CustomEvent('pharmacyAction', {
      detail: { action: actionType }
    });
    window.dispatchEvent(event);
  }

  // Handle prescription access actions
  handlePrescriptionAccess(action: 'quickApprove' | 'manualGrant' | 'qrCode', prescription: any) {
    const event = new CustomEvent('prescriptionAccessAction', {
      detail: { action, prescription }
    });
    window.dispatchEvent(event);
  }

  // Generic navigation helper
  navigateTo(path: string) {
    this.navigate(path);
  }

  // External link helper
  openExternal(url: string) {
    window.open(url, '_blank');
  }
}

// Hook for using navigation service
export const useNavigationService = (navigate: NavigateFunction) => {
  return new NavigationService(navigate);
};