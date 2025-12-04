// Mock consent controller with test data
export const grantConsent = async (req, res) => {
  console.log('Grant consent called with:', req.body);
  
  const { patientWallet, doctorWallet, permissionType, durationHours } = req.body;
  
  if (!patientWallet || !doctorWallet || !permissionType) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'patientWallet, doctorWallet, and permissionType are required'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Consent granted successfully',
    consent: {
      id: Math.floor(Math.random() * 1000),
      patientWallet,
      doctorWallet,
      permissionType,
      durationHours: durationHours || 24,
      expiresAt: new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  });
};

export const revokeConsent = async (req, res) => {
  console.log('Revoke consent called with:', req.body);
  
  const { consentId } = req.body;
  
  if (!consentId) {
    return res.status(400).json({
      error: 'Missing consentId',
      message: 'consentId is required to revoke consent'
    });
  }

  res.json({
    success: true,
    message: 'Consent revoked successfully',
    consentId
  });
};

export const getConsents = async (req, res) => {
  const { patientWallet } = req.params;
  console.log('Get consents called for:', patientWallet);
  
  res.json({
    success: true,
    consents: [
      {
        id: 1,
        patientWallet,
        doctorWallet: '0xDoctor123',
        permissionType: 'read_records',
        durationHours: 24,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        patientWallet, 
        doctorWallet: '0xDoctor456',
        permissionType: 'write_prescriptions',
        durationHours: 48,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ]
  });
};
