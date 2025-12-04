import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, QrCode, CheckCircle, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

export const ReceptionCheckIn: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrScanMode, setQrScanMode] = useState(false);

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get('/appointments');
      
      if (response.data.success) {
        const allAppointments = response.data.data || [];
        const todayAppts = allAppointments.filter((apt: any) => {
          const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
          return aptDate === today && apt.status === 'scheduled';
        });
        
        setTodayAppointments(todayAppts);
        console.log(`✅ Found ${todayAppts.length} appointments for today`);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get('/appointments');
      if (response.data.success) {
        const allAppointments = response.data.data || [];
        const results = allAppointments.filter((apt: any) => {
          const patientName = apt.patientDetails?.user?.fullName?.toLowerCase() || '';
          const patientWallet = apt.patientWalletAddress?.toLowerCase() || '';
          const query = searchQuery.toLowerCase();
          
          return patientName.includes(query) || 
                 patientWallet.includes(query) ||
                 apt.id.toLowerCase().includes(query);
        });
        
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    try {
      const response = await axios.post(`/appointments/${appointmentId}/check-in`, {
        receptionStaff: user?.walletAddress || 'reception_staff'
      });

      if (response.data.success) {
        alert(`Patient checked in successfully! Queue number: ${response.data.data.queueNumber}`);
        fetchTodayAppointments();
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Check-in failed:', error);
      alert('Failed to check in patient. Please try again.');
    }
  };

  // QR scan handler - will be used when QR scanner is implemented
  // const handleQRScan = async (qrData: string) => {
  //   try {
  //     const response = await axios.post('/appointments/scan-qr', {
  //       qrData,
  //       receptionStaff: user?.walletAddress || 'reception_staff'
  //     });

  //     if (response.data.success) {
  //       alert(`Patient checked in successfully! Queue number: ${response.data.data.queueNumber}`);
  //       fetchTodayAppointments();
  //       setQrScanMode(false);
  //     }
  //   } catch (error) {
  //     console.error('QR scan failed:', error);
  //     alert('Invalid QR code or check-in failed.');
  //   }
  // };

  const getStatusColor = (checkInStatus: string) => {
    switch (checkInStatus) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reception Check-In</h1>
              <p className="text-gray-600 mt-1">Check in patients for their appointments</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Today's Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search & QR Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Search */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Search Patient</h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, wallet address, or appointment ID..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Search
                </motion.button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <p className="font-semibold text-gray-900">
                              {apt.patientDetails?.user?.fullName || 'Patient'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>
                              {new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span>Dr. {apt.doctorDetails?.user?.fullName || 'Doctor'}</span>
                          </div>
                        </div>
                        {apt.checkInStatus === 'not_checked_in' ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCheckIn(apt.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                          >
                            Check In
                          </motion.button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.checkInStatus)}`}>
                            {apt.checkInStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* QR Code Scanner */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">QR Code Check-In</h2>
            </div>

            <div className="text-center py-8">
              {!qrScanMode ? (
                <>
                  <QrCode className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Scan patient's appointment QR code</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQrScanMode(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                  >
                    Start QR Scanner
                  </motion.button>
                </>
              ) : (
                <>
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-8 mb-4">
                    <p className="text-purple-900 font-semibold mb-2">QR Scanner Active</p>
                    <p className="text-sm text-purple-700">
                      In production, this would activate the camera for QR scanning
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQrScanMode(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
                  >
                    Cancel
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Today's Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Today's Appointments</h2>
              <p className="text-sm text-gray-600">{todayAppointments.length} scheduled appointments</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
              />
              <p className="text-gray-600 mt-4">Loading appointments...</p>
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-green-50 rounded-lg flex flex-col items-center justify-center border-2 border-green-200">
                      <Clock className="w-5 h-5 text-green-600 mb-1" />
                      <span className="text-xs font-semibold text-green-700">
                        {new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <p className="font-semibold text-gray-900">
                          {apt.patientDetails?.user?.fullName || apt.patientWalletAddress?.substring(0, 10) + '...'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Dr. {apt.doctorDetails?.user?.fullName || 'Doctor'} • {apt.reason || 'Consultation'}
                      </p>
                      {apt.queueNumber && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Queue #{apt.queueNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {apt.checkInStatus === 'not_checked_in' ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCheckIn(apt.id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Check In
                      </motion.button>
                    ) : (
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(apt.checkInStatus)}`}>
                        {apt.checkInStatus === 'checked_in' && '✓ Checked In'}
                        {apt.checkInStatus === 'waiting' && '⏳ Waiting'}
                        {apt.checkInStatus === 'in_progress' && '🩺 In Progress'}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No appointments scheduled for today</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
