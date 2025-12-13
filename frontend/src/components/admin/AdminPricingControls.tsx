/**
 * Admin Pricing Controls Component
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 9.1: AdminPricingControls component**
 * **Requirements: 5.1, 5.2, 5.3, 10.2, 10.4**
 * 
 * Creates admin pricing management interface with standard rate updates,
 * doctor notification systems, and pricing abuse monitoring tools.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Bell,
  Shield,
  Eye,
  RefreshCw,
  Save,
  Send,
  BarChart3,
  Filter,
  Calendar,
  Download,
  ExternalLink
} from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface StandardPricing {
  in_person_fee: number;
  last_updated: string;
  updated_by: string;
  effective_date: string;
}

interface SuspiciousActivity {
  id: string;
  doctor_id: string;
  doctor_name: string;
  activity_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  status: 'pending' | 'reviewed' | 'resolved';
  details: any;
}

interface PricingStats {
  total_doctors: number;
  active_premium_doctors: number;
  average_video_call_price: number;
  average_chat_price: number;
  price_violations: number;
  pending_reviews: number;
}

const AdminPricingControls: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [standardPricing, setStandardPricing] = useState<StandardPricing | null>(null);
  const [newStandardFee, setNewStandardFee] = useState<string>('');
  const [updateReason, setUpdateReason] = useState('');
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [pricingStats, setPricingStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [activeTab, setActiveTab] = useState('standard-pricing');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [pricingResponse, activitiesResponse, statsResponse] = await Promise.all([
        axios.get('/api/two-tier-pricing/admin/standard-pricing'),
        axios.get('/api/two-tier-pricing/admin/suspicious-activities'),
        axios.get('/api/two-tier-pricing/admin/system-analytics')
      ]);

      if (pricingResponse.data.success) {
        setStandardPricing(pricingResponse.data.data);
        setNewStandardFee(pricingResponse.data.data.in_person_fee.toString());
      }

      if (activitiesResponse.data.success) {
        setSuspiciousActivities(activitiesResponse.data.data);
      }

      if (statsResponse.data.success) {
        setPricingStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleStandardPricingUpdate = async () => {
    if (!newStandardFee || !updateReason.trim()) {
      showNotification('Please provide both new fee and reason', 'error');
      return;
    }

    const fee = parseFloat(newStandardFee);
    if (isNaN(fee) || fee < 100 || fee > 1000) {
      showNotification('Fee must be between 100 and 1000 ETB', 'error');
      return;
    }

    setUpdating(true);

    try {
      const response = await axios.put('/api/two-tier-pricing/admin/standard-pricing', {
        in_person_fee: fee,
        reason: updateReason.trim()
      });

      if (response.data.success) {
        showNotification('Standard pricing updated successfully', 'success');
        setUpdateReason('');
        fetchAdminData();
      }
    } catch (error: any) {
      console.error('Failed to update standard pricing:', error);
      showNotification(
        error.response?.data?.error || 'Failed to update pricing',
        'error'
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleSuspiciousActivityAction = async (activityId: string, action: 'review' | 'resolve') => {
    try {
      const response = await axios.post(`/two-tier-pricing/admin/suspicious-activity/${activityId}`, {
        action
      });

      if (response.data.success) {
        showNotification(`Activity marked as ${action}ed`, 'success');
        fetchAdminData();
      }
    } catch (error: any) {
      console.error('Failed to update suspicious activity:', error);
      showNotification('Failed to update activity status', 'error');
    }
  };

  const sendBroadcastNotification = async () => {
    if (!notificationMessage.trim()) {
      showNotification('Please enter a notification message', 'error');
      return;
    }

    setSendingNotification(true);

    try {
      const response = await axios.post('/api/two-tier-pricing/admin/broadcast-notification', {
        message: notificationMessage.trim(),
        type: 'pricing_announcement'
      });

      if (response.data.success) {
        showNotification('Notification sent to all doctors', 'success');
        setNotificationMessage('');
      }
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      showNotification('Failed to send notification', 'error');
    } finally {
      setSendingNotification(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      low: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
      critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: Shield }
    };

    const { color, icon: Icon } = config[severity as keyof typeof config] || config.medium;

    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      reviewed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
      resolved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
    };

    const { color, icon: Icon } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredActivities = suspiciousActivities.filter(activity => {
    const severityMatch = filterSeverity === 'all' || activity.severity === filterSeverity;
    const statusMatch = filterStatus === 'all' || activity.status === filterStatus;
    return severityMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading admin controls...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Administration</h1>
          <p className="text-gray-600">Manage system pricing and monitor doctor pricing activities</p>
        </div>
        <Button onClick={fetchAdminData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* System Stats */}
      {pricingStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Doctors</p>
                  <p className="text-2xl font-bold">{pricingStats.total_doctors}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Premium Active</p>
                  <p className="text-2xl font-bold text-purple-600">{pricingStats.active_premium_doctors}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Video Price</p>
                  <p className="text-lg font-bold">{formatCurrency(pricingStats.average_video_call_price)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Chat Price</p>
                  <p className="text-lg font-bold">{formatCurrency(pricingStats.average_chat_price)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Violations</p>
                  <p className="text-2xl font-bold text-red-600">{pricingStats.price_violations}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold text-orange-600">{pricingStats.pending_reviews}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standard-pricing">Standard Pricing</TabsTrigger>
          <TabsTrigger value="monitoring">Activity Monitoring</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Standard Pricing Tab */}
        <TabsContent value="standard-pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Standard Tier Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {standardPricing && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current Standard Fee</label>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(standardPricing.in_person_fee)}
                      </div>
                      <div className="text-sm text-gray-500">
                        For in-person consultations
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                      <div className="text-sm text-gray-900">
                        {new Date(standardPricing.last_updated).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        By {standardPricing.updated_by}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    New Standard Fee (ETB)
                  </label>
                  <Input
                    type="number"
                    value={newStandardFee}
                    onChange={(e) => setNewStandardFee(e.target.value)}
                    placeholder="Enter new fee (100-1000 ETB)"
                    min="100"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fee must be between 100 and 1000 ETB
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Reason for Change
                  </label>
                  <Textarea
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    placeholder="Explain why you're updating the standard fee..."
                    rows={3}
                  />
                </div>

                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    All doctors will be notified of this pricing change via email and in-app notification.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleStandardPricingUpdate}
                  disabled={updating || !newStandardFee || !updateReason.trim()}
                  className="w-full"
                >
                  {updating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Update Standard Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Activity Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Suspicious Activity Monitoring
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No suspicious activities found</p>
                  <p className="text-sm">The system is monitoring for pricing violations and unusual patterns</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <Card key={activity.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{activity.doctor_name}</h4>
                              {getSeverityBadge(activity.severity)}
                              {getStatusBadge(activity.status)}
                            </div>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                            <div className="text-xs text-gray-500">
                              Detected: {new Date(activity.detected_at).toLocaleString()}
                            </div>
                            {activity.details && (
                              <div className="text-xs bg-gray-50 p-2 rounded">
                                <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                          
                          {activity.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspiciousActivityAction(activity.id, 'review')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSuspiciousActivityAction(activity.id, 'resolve')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Broadcast Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Message to All Doctors
                </label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter notification message for all doctors..."
                  rows={4}
                />
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  This message will be sent to all registered doctors via in-app notification and email.
                </AlertDescription>
              </Alert>

              <Button
                onClick={sendBroadcastNotification}
                disabled={sendingNotification || !notificationMessage.trim()}
                className="w-full"
              >
                {sendingNotification ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Notification to All Doctors
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Pricing Analytics & Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-2" />
                  <span>Download Pricing Report</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <BarChart3 className="w-6 h-6 mb-2" />
                  <span>Market Analysis</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  <span>Monthly Summary</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col">
                  <ExternalLink className="w-6 h-6 mb-2" />
                  <span>Advanced Analytics</span>
                </Button>
              </div>

              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Detailed analytics and reporting features are available in the full admin dashboard.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPricingControls;