import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, 
  Filter, 
  Info,
  Stethoscope,
  Video,
  MessageCircle,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Award,
  Users,
  Zap
} from 'lucide-react';
import axios from '@/lib/axios';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import videoCallService from '@/services/videoCallService';

interface Doctor {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  experience: string;
  rating: number;
  total_reviews: number;
  location?: string;
  verified: boolean;
  services: {
    in_person?: { 
      fee: number; 
      set_by: string; 
      auto_approve: boolean;
      market_position?: 'below_market' | 'at_market' | 'above_market' | 'premium';
      next_available?: string;
    };
    video_call?: { 
      fee: number; 
      set_by: string; 
      auto_approve: boolean;
      market_position?: 'below_market' | 'at_market' | 'above_market' | 'premium';
      next_available?: string;
    };
    chat?: { 
      fee: number; 
      set_by: string; 
      auto_approve: boolean;
      market_position?: 'below_market' | 'at_market' | 'above_market' | 'premium';
      next_available?: string;
    };
  };
  availability_status: 'available' | 'busy' | 'offline';
  response_time: string;
  success_rate: number;
}

interface MarketInsights {
  service_type: string;
  average_price: number;
  price_range: {
    min: number;
    max: number;
  };
  total_doctors: number;
  availability_rate: number;
}

const DoctorSelection: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [priceSort, setPriceSort] = useState('none');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [marketInsights, setMarketInsights] = useState<MarketInsights[]>([]);
  const [showMarketInfo, setShowMarketInfo] = useState(false);
  const [activeView, setActiveView] = useState('grid');
  
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isVideoCallMode = searchParams.get('mode') === 'video-call';

  useEffect(() => {
    fetchDoctors();
    fetchMarketInsights();
  }, []);

  useEffect(() => {
    filterAndSortDoctors();
  }, [doctors, searchTerm, specializationFilter, serviceFilter, priceSort, availabilityFilter, ratingFilter]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/two-tier-pricing/doctors/enhanced-listing');
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      showNotification('Failed to load doctors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketInsights = async () => {
    try {
      const response = await axios.get('/two-tier-pricing/market-insights');
      setMarketInsights(response.data.data);
    } catch (error) {
      console.error('Error fetching market insights:', error);
    }
  };

  const filterAndSortDoctors = () => {
    let filtered = [...doctors];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Specialization filter
    if (specializationFilter !== 'all') {
      filtered = filtered.filter(doctor =>
        doctor.specialization.toLowerCase().includes(specializationFilter.toLowerCase())
      );
    }

    // Service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(doctor =>
        doctor.services[serviceFilter as keyof typeof doctor.services]
      );
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(doctor => {
        if (availabilityFilter === 'available') {
          return doctor.availability_status === 'available';
        } else if (availabilityFilter === 'today') {
          return Object.values(doctor.services).some(service => 
            service?.next_available && 
            new Date(service.next_available).toDateString() === new Date().toDateString()
          );
        }
        return true;
      });
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter);
      filtered = filtered.filter(doctor => doctor.rating >= minRating);
    }

    // Price sorting
    if (priceSort !== 'none') {
      filtered.sort((a, b) => {
        const getLowestPrice = (doctor: Doctor) => {
          const prices = Object.values(doctor.services)
            .filter(service => service)
            .map(service => service!.fee);
          return Math.min(...prices);
        };

        const priceA = getLowestPrice(a);
        const priceB = getLowestPrice(b);

        return priceSort === 'low-high' ? priceA - priceB : priceB - priceA;
      });
    }

    setFilteredDoctors(filtered);
  };

  const handleBookAppointment = (doctorId: string, serviceType: string, fee: number) => {
    if (isVideoCallMode && serviceType === 'video_call') {
      handleStartVideoCall(doctorId);
    } else {
      navigate('/book-appointment', {
        state: {
          doctorId,
          serviceType,
          fee,
          twoTierPricing: true
        }
      });
    }
  };

  const handleStartVideoCall = async (doctorId: string) => {
    if (!user?.walletAddress) {
      showNotification('Please log in to start a video call', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Find the doctor's wallet address
      const doctor = doctors.find(d => d.doctor_id === doctorId);
      if (!doctor) {
        showNotification('Doctor not found', 'error');
        return;
      }

      // For now, we'll use the doctor_id as wallet address
      // In a real system, you'd need to fetch the actual wallet address
      const doctorWallet = doctor.doctor_id;

      // Initiate the video call
      const response = await videoCallService.initiateCall({
        initiatorWallet: user.walletAddress,
        receiverWallet: doctorWallet,
        scheduledTime: new Date().toISOString(),
        durationMinutes: 30
      });

      if (response.success) {
        showNotification('Video call initiated! Waiting for doctor to answer...', 'success');
        
        // Navigate to video call interface or waiting room
        navigate(`/video-call/${response.data.id}`, {
          state: {
            callId: response.data.id,
            doctorName: doctor.doctor_name,
            isInitiator: true
          }
        });
      } else {
        showNotification(response.error || 'Failed to start video call', 'error');
      }
    } catch (error: any) {
      console.error('Video call error:', error);
      showNotification(
        error.response?.data?.message || 'Failed to start video call', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const getUniqueSpecializations = () => {
    const specializations = doctors.map(doctor => doctor.specialization);
    return [...new Set(specializations)];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getAvailabilityBadge = (doctor: Doctor) => {
    switch (doctor.availability_status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case 'busy':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <Clock className="w-3 h-3 mr-1" />
            Busy
          </Badge>
        );
      case 'offline':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMarketPositionIcon = (position?: string) => {
    switch (position) {
      case 'below_market':
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      case 'at_market':
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
      case 'above_market':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'premium':
        return <Star className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getMarketPositionLabel = (position?: string) => {
    switch (position) {
      case 'below_market': return 'Below Market';
      case 'at_market': return 'Market Rate';
      case 'above_market': return 'Above Market';
      case 'premium': return 'Premium';
      default: return '';
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'video_call':
        return <Video className="w-4 h-4 text-blue-600" />;
      case 'chat':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'in_person':
      default:
        return <Stethoscope className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderMarketInsights = () => {
    if (!showMarketInfo || marketInsights.length === 0) return null;

    return (
      <Card className="mb-6 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {marketInsights.map((insight, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium capitalize">
                    {insight.service_type.replace('_', ' ')}
                  </h4>
                  <Badge variant="outline">{insight.total_doctors} doctors</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Price:</span>
                    <span className="font-medium">{formatPrice(insight.average_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price Range:</span>
                    <span className="font-medium">
                      {formatPrice(insight.price_range.min)} - {formatPrice(insight.price_range.max)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Availability:</span>
                    <span className="font-medium">{(insight.availability_rate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Enhanced Doctor Card Component
  const EnhancedDoctorCard: React.FC<{
    doctor: Doctor;
    viewMode: string;
    onBookAppointment: (doctorId: string, serviceType: string, fee: number) => void;
  }> = ({ doctor, viewMode, onBookAppointment }) => {
    const isListView = viewMode === 'list';

    return (
      <Card className={`${isListView ? 'flex' : ''} hover:shadow-lg transition-shadow duration-200`}>
        <CardContent className={`${isListView ? 'flex w-full items-center' : ''} p-6`}>
          <div className={`${isListView ? 'flex-1' : ''} space-y-4`}>
            {/* Doctor Header */}
            <div className={`${isListView ? 'flex items-center justify-between' : ''}`}>
              <div className={`${isListView ? 'flex items-center space-x-4' : 'space-y-2'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{doctor.doctor_name}</h3>
                    {doctor.verified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Award className="w-4 h-4 text-blue-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified Doctor</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-gray-600">{doctor.specialization}</p>
                  {doctor.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {doctor.location}
                    </div>
                  )}
                </div>
                
                {!isListView && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="ml-1 text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 ml-1">({doctor.total_reviews})</span>
                      </div>
                      {getAvailabilityBadge(doctor)}
                    </div>
                  </div>
                )}
              </div>

              {isListView && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="ml-1 text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500 ml-1">({doctor.total_reviews})</span>
                  </div>
                  {getAvailabilityBadge(doctor)}
                </div>
              )}
            </div>

            {/* Doctor Stats */}
            <div className={`${isListView ? 'flex items-center space-x-6' : 'grid grid-cols-2 gap-2'} text-sm text-gray-600`}>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {doctor.experience}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {doctor.response_time}
              </div>
              {!isListView && (
                <>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                    {(doctor.success_rate * 100).toFixed(0)}% success
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-purple-600" />
                    {Object.values(doctor.services).filter(s => s?.auto_approve).length} instant
                  </div>
                </>
              )}
            </div>

            {/* Services */}
            <div className={`${isListView ? 'flex space-x-4' : 'space-y-3'}`}>
              {Object.entries(doctor.services).map(([serviceType, service]) => {
                if (!service) return null;

                return (
                  <div key={serviceType} className={`${isListView ? 'flex-1' : ''} p-3 border rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getServiceTypeIcon(serviceType)}
                        <span className="font-medium capitalize">
                          {serviceType.replace('_', ' ')}
                        </span>
                        {service.market_position && getMarketPositionIcon(service.market_position)}
                      </div>
                      {service.auto_approve && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Instant
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(service.fee)}
                        </span>
                        {service.market_position && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  {getMarketPositionLabel(service.market_position)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Price position relative to market average</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      {service.next_available && (
                        <div className="text-xs text-gray-500">
                          Next: {new Date(service.next_available).toLocaleDateString()} at{' '}
                          {new Date(service.next_available).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                      
                      <Button
                        onClick={() => onBookAppointment(doctor.doctor_id, serviceType, service.fee)}
                        className="w-full mt-2"
                        size="sm"
                        disabled={isVideoCallMode && serviceType !== 'video_call'}
                      >
                        {isVideoCallMode && serviceType === 'video_call' 
                          ? 'Start Video Call' 
                          : `Book ${service.auto_approve ? 'Instantly' : 'Appointment'}`
                        }
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          {isVideoCallMode && <Video className="w-8 h-8 text-blue-600" />}
          {isVideoCallMode ? 'Start Video Call' : 'Choose Your Doctor'}
        </h1>
        <p className="text-gray-600">
          {isVideoCallMode 
            ? 'Select a doctor to start an instant video consultation'
            : 'Select from our two-tier pricing system: Standard (400 ETB) or Premium (Doctor-set pricing)'
          }
        </p>
      </div>

      {/* Pricing System Explanation */}
      <Card className="mb-8 border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            Two-Tier Pricing System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Standard Tier</h3>
                <p className="text-sm text-gray-600">
                  Fixed 400 ETB for in-person consultations with all doctors
                </p>
                <Badge variant="secondary" className="mt-1">
                  Requires Doctor Approval
                </Badge>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Video className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Premium Tier</h3>
                <p className="text-sm text-gray-600">
                  Doctor-set pricing (2,000-20,000 ETB) for video calls and chat
                </p>
                <Badge variant="default" className="mt-1 bg-purple-100 text-purple-800">
                  Instant Confirmation
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Find Your Perfect Doctor
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMarketInfo(!showMarketInfo)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showMarketInfo ? 'Hide' : 'Show'} Market Info
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primary Filters */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search doctors, specializations, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {getUniqueSpecializations().map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="in_person">
                    <div className="flex items-center">
                      <Stethoscope className="w-4 h-4 mr-2" />
                      In-Person
                    </div>
                  </SelectItem>
                  <SelectItem value="video_call">
                    <div className="flex items-center">
                      <Video className="w-4 h-4 mr-2" />
                      Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="chat">
                    <div className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Filters */}
            <div className="grid md:grid-cols-4 gap-4">
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  <SelectItem value="available">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Available Now
                    </div>
                  </SelectItem>
                  <SelectItem value="today">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Available Today
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceSort} onValueChange={setPriceSort}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sorting</SelectItem>
                  <SelectItem value="low-high">Price: Low to High</SelectItem>
                  <SelectItem value="high-low">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activeView} onValueChange={setActiveView}>
                <SelectTrigger>
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      {renderMarketInsights()}

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Showing {filteredDoctors.length} of {doctors.length} doctors
          </p>
          {filteredDoctors.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                {filteredDoctors.filter(d => d.availability_status === 'available').length} available now
              </span>
              <span className="flex items-center">
                <Zap className="w-4 h-4 mr-1 text-blue-600" />
                {filteredDoctors.filter(d => Object.values(d.services).some(s => s?.auto_approve)).length} instant booking
              </span>
              <span className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-yellow-600" />
                {filteredDoctors.filter(d => d.rating >= 4.5).length} highly rated
              </span>
            </div>
          )}
        </div>
        
        {filteredDoctors.length > 0 && (
          <div className="text-sm text-gray-500">
            Average price: {formatPrice(
              filteredDoctors.reduce((sum, doctor) => {
                const prices = Object.values(doctor.services)
                  .filter(service => service)
                  .map(service => service!.fee);
                return sum + (prices.length > 0 ? Math.min(...prices) : 0);
              }, 0) / filteredDoctors.length
            )}
          </div>
        )}
      </div>

      {/* Enhanced Doctor Cards */}
      <div className={activeView === 'grid' 
        ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' 
        : 'space-y-4'
      }>
        {filteredDoctors.map((doctor) => (
          <EnhancedDoctorCard
            key={doctor.doctor_id}
            doctor={doctor}
            viewMode={activeView}
            onBookAppointment={handleBookAppointment}
          />
        ))}
      </div>

      {filteredDoctors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No doctors found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorSelection;