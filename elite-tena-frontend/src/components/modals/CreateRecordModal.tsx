import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const CreateRecordModal: React.FC<CreateRecordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit({ ...data, file });
      reset();
      setFile(null);
      onClose();
    } catch (error) {
      console.error('Failed to create record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setFile(null);
      onClose();
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
              <h2 className="text-2xl font-bold text-gray-900">Create Medical Record</h2>
              <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Annual Checkup 2024"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                <textarea
                  {...register('diagnosis', { required: 'Diagnosis is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter diagnosis..."
                />
                {errors.diagnosis && <p className="text-red-500 text-sm mt-1">{errors.diagnosis.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment *</label>
                <textarea
                  {...register('treatment', { required: 'Treatment is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter treatment plan..."
                />
                {errors.treatment && <p className="text-red-500 text-sm mt-1">{errors.treatment.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                <input
                  {...register('symptoms')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Fever, cough, headache"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-medical-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer text-medical-600 hover:text-medical-700">
                    Click to upload or drag and drop
                  </label>
                  {file && <p className="text-sm text-gray-600 mt-2">{file.name}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {file ? 'Uploading...' : 'Creating...'}
                    </>
                  ) : (
                    'Create Record'
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
