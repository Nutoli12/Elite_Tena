import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Video,
  AlertCircle,
  Zap,
  Eye,
  RefreshCw,
  Filter,
  ArrowRight,
  Info,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface PendingApproval {
  id: string;
  patientName: string;
  patientWallet: string;
  appointmentDate: string;
  serviceType: 'inPerson' | 'videoCall' | 'chat';
  reason: string;
  fee: number;
  duration: number;
  createdAt: string;
  priority: 'routine' | 'urgent' | 'emergency';
  approvalMethod: 'auto' | 'manual';
  pricingTier: 'standard' | 'premium';
  autoApprovalEligible: boolean;
  priceMatch: boolean;
  doctorPrice?: number;
  marketRate?: number;
  alternativeSlots?: {
    date: string;
    time: string;
    available: boolean;
  }[];
}

interface ApprovalStats {
  total_pending: number;
  auto_eligible: number;
  manual_required: number;
  premium_bookings: number;
  standard_bookings: number;
  average_response_time: number;
  conversion_rate: number;
}

const AppointmentApprovalQueue: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});
  const [showRejectionForm, setShowRejectionForm] = useState<string | null>(null);
  const [showAlternativeSlots, setShowAlternativeSlots] = useState<string | null>(null);
  const [selectedAlternativeSlot, setSelectedAlternativeSlot] = useState<{ [key: string]: string }>({});
  const [filterBy, setFilterBy] = useState<'all' | 'auto' | 'manual' | 'premium' | 'standard'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'fee'>('priority');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPendingApprovals();
      fetchApprovalStats();
      
      // Poll for new approvals every 30 seconds
      const interval = setInterval(() => {
        fetchPendingApprovals();
        fetchApprovalStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.walletAddress]);

  const fetchPendingApprovals = async () => {
    if (!user?.walletAddress) return;

    try {
      const response = await axios.get(`/two-tier-pricing/doctor/pending-approvals`);
      
      if (response.data.success) {
        setPendingApprovals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const response = await axios.get('/api/two-tier-pricing/doctor/approval-stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch approval stats:', error);
    }
  };

  const handleApproval = async (appointmentId: string, action: 'approve' | 'reject' | 'reschedule') => {
    if (!user?.walletAddress) return;

    setProcessing(appointmentId);

    try {
      const payload: any = {
        action,
        doctorWallet: user.walletAddress
      };

      if (action === 'reject') {
        const reason = rejectionReason[appointmentId];
        if (!reason?.trim()) {
          showNotification('Please provide a reason for rejection', 'error');
          setProcessing(null);
          return;
        }
        payload.reason = reason.trim();
      } else if (action === 'reschedule') {
        const alternativeSlot = selectedAlternativeSlot[appointmentId];
        if (!alternativeSlot) {
          showNotification('Please select an alternative time slot', 'error');
          setProcessing(null);
          return;
        }
        payload.alternativeSlot = alternativeSlot;
      }

      const response = await axios.post(`/two-tier-pricing/appointment/${appointmentId}/approval`, payload);

      if (response.data.success) {
        // Remove from pending list
        setPendingApprovals(prev => prev.filter(app => app.id !== appointmentId));
        
        // Clear forms
        setShowRejectionForm(null);
        setShowAlternativeSlots(null);
        setRejectionReason(prev => {
          const updated = { ...prev };
          delete updated[appointmentId];
          return updated;
        });
        setSelectedAlternativeSlot(prev => {
          const updated = { ...prev };
          delete updated[appointmentId];
          return updated;
        });

        // Show success message
        const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'rescheduled';
        showNotification(`Appointment ${actionText} successfully`, 'success');
        
        // Refresh stats
        fetchApprovalStats();
      }
    } catch (error: any) {
      console.error(`Appointment ${action} failed:`, error);
      showNotification(
        error.response?.data?.error || `Failed to ${action} appointment`,
        'error'
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkAutoApprove = async () => {
    const autoEligible = filteredApprovals.filter(app => app.autoApprovalEligible);
    
    if (autoEligible.length === 0) {
      showNotification('No appointments eligible for auto-approval', 'info');
      return;
    }

    setProcessing('bulk');

    try {
      const response = await axios.post('/api/two-tier-pricing/doctor/bulk-auto-approve', {
        appointmentIds: autoEligible.map(app => app.id)
      });

      if (response.data.success) {
        setPendingApprovals(prev => 
          prev.filter(app => !autoEligible.some(eligible => eligible.id === app.id))
        );
        
        showNotification(
          `${response.data.approved_count} appointments auto-approved successfully`,
          'success'
        );
        
        fetchApprovalStats();
      }
    } catch (error: any) {
      console.error('Bulk auto-approve failed:', error);
      showNotification('Failed to process bulk auto-approval', 'error');
    } finally {
      setProcessing(null);
    }
  };

  // Filter and sort appointments
  const filteredApprovals = pendingApprovals
    .filter(appointment => {
      switch (filterBy) {
        case 'auto':
          return appointment.autoApprovalEligible;
        case 'manual':
          return !appointment.autoApprovalEligible;
        case 'premium':
          return appointment.pricingTier === 'premium';
        case 'standard':
          return appointment.pricingTier === 'standard';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
        case 'priority':
          const priorityOrder = { emergency: 3, urgent: 2, routine: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'fee':
          return b.fee - a.fee;
        default:
          return 0;
      }
    });

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'inPerson':
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return 'Video Call';
      case 'chat':
        return 'Chat Consultation';
      case 'inPerson':
      default:
        return 'In-Person';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Emergency</Badge>;
      case 'urgent':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Urgent</Badge>;
      case 'routine':
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Routine</Badge>;
    }
  };

  const getApprovalMethodBadge = (appointment: PendingApproval) => {
    if (appointment.autoApprovalEligible) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Auto-Eligible
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This appointment meets criteria for automatic approval</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Manual Review
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This appointment requires manual review</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  const getPricingTierBadge = (appointment: PendingApproval) => {
    if (appointment.pricingTier === 'premium') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
          <Star className="h-3 w-3" />
          Premium
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          Standard
        </Badge>
      );
    }
  };

  const renderPriceMatchInfo = (appointment: PendingApproval) => {
    if (appointment.pricingTier === 'premium' && appointment.doctorPrice) {
      const isMatch = appointment.priceMatch;
      return (
        <div className={`text-xs p-2 rounded ${isMatch ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <div className="flex items-center gap-1">
            {isMatch ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="font-medium">
              {isMatch ? 'Price Match' : 'Price Mismatch'}
            </span>
          </div>
          <div className="mt-1">
            Patient paid: {appointment.fee} ETB | Your rate: {appointment.doctorPrice} ETB
          </div>
        </div>
      );
    }
    return null;
  };

  const renderAlternativeSlots = (appointment: PendingApproval) => {
    if (!appointment.alternativeSlots || appointment.alternativeSlots.length === 0) {
      return (
        <div className="text-sm text-gray-500 text-center py-4">
          No alternative slots available
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Suggest alternative time:</label>
        <Select
          value={selectedAlternativeSlot[appointment.id] || ''}
          onValueChange={(value) => setSelectedAlternativeSlot(prev => ({
            ...prev,
            [appointment.id]: value
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select alternative slot" />
          </SelectTrigger>
          <SelectContent>
            {appointment.alternativeSlots.map((slot, index) => (
              <SelectItem 
                key={index} 
                value={`${slot.date}_${slot.time}`}
                disabled={!slot.available}
              >
                {new Date(slot.date).toLocaleDateString()} at {slot.time}
                {!slot.available && ' (Unavailable)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTimeUntilAppointment = (appointmentDate: string) => {
    const now = new Date();
    const appointment = new Date(appointmentDate);
    const diffMs = appointment.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return 'Past due';
    } else if (diffHours < 24) {
      return `${diffHours}h remaining`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d remaining`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading pending approvals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Approvals</h1>
          <p className="text-gray-600">
            Manage your appointment requests with intelligent approval workflows
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={fetchPendingApprovals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {filteredApprovals.some(app => app.autoApprovalEligible) && (
            <Button
              onClick={handleBulkAutoApprove}
              disabled={processing === 'bulk'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-Approve Eligible
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_pending}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Auto-Eligible</p>
                  <p className="text-2xl font-bold text-green-600">{stats.auto_eligible}</p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Premium Bookings</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.premium_bookings}</p>
                </div>
                <Star className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.average_response_time}h</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Sort
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Appointments</SelectItem>
                  <SelectItem value="auto">Auto-Eligible</SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                  <SelectItem value="premium">Premium Only</SelectItem>
                  <SelectItem value="standard">Standard Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">By Priority</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="fee">By Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Appointments
            {filteredApprovals.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {filteredApprovals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending approvals</p>
              <p className="text-sm">
                {pendingApprovals.length === 0 
                  ? 'All appointment requests have been processed'
                  : 'No appointments match the current filter'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((appointment) => (
                <Card key={appointment.id} className={`border-l-4 ${
                  appointment.autoApprovalEligible 
                    ? 'border-l-green-400' 
                    : appointment.pricingTier === 'premium'
                    ? 'border-l-purple-400'
                    : 'border-l-yellow-400'
                }`}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{appointment.patientName}</h3>
                            {getPriorityBadge(appointment.priority)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getApprovalMethodBadge(appointment)}
                            {getPricingTierBadge(appointment)}
                          </div>
                          <p className="text-sm text-gray-600">
                            Patient ID: {appointment.patientWallet.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="font-medium">{getTimeUntilAppointment(appointment.appointmentDate)}</div>
                          <div>Requested {new Date(appointment.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Appointment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">Date & Time</div>
                            <div className="text-gray-600">{formatDate(appointment.appointmentDate)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(appointment.serviceType)}
                          <div>
                            <div className="font-medium">Service Type</div>
                            <div className="text-gray-600">
                              {getServiceTypeLabel(appointment.serviceType)} ({appointment.duration} min)
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">Fee</div>
                            <div className="text-gray-600">
                              {appointment.fee > 0 ? `${appointment.fee} ETB` : 'Free'}
                            </div>
                            {appointment.marketRate && (
                              <div className="text-xs text-gray-500">
                                Market: {appointment.marketRate} ETB
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price Match Info */}
                      {renderPriceMatchInfo(appointment)}

                      {/* Reason */}
                      {appointment.reason && (
                        <div>
                          <div className="font-medium text-sm mb-1">Reason for Visit:</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {appointment.reason}
                          </div>
                        </div>
                      )}

                      {/* Rejection Form */}
                      {showRejectionForm === appointment.id && (
                        <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <label className="text-sm font-medium text-red-800">Reason for rejection:</label>
                          <Textarea
                            placeholder="Please provide a reason for rejecting this appointment..."
                            value={rejectionReason[appointment.id] || ''}
                            onChange={(e) => setRejectionReason(prev => ({
                              ...prev,
                              [appointment.id]: e.target.value
                            }))}
                            rows={3}
                            className="border-red-300 focus:border-red-500"
                          />
                        </div>
                      )}

                      {/* Alternative Slots Form */}
                      {showAlternativeSlots === appointment.id && (
                        <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Reschedule Appointment</span>
                          </div>
                          {renderAlternativeSlots(appointment)}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2">
                        {/* Primary Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproval(appointment.id, 'approve')}
                            disabled={processing === appointment.id || processing === 'bulk'}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {processing === appointment.id ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Approve
                                {appointment.autoApprovalEligible && (
                                  <Zap className="h-3 w-3" />
                                )}
                              </div>
                            )}
                          </Button>
                          
                          {showRejectionForm === appointment.id ? (
                            <>
                              <Button
                                onClick={() => handleApproval(appointment.id, 'reject')}
                                disabled={processing === appointment.id || !rejectionReason[appointment.id]?.trim()}
                                variant="destructive"
                                className="flex-1"
                              >
                                {processing === appointment.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    Confirm Rejection
                                  </div>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowRejectionForm(null);
                                  setRejectionReason(prev => {
                                    const updated = { ...prev };
                                    delete updated[appointment.id];
                                    return updated;
                                  });
                                }}
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : showAlternativeSlots === appointment.id ? (
                            <>
                              <Button
                                onClick={() => handleApproval(appointment.id, 'reschedule')}
                                disabled={processing === appointment.id || !selectedAlternativeSlot[appointment.id]}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                {processing === appointment.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4" />
                                    Confirm Reschedule
                                  </div>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowAlternativeSlots(null);
                                  setSelectedAlternativeSlot(prev => {
                                    const updated = { ...prev };
                                    delete updated[appointment.id];
                                    return updated;
                                  });
                                }}
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => setShowRejectionForm(appointment.id)}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              {appointment.alternativeSlots && appointment.alternativeSlots.length > 0 && (
                                <Button
                                  onClick={() => setShowAlternativeSlots(appointment.id)}
                                  variant="outline"
                                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Reschedule
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default AppointmentApprovalQueue;