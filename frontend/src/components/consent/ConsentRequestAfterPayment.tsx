import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  User, 
  Calendar, 
  FileText,
  Eye,
  Edit,
  Video,
  MessageSquare,
  Activity,
  AlertCircle,
  X
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';

interface ConsentRequestAfterPaymentProps {
  appointmentId: string;
  patientWallet: string;
  doctorName?: string;
  appointmentDate?: string;
  serviceType?: string;
  onConsentGranted?: () => void;
  onConsentDenied?: () => void;
}

interface ConsentRequest {
  id: string;
  doctorWalletAddress: string;
  permissions: string[];
  purpose: string;
  status: string;
  requestedAt: string;
  expiresAt: string;
  requestReason: string;
  doctorDetails?: {
    name: string;
    specialization: string;
  };
}

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

const ConsentRequestAfterPayment: React.FC<ConsentRequestAfterPaymentProps> = ({
  appointmentId,
  patientWallet,
  doctorName,
  appointmentDate,
  serviceType = 'inPerson',
  onConsentGranted,
  onConsentDenied
}) => {
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { showNotification } = useNotification();

  // Define available permissions based on service type
  const availablePermissions: Permission[] = [
    {
      id: 'viewMedicalHistory',
      name: 'View Medical History',
      description: 'Access your previous medical records and history',
      icon: <FileText className="h-4 w-4" />,
      required: true
    },
    {
      id: 'createRecords',
      name: 'Create Medical Records',
      description: 'Create new medical records from this consultation',
      icon: <Edit className="h-4 w-4" />,
      required: true
    },
    {
      id: 'viewVitalSigns',
      name: 'View Vital Signs',
      description: 'Access your vital signs and measurements',
      icon: <Activity className="h-4 w-4" />,
      required: false
    },
    ...(serviceType === 'videoCall' ? [
      {
        id: 'videoConsultation',
        name: 'Video Consultation',
        description: 'Conduct video consultation session',
        icon: <Video className="h-4 w-4" />,
        required: true
      },
      {
        id: 'recordSession',
        name: 'Record Session',
        description: 'Record consultation session for medical records',
        icon: <Video className="h-4 w-4" />,
        required: false
      }
    ] : []),
    ...(serviceType === 'chat' ? [
      {
        id: 'chatConsultation',
        name: 'Chat Consultation',
        description: 'Conduct text-based consultation',
        icon: <MessageSquare className="h-4 w-4" />,
        required: true
      },
      {
        id: 'messageHistory',
        name: 'Message History',
        description: 'Access chat history for medical records',
        icon: <MessageSquare className="h-4 w-4" />,
        required: false
      }
    ] : []),
    ...(serviceType === 'inPerson' ? [
      {
        id: 'physicalExamination',
        name: 'Physical Examination',
        description: 'Conduct physical examination and assessment',
        icon: <User className="h-4 w-4" />,
        required: true
      }
    ] : [])
  ];

  useEffect(() => {
    fetchConsentRequest();
    const interval = setInterval(fetchConsentRequest, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [appointmentId, patientWallet]);

  useEffect(() => {
    // Auto-select required permissions
    const requiredPermissions = availablePermissions
      .filter(p => p.required)
      .map(p => p.id);
    setSelectedPermissions(requiredPermissions);
  }, [serviceType]);

  const fetchConsentRequest = async () => {
    try {
      const response = await axios.get(`/consent/pending/${patientWallet}`);
      
      if (response.data.success) {
        // Find consent request for this appointment
        const appointmentConsent = response.data.data.find(
          (consent: ConsentRequest) => consent.appointmentId === appointmentId
        );
        
        if (appointmentConsent) {
          setConsentRequest(appointmentConsent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch consent request:', error);
      setError('Failed to load consent request');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    
    // Don't allow toggling required permissions
    if (permission?.required) {
      showNotification('This permission is required for the consultation', 'warning');
      return;
    }

    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const grantConsent = async () => {
    if (!consentRequest) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`/consent/grant/${consentRequest.id}`, {
        patientWalletAddress: patientWallet,
        permissions: selectedPermissions
      });

      if (response.data.success) {
        showNotification('Consent granted successfully! Doctor can now start consultation.', 'success');
        onConsentGranted?.();
      }
    } catch (error: any) {
      console.error('Failed to grant consent:', error);
      const errorMessage = error.response?.data?.error || 'Failed to grant consent';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const denyConsent = async () => {
    if (!consentRequest) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`/consent/revoke/${consentRequest.id}`, {
        patientWalletAddress: patientWallet
      });

      if (response.data.success) {
        showNotification('Consent denied. Appointment cancelled.', 'info');
        onConsentDenied?.();
      }
    } catch (error: any) {
      console.error('Failed to deny consent:', error);
      const errorMessage = error.response?.data?.error || 'Failed to deny consent';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'videoCall':
        return <Video className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'inPerson':
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getServiceTypeDescription = (type: string) => {
    switch (type) {
      case 'videoCall':
        return 'Video Consultation';
      case 'chat':
        return 'Chat Consultation';
      case 'inPerson':
      default:
        return 'In-Person Consultation';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading consent request...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!consentRequest) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p>Waiting for doctor to request consultation consent...</p>
            <p className="text-sm mt-1">This usually happens automatically after payment confirmation.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Shield className="h-5 w-5" />
          Consultation Consent Required
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
            PAYMENT CONFIRMED
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Consultation Details */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Payment Successful</span>
            </div>
            <div className="text-sm text-green-700">
              Your payment has been confirmed. The doctor is now requesting your consent to begin the consultation.
            </div>
          </div>

          {/* Appointment Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span>Doctor: {doctorName || consentRequest.doctorDetails?.name || 'Dr. Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              {getServiceTypeIcon(serviceType)}
              <span>Type: {getServiceTypeDescription(serviceType)}</span>
            </div>
            {appointmentDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Date: {new Date(appointmentDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Expires: {new Date(consentRequest.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {/* Consent Purpose */}
          <div>
            <h4 className="font-medium mb-2">Purpose of Access:</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {consentRequest.purpose}
            </p>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Requested Permissions:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>

            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <div
                  key={permission.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    selectedPermissions.includes(permission.id)
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200'
                  } ${permission.required ? 'opacity-75' : 'cursor-pointer'}`}
                  onClick={() => !permission.required && handlePermissionToggle(permission.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                    disabled={permission.required}
                    className="text-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {permission.icon}
                    <div>
                      <div className="font-medium text-sm">
                        {permission.name}
                        {permission.required && (
                          <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                            REQUIRED
                          </Badge>
                        )}
                      </div>
                      {showDetails && (
                        <div className="text-xs text-gray-600 mt-1">
                          {permission.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2 text-yellow-800">
              <Shield className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium mb-1">Your Privacy is Protected</div>
                <div>
                  • You can revoke access at any time
                  • Access expires automatically after consultation
                  • All access is logged for your security
                  • Only selected permissions will be granted
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={grantConsent}
              disabled={processing || selectedPermissions.length === 0}
              className="flex-1"
              size="lg"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Granting Consent...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Grant Consent & Start Consultation
                </div>
              )}
            </Button>

            <Button
              onClick={denyConsent}
              variant="outline"
              disabled={processing}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Deny
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Selected Permissions Summary */}
          {selectedPermissions.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Selected permissions ({selectedPermissions.length}):</span>
              <span className="ml-1">
                {selectedPermissions
                  .map(id => availablePermissions.find(p => p.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsentRequestAfterPayment;