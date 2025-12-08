import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Beaker, Upload, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface UploadLabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const UploadLabResultModal: React.FC<UploadLabResultModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit({ ...data, file });
      onClose();
    } catch (error) {
      console.error('Failed to upload lab result:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
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
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Upload Lab Result</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Name *</label>
                <input
                  {...register('testName', { required: 'Test name is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Complete Blood Count"
                />
                {errors.testName && <p className="text-red-500 text-sm mt-1">{errors.testName.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type *</label>
                <select
                  {...register('testType', { required: 'Test type is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                >
                  <option value="">Select test type</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Urine Test">Urine Test</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="Other">Other</option>
                </select>
                {errors.testType && <p className="text-red-500 text-sm mt-1">{errors.testType.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Results *</label>
                <textarea
                  {...register('results', { required: 'Results are required' })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter test results (e.g., WBC: 7.5, RBC: 5.2, Hemoglobin: 14.5)"
                />
                {errors.results && <p className="text-red-500 text-sm mt-1">{errors.results.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Normal Range *</label>
                <textarea
                  {...register('normalRange', { required: 'Normal range is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter normal range (e.g., WBC: 4-11, RBC: 4.5-5.5, Hb: 13-17)"
                />
                {errors.normalRange && <p className="text-red-500 text-sm mt-1">{errors.normalRange.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Result File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-medical-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer text-medical-600 hover:text-medical-700">
                    Click to upload PDF, JPG, or PNG
                  </label>
                  {file && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">{file.name}</p>
                      <p className="text-xs text-green-600">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Any additional observations or notes..."
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> Results will be sent to the doctor for approval before being visible to the patient.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Result'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
