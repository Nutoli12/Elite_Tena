/**
 * 🎥 DAILY.CO VIDEO SERVICE
 * Handles Daily.co API integration for video consultations
 */

const DAILY_API_URL = 'https://api.daily.co/v1';

class DailyVideoService {
  constructor() {
    // Environment variables will be loaded lazily
  }

  /**
   * Get API key (lazy loaded)
   */
  get apiKey() {
    return process.env.DAILY_API_KEY;
  }

  /**
   * Get domain (lazy loaded)
   */
  get domain() {
    return process.env.DAILY_DOMAIN;
  }

  /**
   * Check if Daily.co is configured
   */
  isConfigured() {
    const configured = !!(this.apiKey && this.domain);
    console.log(`🎥 Daily.co Configuration Check:`, {
      hasApiKey: !!this.apiKey,
      hasDomain: !!this.domain,
      configured,
      apiKeyPreview: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'Missing',
      domain: this.domain || 'Missing'
    });
    return configured;
  }

  /**
   * Make API request to Daily.co
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    if (!this.isConfigured()) {
      throw new Error('Daily.co is not configured. Set DAILY_API_KEY and DAILY_DOMAIN environment variables.');
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${DAILY_API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Daily.co API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        endpoint,
        method,
        requestBody: body,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Daily.co API error: ${response.status} - ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new video room for consultation
   * @param {Object} options - Room configuration
   * @returns {Object} Room details including URL and name
   */
  async createRoom(options = {}) {
    const {
      consultationId,
      durationMinutes = 30,
      startTime = null,
      enableRecording = false,
      maxParticipants = 2
    } = options;

    // Generate unique room name (Daily.co has limits on room name length)
    const shortId = consultationId.split('-')[0]; // Use first part of UUID
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const roomName = `consult-${shortId}-${timestamp}`;

    // Calculate expiration (room expires 1 hour after scheduled end)
    const expiryTime = startTime 
      ? new Date(new Date(startTime).getTime() + (durationMinutes + 60) * 60 * 1000)
      : new Date(Date.now() + (durationMinutes + 60) * 60 * 1000);

    const roomConfig = {
      name: roomName,
      privacy: 'private', // Requires token to join
      properties: {
        max_participants: maxParticipants,
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(expiryTime.getTime() / 1000) // Unix timestamp
        // Removed unsupported properties: eject_at_room_exp, enable_knocking, autojoin
      }
    };

    // Only add enable_recording if explicitly enabled
    if (enableRecording) {
      roomConfig.properties.enable_recording = 'cloud';
    }

    console.log('🎥 Creating Daily.co room:', roomName);
    console.log('🎥 Room config:', JSON.stringify(roomConfig, null, 2));
    
    const room = await this.makeRequest('/rooms', 'POST', roomConfig);

    return {
      roomName: room.name,
      roomUrl: room.url,
      roomId: room.id,
      expiresAt: new Date(room.config.exp * 1000)
    };
  }

  /**
   * Generate meeting token for a participant
   * @param {Object} options - Token configuration
   * @returns {string} Meeting token
   */
  async createMeetingToken(options = {}) {
    const {
      roomName,
      participantName,
      isHost = false,
      durationMinutes = 60,
      userId = null
    } = options;

    // Token expires after the meeting duration + buffer
    const expiryTime = new Date(Date.now() + (durationMinutes + 30) * 60 * 1000);

    const tokenConfig = {
      properties: {
        room_name: roomName,
        user_name: participantName,
        user_id: userId,
        is_owner: isHost, // Host can admit participants, end call, etc.
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(expiryTime.getTime() / 1000)
        // Removed invalid properties: can_admin, enable_recording for tokens
      }
    };

    console.log(`🎫 Creating meeting token for ${participantName} (${isHost ? 'host' : 'participant'})`);
    
    const token = await this.makeRequest('/meeting-tokens', 'POST', tokenConfig);

    return token.token;
  }

  /**
   * Get room details
   * @param {string} roomName - Room name
   * @returns {Object} Room details
   */
  async getRoom(roomName) {
    return this.makeRequest(`/rooms/${roomName}`);
  }

  /**
   * Delete a room
   * @param {string} roomName - Room name
   */
  async deleteRoom(roomName) {
    console.log('🗑️ Deleting Daily.co room:', roomName);
    return this.makeRequest(`/rooms/${roomName}`, 'DELETE');
  }

  /**
   * Get active participants in a room
   * @param {string} roomName - Room name
   * @returns {Object} Participant info
   */
  async getParticipants(roomName) {
    return this.makeRequest(`/rooms/${roomName}/presence`);
  }

  /**
   * Get meeting recordings
   * @param {string} roomName - Room name
   * @returns {Array} Recording list
   */
  async getRecordings(roomName) {
    const recordings = await this.makeRequest(`/recordings?room_name=${roomName}`);
    return recordings.data || [];
  }

  /**
   * Create a complete video consultation setup
   * @param {Object} consultation - Consultation details
   * @returns {Object} Room and tokens
   */
  async setupVideoConsultation(consultation) {
    const {
      id: consultationId,
      patientWallet,
      doctorWallet,
      scheduledTime,
      durationMinutes = 30,
      patientName = 'Patient',
      doctorName = 'Doctor'
    } = consultation;

    // Create the room
    const room = await this.createRoom({
      consultationId,
      durationMinutes,
      startTime: scheduledTime,
      enableRecording: false, // Can be enabled later with consent
      maxParticipants: 2
    });

    // Create tokens for both participants
    const [doctorToken, patientToken] = await Promise.all([
      this.createMeetingToken({
        roomName: room.roomName,
        participantName: doctorName,
        isHost: true,
        durationMinutes,
        userId: doctorWallet
      }),
      this.createMeetingToken({
        roomName: room.roomName,
        participantName: patientName,
        isHost: false,
        durationMinutes,
        userId: patientWallet
      })
    ]);

    return {
      roomName: room.roomName,
      roomUrl: room.roomUrl,
      roomId: room.roomId,
      expiresAt: room.expiresAt,
      doctorToken,
      patientToken,
      // Full URLs with tokens
      doctorJoinUrl: `${room.roomUrl}?t=${doctorToken}`,
      patientJoinUrl: `${room.roomUrl}?t=${patientToken}`
    };
  }

  /**
   * Handle Daily.co webhook events
   * @param {Object} event - Webhook event data
   */
  async handleWebhook(event) {
    const { event: eventType, payload } = event;

    console.log(`📡 Daily.co webhook: ${eventType}`, payload?.room_name);

    switch (eventType) {
      case 'meeting.started':
        return { action: 'meeting_started', roomName: payload.room_name };
      
      case 'meeting.ended':
        return { action: 'meeting_ended', roomName: payload.room_name };
      
      case 'participant.joined':
        return { 
          action: 'participant_joined', 
          roomName: payload.room_name,
          userId: payload.user_id,
          userName: payload.user_name
        };
      
      case 'participant.left':
        return { 
          action: 'participant_left', 
          roomName: payload.room_name,
          userId: payload.user_id,
          duration: payload.duration
        };
      
      case 'recording.ready':
        return {
          action: 'recording_ready',
          roomName: payload.room_name,
          recordingId: payload.recording_id,
          downloadUrl: payload.download_link
        };
      
      default:
        return { action: 'unknown', eventType };
    }
  }
}

// Export singleton instance
export default new DailyVideoService();
