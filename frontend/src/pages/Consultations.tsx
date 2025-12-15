import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import consultationService, { type Consultation } from '../services/consultationService';
import ChatConsultation from '../components/consultation/ChatConsultation';
import VideoConsultation from '../components/consultation/VideoConsultation';
import DoctorPaymentVerification from '../components/consultation/DoctorPaymentVerification';

const Consultations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { consultationId } = useParams();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    loadConsultations();
  }, [user?.walletAddress]);

  useEffect(() => {
    if (consultationId) {
      loadActiveConsultation(consultationId);
    }
  }, [consultationId]);

  const loadConsultations = async () => {
    if (!user?.walletAddress) return;
    
    try {
      // Use unified history to get both consultations and video calls
      const response = await consultationService.getUnifiedConsultationHistory(
        user.walletAddress,
        isDoctor ? 'doctor' : 'patient'
      );
      setConsultations(response.data || []);
    } catch (error) {
      console.error('Failed to load consultation history:', error);
      // Fallback to regular consultations if unified history fails
      try {
        const fallbackResponse = await consultationService.getConsultations({
          userWallet: user.walletAddress,
          role: isDoctor ? 'doctor' : 'patient'
        });
        setConsultations(fallbackResponse.data || []);
      } catch (fallbackError) {
        console.error('Fallback consultation loading also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveConsultation = async (id: string) => {
    try {
      const response = await consultationService.getConsultation(id, user?.walletAddress || '');
      if (response.success) {
        setActiveConsultation(response.data);
      }
    } catch (error) {
      console.error('Failed to load consultation:', error);
    }
  };

  const handleJoinConsultation = async (consultation: Consultation) => {
    try {
      await consultationService.joinConsultation(consultation.id, user?.walletAddress || '');
      setActiveConsultation(consultation);
      navigate(`/consultations/${consultation.id}`);
    } catch (error) {
      console.error('Failed to join consultation:', error);
    }
  };

  const handleEndConsultation = () => {
    setActiveConsultation(null);
    navigate('/consultations');
    loadConsultations();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      // Consultation statuses
      requested: { color: 'bg-gray-100 text-gray-700', label: 'Requested' },
      payment_pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Payment Pending' },
      payment_submitted: { color: 'bg-orange-100 text-orange-700', label: 'Awaiting Verification' },
      verified: { color: 'bg-blue-100 text-blue-700', label: 'Ready' },
      active: { color: 'bg-green-100 text-green-700', label: 'Active' },
      completed: { color: 'bg-gray-100 text-gray-700', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
      expired: { color: 'bg-red-100 text-red-700', label: 'Expired' },
      
      // Video call statuses
      initiated: { color: 'bg-blue-100 text-blue-700', label: 'Calling...' },
      ringing: { color: 'bg-yellow-100 text-yellow-700', label: 'Ringing' },
      ended: { color: 'bg-gray-100 text-gray-700', label: 'Ended' },
      missed: { color: 'bg-orange-100 text-orange-700', label: 'Missed' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      failed: { color: 'bg-red-100 text-red-700', label: 'Failed' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const filteredConsultations = consultations.filter(item => {
    if (filter === 'active') {
      // Active includes: verified/active consultations, active/ringing video calls
      return ['verified', 'active', 'ringing', 'initiated'].includes(item.status);
    }
    if (filter === 'completed') {
      // Completed includes: completed consultations, ended video calls
      return ['completed', 'ended'].includes(item.status);
    }
    return true;
  });

  // Show active consultation view
  if (activeConsultation && ['verified', 'active'].includes(activeConsultation.status)) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setActiveConsultation(null);
              navigate('/consultations');
            }}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Consultations
          </button>
          
          {activeConsultation.consultationType === 'chat' ? (
            <ChatConsultation 
              consultation={activeConsultation} 
              onEnd={handleEndConsultation}
            />
          ) : (
            <VideoConsultation 
              consultation={activeConsultation} 
              onEnd={handleEndConsultation}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isDoctor ? 'Patient Consultations' : 'My Consultations'}
            </h1>
            <p className="text-gray-600">
              {isDoctor ? 'Manage all your patient consultations - both video calls and chat sessions' : 'Your consultation history - video calls and chat sessions with doctors'}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-3">
            {!isDoctor && (
              <button
                onClick={() => navigate('/patient/doctor-selection')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                New Consultation
              </button>
            )}
          </div>
        </div>

        {/* Doctor: Payment Verification Queue */}
        {isDoctor && (
          <DoctorPaymentVerification onVerified={loadConsultations} />
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Consultations List */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading consultations...</p>
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-6xl mb-4">🩺</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Consultation History</h3>
            <p className="text-gray-600">
              {isDoctor 
                ? 'No patient consultations or video calls yet.' 
                : 'You haven\'t had any consultations or video calls with doctors yet.'}
            </p>
            {!isDoctor && (
              <button
                onClick={() => navigate('/patient/doctor-selection')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Your First Consultation
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredConsultations.map((item) => {
              // Handle both consultation and video_call types
              const isConsultation = item.type === 'consultation';
              const isVideoCall = item.type === 'video_call';
              
              // Get other party info
              const otherParty = item.otherParty;
              const otherName = otherParty?.name || 
                (otherParty?.role === 'doctor' ? 'Doctor' : 'Patient');
              
              // Determine if user can join
              const canJoin = item.canJoin || false;
              
              // Get appropriate icon and colors
              let iconBg, icon, typeLabel;
              if (item.subType === 'chat') {
                iconBg = 'bg-blue-100';
                icon = '💬';
                typeLabel = 'Chat';
              } else if (item.subType === 'video') {
                iconBg = 'bg-purple-100';
                icon = '🎥';
                typeLabel = 'Video Call';
              } else {
                iconBg = 'bg-gray-100';
                icon = '🩺';
                typeLabel = 'Consultation';
              }

              return (
                <div 
                  key={`${item.type}-${item.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${iconBg}`}>
                        <span className="text-2xl">{icon}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {otherParty?.role === 'doctor' && !isDoctor ? 'Dr. ' : ''}{otherName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {typeLabel} {isConsultation ? 'Consultation' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(item.status)}
                          {item.fee && (
                            <span className="text-sm text-gray-500">
                              {item.fee} {item.currency || 'ETB'}
                            </span>
                          )}
                          {item.duration && item.status === 'ended' && (
                            <span className="text-sm text-gray-500">
                              {Math.floor(item.duration / 60)}m {item.duration % 60}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Show scheduled time for consultations */}
                      {item.scheduledTime && (
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Scheduled</p>
                          <p className="font-medium">
                            {new Date(item.scheduledTime).toLocaleDateString()}
                          </p>
                          <p className="text-gray-600">
                            {new Date(item.scheduledTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      )}

                      {/* Show completion time for ended items */}
                      {item.endedAt && !item.scheduledTime && (
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Completed</p>
                          <p className="font-medium">
                            {new Date(item.endedAt).toLocaleDateString()}
                          </p>
                          <p className="text-gray-600">
                            {new Date(item.endedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      )}

                      {/* Join button for active consultations */}
                      {canJoin && isConsultation && (
                        <button
                          onClick={() => handleJoinConsultation(item)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Join {item.subType === 'chat' ? 'Chat' : 'Call'}
                        </button>
                      )}

                      {/* Rating button for completed consultations */}
                      {isConsultation && item.status === 'completed' && !item.rating && !isDoctor && (
                        <button
                          onClick={() => navigate(`/consultations/${item.id}/rate`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Rate
                        </button>
                      )}

                      {/* Show rating if available */}
                      {item.rating && (
                        <div className="text-right text-sm">
                          <p className="text-gray-500">Your Rating</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < item.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Consultations;
