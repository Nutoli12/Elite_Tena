import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  DollarSign,
  Settings,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Video,
  MessageSquare,
  User,
  Shield
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNotification } from '../../contexts/NotificationContext';

interface PricingData {
  pricing: {
    inPerson: number;
    videoCall: number;
    chat: number;
  };
  services: {
    inPerson: boolean;
    videoCall: boolean;
    chat: boolean;
  };
  settings: {
    autoApproveExactPayments: boolean;
  };
}

interface ApprovalStats {
  approval_status: string;
  approval_type: string;
  count: number;
  avg_amount: number;
  total_amount: number;
}

const EnhancedPricingDashboard: React.FC = () => {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    videoCallFee: 0,
    chatFee: 0,
    acceptsInPerson: true,
    acceptsVideoCalls: true,
    acceptsChat: true,
    autoApproveExactPayments: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPricingData();
    fetchApprovalStats();
  }, []);

  const fetchPricingData = async () => {
    try {
      // Get current user's wallet address - replace with actual auth context
      const userWallet = 'current-user-wallet'; // TODO: Get from auth context
      
      const response = await axios.get(`/enhanced-appointments/doctors/${userWallet}/pricing`);
      
      if (response.data.success) {
        const data = response.data.data;
        setPricingData(data);
        setFormData({
          videoCallFee: data.pricing.videoCall,
          chatFee: data.pricing.chat,
          acceptsInPerson: data.services.inPerson,
          acceptsVideoCalls: data.services.videoCall,
          acceptsChat: data.services.chat,
          autoApproveExactPayments: data.settings.autoApproveExactPayments
        });
      }
    } catch (error: any) {
      console.error('Fetch pricing error:', error);
      setError(error.response?.data?.error || 'Failed to fetch pricing data');
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const response = await axios.get('/api/enhanced-appointments/doctor/appointments?stats=true');
      
      if (response.data.success) {
        setApprovalStats(response.data.data.stats || []);
      }
    } catch (error: any) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleUpdatePricing = async () => {
    setLoading(true);
    setError(null);

    try {
      const userWallet = 'current-user-wallet'; // TODO: Get from auth context
      
      const response = await axios.put(`/enhanced-appointments/doctors/${userWallet}/pricing`, formData);
      
      if (response.data.success) {
        setPricingData(response.data.data);
        setEditMode(false);
        showNotification('Pricing updated successfully!', 'success');
      }
    } catch (error: any) {
      console.error('Update pricing error:', error);
      setError(error.response?.data?.error || 'Failed to update pricing');
    } finally {
      setLoading(false);
    }
  };

  const getStatsForType = (approvalStatus: string, approvalType?: string) => {
    return approvalStats.find(stat => 
      stat.approval_status === approvalStatus && 
      (!approvalType || stat.approval_type === approvalType)
    );
  };

  const autoApprovedStats = getStatsForType('auto_approved', 'auto');
  const manualApprovedStats = getStatsForType('manually_approved', 'manual');
  const pendingStats = getStatsForType('pending');
  const rejectedStats = getStatsForType('rejected');

  const totalEarnings = approvalStats
    .filter(stat => stat.approval_status === 'auto_approved' || stat.approval_status === 'manually_approved')
    .reduce((sum, stat) => sum + parseFloat(stat.total_amount || '0'), 0);

  if (!pricingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Dashboard</h1>
          <p className="text-gray-600">Manage your service fees and approval settings</p>
        </div>
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "outline" : "default"}
        >
          <Settings className="h-4 w-4 mr-2" />
          {editMode ? 'Cancel' : 'Edit Pricing'}
        </Button>
      </div>

      {/* Current Pricing */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              In-Person
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pricingData.pricing.inPerson} ETB</div>
            <div className="text-sm text-gray-600 mt-1">Fixed by admin</div>
            <Badge className="mt-2 bg-orange-100 text-orange-800">
              Always requires approval
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5" />
              Video Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <input
                type="number"
                value={formData.videoCallFee}
                onChange={(e) => setFormData(prev => ({ ...prev, videoCallFee: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border rounded text-2xl font-bold"
                min="0"
                step="100"
              />
            ) : (
              <div className="text-2xl font-bold">{pricingData.pricing.videoCall} ETB</div>
            )}
            <div className="text-sm text-gray-600 mt-1">You set this price</div>
            <Badge className="mt-2 bg-green-100 text-green-800">
              Exact payment = Auto-approved
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <input
                type="number"
                value={formData.chatFee}
                onChange={(e) => setFormData(prev => ({ ...prev, chatFee: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border rounded text-2xl font-bold"
                min="0"
                step="100"
              />
            ) : (
              <div className="text-2xl font-bold">{pricingData.pricing.chat} ETB</div>
            )}
            <div className="text-sm text-gray-600 mt-1">You set this price</div>
            <Badge className="mt-2 bg-green-100 text-green-800">
              Exact payment = Auto-approved
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Service Settings */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Service Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Available Services</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.acceptsInPerson}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptsInPerson: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Accept In-Person Consultations</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.acceptsVideoCalls}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptsVideoCalls: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Accept Video Consultations</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.acceptsChat}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptsChat: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Accept Chat Consultations</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Approval Settings</h4>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoApproveExactPayments}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoApproveExactPayments: e.target.checked }))}
                      className="rounded mt-1"
                    />
                    <div>
                      <span className="block">Auto-approve exact payments</span>
                      <span className="text-sm text-gray-600">
                        Automatically approve when patients pay your exact asking price
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleUpdatePricing} disabled={loading}>
                  {loading ? 'Updating...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Statistics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Auto-Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoApprovedStats?.count || 0}</div>
            <div className="text-sm text-gray-600">
              Avg: {autoApprovedStats?.avg_amount ? `${parseFloat(autoApprovedStats.avg_amount).toFixed(0)} ETB` : '0 ETB'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Manual Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manualApprovedStats?.count || 0}</div>
            <div className="text-sm text-gray-600">
              Avg: {manualApprovedStats?.avg_amount ? `${parseFloat(manualApprovedStats.avg_amount).toFixed(0)} ETB` : '0 ETB'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStats?.count || 0}</div>
            <div className="text-sm text-gray-600">Awaiting your decision</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEarnings.toFixed(0)} ETB</div>
            <div className="text-sm text-gray-600">Last 30 days</div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Approval Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Smart Approval System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-green-600">Auto-Approved (No Refunds)</h4>
              <div className="space-y-2 text-sm">
                <div>• Patient pays your <strong>exact asking price</strong></div>
                <div>• Instant approval (no manual review needed)</div>
                <div>• <strong>No refunds</strong> - your time is reserved</div>
                <div>• Higher patient satisfaction (instant confirmation)</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-blue-600">Manual Review (Refund if Rejected)</h4>
              <div className="space-y-2 text-sm">
                <div>• Patient pays <strong>different amount</strong> than asking price</div>
                <div>• You manually approve or reject</div>
                <div>• <strong>Full refund</strong> if you reject</div>
                <div>• Allows negotiation and special cases</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPricingDashboard;