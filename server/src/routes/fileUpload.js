import express from 'express';
const router = express.Router();
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ipfsService = require('../../services/ipfs.cjs');
const blockchainService = require('../../services/blockchain.cjs');
import fileUploadMiddleware, { handleUploadError } from '../../middleware/fileUpload.js';
const fileUpload = fileUploadMiddleware;
import db from '../models/index.js';
const { MedicalRecord, Prescription, LabResult } = db;

/**
 * File Upload Routes
 * Handles medical file uploads with IPFS integration
 */

/**
 * Upload medical record file
 * POST /api/upload/medical-record
 */
router.post('/medical-record',
  fileUpload.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      const { patientWallet, doctorWallet, recordType, title, description, diagnosis } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!patientWallet || !doctorWallet) {
        return res.status(400).json({ error: 'Patient and doctor wallet addresses required' });
      }

      console.log('📤 Uploading medical record...');
      console.log('   File:', req.file.originalname);
      console.log('   Size:', req.file.size, 'bytes');
      console.log('   Type:', req.file.mimetype);

      // 1. Upload to IPFS (encrypted)
      const ipfsResult = await ipfsService.uploadMedicalFile(
        req.file.buffer,
        patientWallet,
        doctorWallet,
        {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          recordType: recordType || 'medical_record'
        }
      );

      console.log('✅ File uploaded to IPFS:', ipfsResult.cid);

      // 2. Store in database
      const medicalRecord = await MedicalRecord.create({
        patientWalletAddress: patientWallet.toLowerCase(),
        doctorWalletAddress: doctorWallet.toLowerCase(),
        recordType: recordType || 'consultation',
        title: title || req.file.originalname,
        description: description || '',
        diagnosis: diagnosis || '',
        ipfsHash: ipfsResult.cid,
        fileUrl: ipfsService.getGatewayUrl(ipfsResult.cid),
        visitDate: new Date(),
        isEncrypted: true
      });

      console.log('✅ Record saved to database:', medicalRecord.id);

      // 3. Store hash on blockchain (optional - can be done separately)
      // This requires a wallet with gas, so we'll skip for now
      // In production, this would be triggered by the frontend

      res.json({
        success: true,
        message: 'Medical record uploaded successfully',
        data: {
          recordId: medicalRecord.id,
          ipfsHash: ipfsResult.cid,
          ipfsUrl: ipfsService.getGatewayUrl(ipfsResult.cid),
          fileSize: ipfsResult.size,
          uploadDate: ipfsResult.timestamp,
          encrypted: true
        }
      });
    } catch (error) {
      console.error('❌ Upload failed:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

/**
 * Download medical record file
 * GET /api/upload/medical-record/:cid
 */
router.get('/medical-record/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const { patientWallet, doctorWallet } = req.query;

    if (!patientWallet || !doctorWallet) {
      return res.status(400).json({ error: 'Patient and doctor wallet addresses required' });
    }

    console.log('📥 Downloading medical record...');
    console.log('   CID:', cid);

    // 1. Verify access (check consent on blockchain)
    const hasConsent = await blockchainService.checkActiveConsent(
      patientWallet,
      doctorWallet,
      'MedicalRecords'
    );

    if (!hasConsent && patientWallet.toLowerCase() !== doctorWallet.toLowerCase()) {
      return res.status(403).json({ error: 'No active consent for this record' });
    }

    // 2. Download and decrypt from IPFS
    const fileBuffer = await ipfsService.retrieveMedicalFile(
      cid,
      patientWallet,
      doctorWallet
    );

    // 3. Get file metadata from database
    const record = await MedicalRecord.findOne({
      where: { ipfsHash: cid }
    });

    // 4. Send file
    res.set({
      'Content-Type': record?.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${record?.title || 'medical-record'}"`,
      'Content-Length': fileBuffer.length
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('❌ Download failed:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

/**
 * Upload prescription file
 * POST /api/upload/prescription
 */
router.post('/prescription',
  fileUpload.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      const { patientWallet, doctorWallet, prescriptionId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadMedicalFile(
        req.file.buffer,
        patientWallet,
        doctorWallet,
        {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          recordType: 'prescription'
        }
      );

      // Update prescription in database
      if (prescriptionId) {
        await Prescription.update(
          {
            ipfsHash: ipfsResult.cid,
            fileUrl: ipfsService.getGatewayUrl(ipfsResult.cid)
          },
          { where: { id: prescriptionId } }
        );
      }

      res.json({
        success: true,
        message: 'Prescription file uploaded successfully',
        data: {
          ipfsHash: ipfsResult.cid,
          ipfsUrl: ipfsService.getGatewayUrl(ipfsResult.cid)
        }
      });
    } catch (error) {
      console.error('❌ Prescription upload failed:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

/**
 * Upload lab result file
 * POST /api/upload/lab-result
 */
router.post('/lab-result',
  fileUpload.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      const { patientWallet, labTechWallet, resultId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadMedicalFile(
        req.file.buffer,
        patientWallet,
        labTechWallet,
        {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          recordType: 'lab_result'
        }
      );

      // Update lab result in database
      if (resultId) {
        await LabResult.update(
          {
            ipfsHash: ipfsResult.cid,
            fileUrl: ipfsService.getGatewayUrl(ipfsResult.cid)
          },
          { where: { id: resultId } }
        );
      }

      res.json({
        success: true,
        message: 'Lab result file uploaded successfully',
        data: {
          ipfsHash: ipfsResult.cid,
          ipfsUrl: ipfsService.getGatewayUrl(ipfsResult.cid)
        }
      });
    } catch (error) {
      console.error('❌ Lab result upload failed:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

/**
 * Get IPFS service status
 * GET /api/upload/status
 */
router.get('/status', async (req, res) => {
  try {
    const connectionTest = await ipfsService.testConnection();
    
    let usage = null;
    if (connectionTest.success) {
      try {
        usage = await ipfsService.getStorageUsage();
      } catch (err) {
        console.warn('Could not get storage usage:', err.message);
      }
    }

    res.json({
      ipfs: {
        connected: connectionTest.success,
        provider: 'Pinata',
        message: connectionTest.message
      },
      storage: usage ? {
        totalPins: usage.totalFiles,
        totalSize: usage.totalSizeGB + ' GB'
      } : null
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
});

export default router;
