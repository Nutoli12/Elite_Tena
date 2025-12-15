import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import videoCallService from '../../services/videoCallService';
import type { VideoCall } from '../../services/videoCallService';

interface VideoCallHistoryProps {
  limit?: number;
  showFilters?: boolean;
}

const VideoCallHistory: React.FC<VideoCallHistoryProps> = ({ 
  limit = 20, 
  showFilters = true 
}) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCallHistory();
  }, [statusFilter]);

  const loadCallHistory = async () => {
    if (!user?.walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: any = { limit };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await videoCallService.getCallHistory(user.walletAddress, params);
      setCalls(response.data || []);
    } catch (err: any) {
      console.error('Failed to load call history:', err);
      setError(err.message || 'Failed to load call history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ended': return 'text-green-400 bg-green-400/10';
      case 'active': return 'text-blue-400 bg-blue-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      case 'missed': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ended': return '✅';
      case 'active': return '🔵';
      case 'rejected': return '❌';
      case 'missed': return '⚠️';
      case 'failed': return '💥';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadCallHistory}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📹</span>
            Video Call History
          </h3>
          
          {showFilters && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Calls</option>
              <option value="ended">Completed</option>
              <option value="missed">Missed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          )}
        </div>
      </div>

      {/* Call List */}
      <div className="divide-y divide-gray-700">
        {calls.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📹</div>
            <p className="text-gray-400 mb-2">No video calls yet</p>
            <p className="text-sm text-gray-500">
              Your video call history will appear here
            </p>
          </div>
        ) : (
          calls.map((call) => {
            const isInitiator = call.initiatorWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
            const otherParticipant = isInitiator ? call.receiver : call.initiator;
            const participantName = otherParticipant?.profileData?.fullName || 
                                  otherParticipant?.profileData?.firstName || 
                                  'Unknown User';

            return (
              <div key={call.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Participant Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-lg">
                      {otherParticipant?.role === 'doctor' ? '👨‍⚕️' : 
                       otherParticipant?.role === 'patient' ? '🧑‍💼' : '👤'}
                    </span>
                  </div>

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {participantName}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                        {getStatusIcon(call.status)} {call.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        {isInitiator ? '📞' : '📲'}
                        {isInitiator ? 'Outgoing' : 'Incoming'}
                      </span>
                      
                      {call.duration && (
                        <span className="flex items-center gap-1">
                          ⏱️ {formatDuration(call.duration)}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        📅 {new Date(call.createdAt).toLocaleDateString()}
                      </span>
                      
                      <span className="flex items-center gap-1">
                        🕐 {new Date(call.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Additional Info */}
                    {(call.appointmentId || call.metadata?.scheduledTime) && (
                      <div className="mt-2 flex items-center gap-2">
                        {call.appointmentId && (
                          <span className="px-2 py-1 bg-green-600/20 border border-green-500 rounded text-xs text-green-400">
                            📅 Appointment
                          </span>
                        )}
                        {call.metadata?.scheduledTime && (
                          <span className="text-xs text-gray-500">
                            Scheduled: {new Date(call.metadata.scheduledTime).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Call Quality */}
                  {call.quality && (
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Quality</div>
                      <div className="flex items-center gap-1">
                        {call.quality.userRating && (
                          <span className="text-yellow-400">
                            {'⭐'.repeat(call.quality.userRating)}
                          </span>
                        )}
                        {call.quality.videoQuality && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            call.quality.videoQuality === 'excellent' ? 'bg-green-600/20 text-green-400' :
                            call.quality.videoQuality === 'good' ? 'bg-blue-600/20 text-blue-400' :
                            call.quality.videoQuality === 'fair' ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-red-600/20 text-red-400'
                          }`}>
                            {call.quality.videoQuality}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* End Reason */}
                {call.endReason && call.endReason !== 'normal' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Ended: {call.endReason.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {calls.length >= limit && (
        <div className="p-4 border-t border-gray-700 text-center">
          <button
            onClick={() => loadCallHistory()}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Load more calls
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCallHistory;