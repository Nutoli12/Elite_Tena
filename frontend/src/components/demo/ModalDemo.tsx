import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Trash2,
  Save,
  Upload,
  Download
} from 'lucide-react';
import { Modal } from '../../services/modalService';

export const ModalDemo: React.FC = () => {
  const demoButtons = [
    {
      title: 'Success Modal',
      description: 'Show success with confetti',
      icon: CheckCircle,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => Modal.showSuccess({
        title: 'Operation Successful!',
        message: 'Your data has been saved successfully.',
        showConfetti: true
      })
    },
    {
      title: 'Error Modal',
      description: 'Show error with retry option',
      icon: AlertCircle,
      color: 'bg-red-600 hover:bg-red-700',
      action: () => Modal.showError({
        title: 'Upload Failed',
        message: 'Failed to upload file. Please check your connection and try again.',
        showRetry: true,
        onRetry: () => console.log('Retrying upload...')
      })
    },
    {
      title: 'Info Modal',
      description: 'Show information',
      icon: Info,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => Modal.showInfo({
        title: 'System Information',
        message: 'Your account has been updated with the latest security features.'
      })
    },
    {
      title: 'Warning Modal',
      description: 'Show warning message',
      icon: AlertTriangle,
      color: 'bg-amber-600 hover:bg-amber-700',
      action: () => Modal.showWarning({
        title: 'Storage Almost Full',
        message: 'You are using 95% of your storage space. Consider upgrading your plan.'
      })
    },
    {
      title: 'Confirm Delete',
      description: 'Dangerous confirmation',
      icon: Trash2,
      color: 'bg-red-600 hover:bg-red-700',
      action: () => Modal.showConfirm({
        title: 'Delete Account',
        message: 'Are you sure you want to delete your account? This action cannot be undone.',
        confirmText: 'Delete Forever',
        cancelText: 'Keep Account',
        type: 'danger',
        onConfirm: () => console.log('Account deleted!')
      })
    },
    {
      title: 'Confirm Save',
      description: 'Standard confirmation',
      icon: Save,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => Modal.showConfirm({
        title: 'Save Changes',
        message: 'Do you want to save your changes before leaving?',
        confirmText: 'Save',
        cancelText: 'Discard',
        type: 'info',
        onConfirm: () => console.log('Changes saved!')
      })
    },
    {
      title: 'Simple Alert',
      description: 'Basic alert message',
      icon: Info,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: () => Modal.alert('This is a simple alert message', 'Alert')
    },
    {
      title: 'Loading Modal',
      description: 'Modal with loading state',
      icon: Upload,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: async () => {
        // Simulate async operation
        await Modal.showSuccess({
          title: 'Processing...',
          message: 'Please wait while we process your request.',
          loading: true,
          onConfirm: async () => {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        });
      }
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🎨 Modal System Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Beautiful, animated modals that replace browser alerts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoButtons.map((button, index) => {
          const Icon = button.icon;
          
          return (
            <motion.div
              key={button.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${button.color} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {button.title}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {button.description}
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={button.action}
                  className={`
                    w-full px-4 py-2 rounded-lg font-medium text-white
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${button.color}
                  `}
                >
                  Try It
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🚀 Usage Examples
        </h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Simple Success</h3>
            <code className="text-sm text-green-600 dark:text-green-400">
              Modal.success('Operation completed!', 'Success');
            </code>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Error with Retry</h3>
            <code className="text-sm text-red-600 dark:text-red-400">
              {`Modal.showError({
  title: 'Upload Failed',
  message: 'Please try again.',
  showRetry: true,
  onRetry: () => handleRetry()
});`}
            </code>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Confirmation Dialog</h3>
            <code className="text-sm text-blue-600 dark:text-blue-400">
              {`Modal.showConfirm({
  title: 'Delete Item',
  message: 'Are you sure?',
  onConfirm: () => deleteItem(),
  type: 'danger'
});`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};