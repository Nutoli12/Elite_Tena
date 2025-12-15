/**
 * 🎥 JITSI MEET VIDEO SERVICE
 * Handles Jitsi Meet integration for video consultations
 * 100% FREE - No API keys, no payments, no limits!
 */

class JitsiVideoService {
  constructor() {
    // No configuration needed - Jitsi is free!
    console.log('🎥 Jitsi Meet Video Service initialized (FREE)');
  }

  /**
   * Check if Jitsi is available (always true - it's free!)
   */
  isConfigured() {
    return true; // Always available!
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
      maxParticipants = 2,
      doctorName = 'Doctor',
      patientName = 'Patient'
    } = options;

    // Generate unique room name
    const timestamp = Date.now().toString().slice(-6);
    const shortId = consultationId.split('-')[0];
    const roomName = `EliteTena-Consultation-${shortId}-${timestamp}`;

    // Jitsi Meet URLs
    const baseUrl = 'https://meet.jit.si';
    const roomUrl = `${baseUrl}/${roomName}`;

    // Create participant-specific URLs with display names
    const doctorUrl = `${roomUrl}#userInfo.displayName=${encodeURIComponent(doctorName)}&config.startWithAudioMuted=false`;
    const patientUrl = `${roomUrl}#userInfo.displayName=${encodeURIComponent(patientName)}&config.startWithAudioMuted=false`;

    console.log('🎥 Creating Jitsi Meet room:', roomName);
    console.log('🌐 Room URL:', roomUrl);

    return {
      roomName,
      roomUrl,
      roomId: roomName, // Same as room name for Jitsi
      doctorUrl,
      patientUrl,
      expiresAt: null, // Jitsi rooms don't expire
      provider: 'jitsi',
      features: {
        video: true,
        audio: true,
        chat: true,
        screenShare: true,
        recording: true, // Available but requires user action
        whiteboard: false
      }
    };
  }

  /**
   * Generate meeting URL for a participant
   * @param {Object} options - Participant configuration
   * @returns {string} Meeting URL with participant info
   */
  async createMeetingUrl(options = {}) {
    const {
      roomName,
      participantName,
      isHost = false,
      userId = null
    } = options;

    const baseUrl = 'https://meet.jit.si';
    const displayName = encodeURIComponent(participantName);
    
    // Build URL with participant configuration
    let meetingUrl = `${baseUrl}/${roomName}`;
    
    // Add URL parameters for better UX
    const params = new URLSearchParams({
      'userInfo.displayName': participantName,
      'config.startWithAudioMuted': 'false',
      'config.startWithVideoMuted': 'false',
      'config.prejoinPageEnabled': 'false', // Skip pre-join page
      'config.requireDisplayName': 'true'
    });

    // Add host-specific parameters
    if (isHost) {
      params.set('config.enableWelcomePage', 'false');
      params.set('config.enableClosePage', 'false');
    }

    meetingUrl += '#' + params.toString();

    console.log(`🎫 Creating Jitsi meeting URL for ${participantName} (${isHost ? 'host' : 'participant'})`);
    
    return meetingUrl;
  }

  /**
   * Get room details (Jitsi rooms are always available)
   * @param {string} roomName - Room name
   * @returns {Object} Room details
   */
  async getRoom(roomName) {
    return {
      name: roomName,
      url: `https://meet.jit.si/${roomName}`,
      status: 'active',
      participants: 0, // Jitsi doesn't provide this via API
      created: new Date().toISOString(),
      provider: 'jitsi'
    };
  }

  /**
   * Delete a room (not needed for Jitsi - rooms auto-cleanup)
   * @param {string} roomName - Room name
   */
  async deleteRoom(roomName) {
    console.log('🗑️ Jitsi room cleanup (automatic):', roomName);
    // Jitsi rooms automatically clean up when empty
    return { success: true, message: 'Jitsi rooms auto-cleanup when empty' };
  }

  /**
   * Get active participants (not available via Jitsi public API)
   * @param {string} roomName - Room name
   * @returns {Object} Participant info
   */
  async getParticipants(roomName) {
    return {
      participants: [],
      count: 0,
      message: 'Participant info not available via Jitsi public API'
    };
  }

  /**
   * Create a complete video consultation setup
   * @param {Object} consultation - Consultation details
   * @returns {Object} Room and URLs
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
      maxParticipants: 2,
      doctorName,
      patientName
    });

    // Create participant URLs
    const [doctorMeetingUrl, patientMeetingUrl] = await Promise.all([
      this.createMeetingUrl({
        roomName: room.roomName,
        participantName: doctorName,
        isHost: true,
        userId: doctorWallet
      }),
      this.createMeetingUrl({
        roomName: room.roomName,
        participantName: patientName,
        isHost: false,
        userId: patientWallet
      })
    ]);

    return {
      roomName: room.roomName,
      roomUrl: room.roomUrl,
      roomId: room.roomId,
      expiresAt: room.expiresAt,
      doctorUrl: doctorMeetingUrl,
      patientUrl: patientMeetingUrl,
      // For compatibility with existing code
      doctorToken: 'jitsi-no-token-needed',
      patientToken: 'jitsi-no-token-needed',
      doctorJoinUrl: doctorMeetingUrl,
      patientJoinUrl: patientMeetingUrl,
      provider: 'jitsi',
      features: room.features
    };
  }

  /**
   * Handle Jitsi webhook events (not available in public Jitsi)
   * @param {Object} event - Webhook event data
   */
  async handleWebhook(event) {
    console.log('📡 Jitsi webhook (not available in public version):', event);
    return { 
      action: 'not_supported', 
      message: 'Webhooks not available in public Jitsi Meet' 
    };
  }

  /**
   * Get Jitsi Meet configuration for embedding
   * @param {Object} options - Configuration options
   * @returns {Object} Jitsi configuration
   */
  getEmbedConfig(options = {}) {
    const {
      roomName,
      participantName = 'User',
      isHost = false,
      width = '100%',
      height = '600px'
    } = options;

    return {
      domain: 'meet.jit.si',
      roomName,
      width,
      height,
      parentNode: null, // Will be set by frontend
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false,
        prejoinPageEnabled: false,
        requireDisplayName: true,
        disableInviteFunctions: true,
        doNotStoreRoom: true,
        // Medical consultation optimizations
        resolution: 720,
        constraints: {
          video: {
            aspectRatio: 16 / 9,
            height: { ideal: 720, max: 1080, min: 240 }
          }
        }
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 
          'fullscreen', 'fodeviceselection', 'hangup', 'profile',
          'chat', 'recording', 'livestreaming', 'etherpad', 
          'sharedvideo', 'settings', 'raisehand', 'videoquality',
          'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help'
        ],
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        DEFAULT_BACKGROUND: '#474747',
        DISABLE_VIDEO_BACKGROUND: false,
        INITIAL_TOOLBAR_TIMEOUT: 20000,
        TOOLBAR_TIMEOUT: 4000,
        TOOLBAR_ALWAYS_VISIBLE: false
      },
      userInfo: {
        displayName: participantName
      }
    };
  }

  /**
   * Generate iframe HTML for embedding Jitsi
   * @param {Object} options - Iframe options
   * @returns {string} HTML iframe code
   */
  generateIframeHtml(options = {}) {
    const {
      roomName,
      participantName = 'User',
      width = '100%',
      height = '600px'
    } = options;

    const meetingUrl = `https://meet.jit.si/${roomName}#userInfo.displayName=${encodeURIComponent(participantName)}`;

    return `
      <iframe
        src="${meetingUrl}"
        width="${width}"
        height="${height}"
        frameborder="0"
        allow="camera; microphone; fullscreen; speaker; display-capture"
        style="border-radius: 8px; border: none;"
        title="Elite-Tena Video Consultation">
      </iframe>
    `;
  }
}

// Export singleton instance
export default new JitsiVideoService();