import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import videoCallService from '../../services/videoCallService';

const SimpleVideoDemo: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [doctorWallet, setDoctorWallet] = useState('');

  const testVideoCall = async () => {
    if (!user?.walletAddress || !doctorWallet) {
      setResult('❌ Please enter a doctor wallet address and ensure you are logged in');
      return;
    }

    setIsLoading(true);
    setResult('🔄 Testing video call system...');

    try {
      // Test 1: Create consultation
      setResult('📋 Step 1: Creating video consultation...');
      const consultation = await consultationService.requestConsultation({
        patientWallet: user.walletAddress,
        doctorWallet: doctorWallet,
        consultationType: 'video',
        scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        durationMinutes: 30
      });

      if (!consultation.success) {
        throw new Error(consultation.error || 'Failed to create consultation');
      }

      setResult('✅ Step 1: Consultation created successfully!\n🔄 Step 2: Testing video call API...');

      // Test 2: Direct video call
      const videoCall = await videoCallService.initiateCall({
        initiatorWallet: user.walletAddress,
        receiverWallet: doctorWallet,
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        durationMinutes: 30
      });

      if (!videoCall.success) {
        throw new Error(videoCall.error || 'Failed to initiate video call');
      }

      setResult(`✅ Step 2: Video call initiated successfully!
📞 Call ID: ${videoCall.data.id}
🏠 Room ID: ${videoCall.data.roomId}
📊 Status: ${videoCall.data.status}
🎥 Daily.co Room: ${videoCall.data.dailyRoomUrl ? 'Available' : 'Not configured'}

🎉 Video consultation system is working!`);

    } catch (error: any) {
      console.error('Video call test failed:', error);
      setResult(`❌ Test failed: ${error.message || 'Unknown error'}

🔧 Troubleshooting:
• Check if server is running on localhost:5000
• Verify user authentication
• Ensure doctor wallet address is valid
• Check browser console for detailed errors`);
    } finally {
      setIsLoading(false);
    }
  };

  const testVideoCallHistory = async () => {
    if (!user?.walletAddress) {
      setResult('❌ Please log in first');
      return;
    }

    setIsLoading(true);
    try {
      const history = await videoCallService.getCallHistory(user.walletAddress);
      setResult(`📋 Call History Retrieved:
📞 Total calls: ${history.data?.length || 0}
${history.data?.map((call: any, index: number) => 
  `${index + 1}. ${call.status} - ${new Date(call.createdAt).toLocaleString()}`
).join('\n') || 'No calls found'}`);
    } catch (error: any) {
      setResult(`❌ Failed to get call history: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎥 Simple Video Call Demo
          </h1>
          <p className="text-gray-400">
            Test the video consultation system without complex UI
          </p>
        </div>

        {/* User Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Wallet:</span>
              <span className="text-white ml-2">{user?.walletAddress || 'Not logged in'}</span>
            </div>
            <div>
              <span className="text-gray-400">Role:</span>
              <span className="text-white ml-2">{user?.role || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2">{user?.profileData?.fullName || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 ${user ? 'text-green-400' : 'text-red-400'}`}>
                {user ? 'Authenticated' : 'Not authenticated'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Call Test */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🎥 Video Call Test</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Doctor Wallet Address
                </label>
                <input
                  type="text"
                  value={doctorWallet}
                  onChange={(e) => setDoctorWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={testVideoCall}
                disabled={isLoading || !user?.walletAddress}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Testing...' : '🧪 Test Video Call System'}
              </button>

              <button
                onClick={testVideoCallHistory}
                disabled={isLoading || !user?.walletAddress}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Loading...' : '📋 Get Call History'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Test Results</h3>
            
            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px]">
              {result ? (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {result}
                </pre>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">🎯</div>
                  <p>Click a test button to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🚀 Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.open('/consultations', '_blank')}
              className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-center"
            >
              💬 Open Consultations
            </button>
            
            <button
              onClick={() => window.open('/video-consultation-demo', '_blank')}
              className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-center"
            >
              🎥 Full Video Demo
            </button>
            
            <button
              onClick={() => setResult('')}
              className="p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-center"
            >
              🗑️ Clear Results
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">📖 Instructions</h3>
          
          <div className="space-y-3 text-sm text-blue-200">
            <p><strong>1. Authentication:</strong> Make sure you are logged in with a valid wallet address</p>
            <p><strong>2. Doctor Wallet:</strong> Enter any valid Ethereum wallet address (can be fake for testing)</p>
            <p><strong>3. Test Video Call:</strong> This will create a consultation and initiate a video call</p>
            <p><strong>4. Check Results:</strong> Look at the results panel for success/error messages</p>
            <p><strong>5. Troubleshooting:</strong> Check browser console for detailed error messages</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoDemo;