import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Beaker, Loader2, Upload, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { ipfsService } from '../../services/ipfs';
import { Modal } from '../../services/modalService';

interface UploadLabResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  labTest: any;
  onSuccess?: () => void;
}

export const UploadLabResultsModal: React.FC<UploadLabResultsModalProps> = ({
  isOpen,
  onClose,
  labTest,
  onSuccess
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Upload files to IPFS first
      let attachments: string[] = [];
      if (files.length > 0) {
        setUploadingFiles(true);
        const uploadPromises = files.map(file => 
          ipfsService.uploadFile(file, {
            name: `lab-result-${labTest.id}-${file.name}`,
            keyvalues: {
              type: 'lab-result',
              testId: labTest.id,
              patientWallet: labTest.patientWalletAddress
            }
          })
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        attachments = uploadResults
          .filter(result => result.success)
          .map(result => result.ipfsHash || '');
        setUploadingFiles(false);
      }

      // Upload lab results
      const response = await axios.post('/lab-results/upload', {
        patientWalletAddress: labTest.patientWalletAddress,
        testId: labTest.id,
        results: data.results,
        notes: data.notes,
        interpretation: data.interpretation,
        normalRange: data.normalRange,
        unit: data.unit,
        performedBy: user?.walletAddress,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      if (response.data.success) {
        Modal.error('Lab results uploaded successfully!', 'Alert');
        reset();
        setFiles([]);
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to upload lab results:', error);
      Modal.error(error.response?.data?.message || 'Failed to upload lab results', 'Alert');
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setFiles([]);
      onClose();
    }
  };

  if (!labTest) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Upload Lab Results</h2>
                  <p className="text-sm text-gray-600">{labTest.testName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Test Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-3">Test Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Test Type:</span>
                    <p className="font-medium text-gray-900">{labTest.testType}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Test Name:</span>
                    <p className="font-medium text-gray-900">{labTest.testName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <p className="font-medium text-gray-900 capitalize">{labTest.priority || 'Routine'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Ordered:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(labTest.createdAt || labTest.orderedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {labTest.instructions && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <span className="text-gray-600 text-sm">Instructions:</span>
                    <p className="text-gray-900 mt-1">{labTest.instructions}</p>
                  </div>
                )}
                {labTest.reason && (
                  <div className="mt-2">
                    <span className="text-gray-600 text-sm">Reason:</span>
                    <p className="text-gray-900 mt-1">{labTest.reason}</p>
                  </div>
                )}
              </div>

              {/* Results Form */}
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* Test Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Results *
                  </label>
                  <textarea
                    {...register('results', { required: 'Test results are required' })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="e.g., WBC: 7.5 × 10³/μL&#10;RBC: 5.2 × 10⁶/μL&#10;Hemoglobin: 14.5 g/dL&#10;Platelets: 250 × 10³/μL"
                  />
                  {errors.results && (
                    <p className="text-red-500 text-sm mt-1">{errors.results.message as string}</p>
                  )}
                </div>

                {/* Normal Range and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Normal Range
                    </label>
                    <input
                      {...register('normalRange')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 4.5-11.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <input
                      {...register('unit')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., × 10³/μL"
                    />
                  </div>
                </div>

                {/* Interpretation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interpretation *
                  </label>
                  <textarea
                    {...register('interpretation', { required: 'Interpretation is required' })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., All values within normal range. No abnormalities detected."
                  />
                  {errors.interpretation && (
                    <p className="text-red-500 text-sm mt-1">{errors.interpretation.message as string}</p>
                  )}
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Sample collected at 8:00 AM, processed at 10:00 AM"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach Files (PDF, Images)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                      Click to upload or drag and drop
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB each</p>
                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                            <FileText className="w-4 h-4" />
                            <span className="flex-1 text-left">{file.name}</span>
                            <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadingFiles && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-700">Uploading files to IPFS...</span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingFiles}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Results
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
