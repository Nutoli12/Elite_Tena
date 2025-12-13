import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Video, 
  MessageCircle, 
  Clock, 
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DoctorPricingCardProps {
  doctor: {
    doctor_id: string;
    doctor_name: string;
    specialization: string;
    experience: string;
    services: {
      in_person?: { fee: number; set_by: string; auto_approve: boolean };
      video_call?: { fee: number; set_by: string; auto_approve: boolean };
      chat?: { fee: number; set_by: string; auto_approve: boolean };
    };
  };
  onBookAppointment: (doctorId: string, serviceType: string, fee: number) => void;
}

const DoctorPricingCard: React.FC<DoctorPricingCardProps> = ({ 
  doctor, 
  onBookAppointment 
}) => {
  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'in_person': return <Stethoscope className="w-5 h-5" />;
      case 'video_call': return <Video className="w-5 h-5" />;
      case 'chat': return <MessageCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  const getServiceLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'in_person': return 'In-Person Consultation';
      case 'video_call': return 'Video Call';
      case 'chat': return 'Chat Consultation';
      default: return serviceType;
    }
  };

  const getServiceTier = (service: any) => {
    return service.set_by === 'admin' ? 'standard' : 'premium';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {doctor.doctor_name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {doctor.specialization}
            </p>
            <div className="flex items-center mt-2">
              <Clock className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-500">
                {doctor.experience} experience
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600 ml-1">4.8</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(doctor.services).map(([serviceType, service]) => {
          if (!service) return null;
          
          const tier = getServiceTier(service);
          const isStandard = tier === 'standard';
          
          return (
            <div 
              key={serviceType}
              className={`p-4 rounded-lg border ${
                isStandard 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-purple-200 bg-purple-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getServiceIcon(serviceType)}
                  <span className="font-medium text-gray-900">
                    {getServiceLabel(serviceType)}
                  </span>
                </div>
                <Badge 
                  variant={isStandard ? "secondary" : "default"}
                  className={
                    isStandard 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }
                >
                  {isStandard ? 'Standard' : 'Premium'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(service.fee)}
                  </div>
                  {service.auto_approve && (
                    <div className="flex items-center mt-1">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">
                        Instant Confirmation
                      </span>
                    </div>
                  )}
                  {!service.auto_approve && (
                    <div className="flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-xs text-orange-600">
                        Requires Approval
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => onBookAppointment(
                    doctor.doctor_id, 
                    serviceType, 
                    service.fee
                  )}
                  size="sm"
                  className={
                    isStandard
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }
                >
                  Book Now
                </Button>
              </div>

              {/* Service tier explanation */}
              <div className="mt-3 text-xs text-gray-500">
                {isStandard ? (
                  <>Fixed system price • Doctor approval required</>
                ) : (
                  <>Doctor-set price • {service.auto_approve ? 'Instant booking' : 'Manual approval'}</>
                )}
              </div>
            </div>
          );
        })}

        {/* Pricing comparison note */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Standard: Fixed 400 ETB for all doctors</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span>Premium: Doctor-set pricing (2,000-20,000 ETB)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorPricingCard;