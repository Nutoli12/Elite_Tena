// Auto-generated alert replacement script
// Run this to replace alert() calls with notification system

const replacements = [
  {
    file: 'frontend\src\components\Chat.tsx',
    line: 182,
    original: 'alert(\'Failed to send message. Please try again.\')',
    replacement: 'showError(\'Failed to send message. Please try again.\')'
  },
  {
    file: 'frontend\src\components\Chat.tsx',
    line: 234,
    original: 'alert(\'Failed to upload file. Please try again.\')',
    replacement: 'showError(\'Failed to upload file. Please try again.\')'
  },
  {
    file: 'frontend\src\components\consent\ConsentGate.tsx',
    line: 50,
    original: 'alert(\'Consent request sent to patient successfully!\')',
    replacement: 'showSuccess(\'Consent request sent to patient successfully!\')'
  },
  {
    file: 'frontend\src\components\consent\ConsentGate.tsx',
    line: 52,
    original: 'alert(`Failed to request consent: ${error.message}`)',
    replacement: 'showError(\'Failed to request consent: ${error.message}\')'
  },
  {
    file: 'frontend\src\components\consent\ConsentGate.tsx',
    line: 60,
    original: 'alert(\'Emergency justification is required\')',
    replacement: 'showInfo(\'Emergency justification is required\')'
  },
  {
    file: 'frontend\src\components\consent\ConsentGate.tsx',
    line: 67,
    original: 'alert(\'Emergency access granted\')',
    replacement: 'showInfo(\'Emergency access granted\')'
  },
  {
    file: 'frontend\src\components\consent\ConsentGate.tsx',
    line: 70,
    original: 'alert(`Emergency access denied: ${error.message}`)',
    replacement: 'showError(\'Emergency access denied: ${error.message}\')'
  },
  {
    file: 'frontend\src\components\doctor\PatientQueue.tsx',
    line: 46,
    original: 'alert(\'Patient called successfully!\')',
    replacement: 'showSuccess(\'Patient called successfully!\')'
  },
  {
    file: 'frontend\src\components\doctor\PatientQueue.tsx',
    line: 51,
    original: 'alert(\'Failed to call patient\')',
    replacement: 'showError(\'Failed to call patient\')'
  },
  {
    file: 'frontend\src\components\doctor\PaymentReceiptsReview.tsx',
    line: 58,
    original: 'alert(\'Payment confirmed! Patient can now chat with you.\')',
    replacement: 'showInfo(\'Payment confirmed! Patient can now chat with you.\')'
  },
  {
    file: 'frontend\src\components\doctor\PaymentReceiptsReview.tsx',
    line: 64,
    original: 'alert(\'Failed to confirm payment\')',
    replacement: 'showError(\'Failed to confirm payment\')'
  },
  {
    file: 'frontend\src\components\doctor\PaymentReceiptsReview.tsx',
    line: 82,
    original: 'alert(\'Payment rejected. Patient has been notified.\')',
    replacement: 'showInfo(\'Payment rejected. Patient has been notified.\')'
  },
  {
    file: 'frontend\src\components\doctor\PaymentReceiptsReview.tsx',
    line: 88,
    original: 'alert(\'Failed to reject payment\')',
    replacement: 'showError(\'Failed to reject payment\')'
  },
  {
    file: 'frontend\src\components\modals\CreatePrescriptionModal.tsx',
    line: 58,
    original: 'alert(\'Prescription created successfully!\')',
    replacement: 'showSuccess(\'Prescription created successfully!\')'
  },
  {
    file: 'frontend\src\components\modals\DispensePrescriptionModal.tsx',
    line: 61,
    original: 'alert(\'Prescription dispensed successfully!\')',
    replacement: 'showSuccess(\'Prescription dispensed successfully!\')'
  },
  {
    file: 'frontend\src\components\modals\DoctorApprovalModal.tsx',
    line: 37,
    original: 'alert(\'Appointment approved! Patient will receive payment details.\')',
    replacement: 'showInfo(\'Appointment approved! Patient will receive payment details.\')'
  },
  {
    file: 'frontend\src\components\modals\DoctorApprovalModal.tsx',
    line: 43,
    original: 'alert(\'Failed to approve appointment\')',
    replacement: 'showError(\'Failed to approve appointment\')'
  },
  {
    file: 'frontend\src\components\modals\DoctorApprovalModal.tsx',
    line: 51,
    original: 'alert(\'Please provide a reason for rejection\')',
    replacement: 'showInfo(\'Please provide a reason for rejection\')'
  },
  {
    file: 'frontend\src\components\modals\DoctorApprovalModal.tsx',
    line: 63,
    original: 'alert(\'Appointment rejected. Patient has been notified.\')',
    replacement: 'showInfo(\'Appointment rejected. Patient has been notified.\')'
  },
  {
    file: 'frontend\src\components\modals\DoctorApprovalModal.tsx',
    line: 69,
    original: 'alert(\'Failed to reject appointment\')',
    replacement: 'showError(\'Failed to reject appointment\')'
  },
  {
    file: 'frontend\src\components\modals\ManualGrantModal.tsx',
    line: 33,
    original: 'alert(\'Please fill in all required fields\')',
    replacement: 'showInfo(\'Please fill in all required fields\')'
  },
  {
    file: 'frontend\src\components\modals\ManualGrantModal.tsx',
    line: 59,
    original: 'alert(\'Access granted to pharmacy!\')',
    replacement: 'showInfo(\'Access granted to pharmacy!\')'
  },
  {
    file: 'frontend\src\components\modals\OrderLabTestModal.tsx',
    line: 77,
    original: 'alert(\'Lab test ordered successfully!\')',
    replacement: 'showSuccess(\'Lab test ordered successfully!\')'
  },
  {
    file: 'frontend\src\components\modals\PaymentDetailsModal.tsx',
    line: 48,
    original: 'alert(\'Failed to load payment details\')',
    replacement: 'showError(\'Failed to load payment details\')'
  },
  {
    file: 'frontend\src\components\modals\PaymentModal.tsx',
    line: 409,
    original: 'alert(\'Payment not yet completed. Please complete the payment first.\')',
    replacement: 'showSuccess(\'Payment not yet completed. Please complete the payment first.\')'
  },
  {
    file: 'frontend\src\components\modals\PaymentModal.tsx',
    line: 412,
    original: 'alert(\'Unable to verify payment. Please try again.\')',
    replacement: 'showInfo(\'Unable to verify payment. Please try again.\')'
  },
  {
    file: 'frontend\src\components\modals\QuickApproveModal.tsx',
    line: 40,
    original: 'alert(\'Access granted to pharmacy!\')',
    replacement: 'showInfo(\'Access granted to pharmacy!\')'
  },
  {
    file: 'frontend\src\components\modals\RequestAccessModal.tsx',
    line: 53,
    original: 'alert(\'Please log in again to continue\')',
    replacement: 'showInfo(\'Please log in again to continue\')'
  },
  {
    file: 'frontend\src\components\modals\RevokeAccessModal.tsx',
    line: 34,
    original: 'alert(\'Access revoked successfully!\')',
    replacement: 'showSuccess(\'Access revoked successfully!\')'
  },
  {
    file: 'frontend\src\components\modals\UploadLabResultsModal.tsx',
    line: 73,
    original: 'alert(\'Lab results uploaded successfully!\')',
    replacement: 'showSuccess(\'Lab results uploaded successfully!\')'
  },
  {
    file: 'frontend\src\components\modals\UploadReceiptModal.tsx',
    line: 38,
    original: 'alert(\'Please select a receipt image\')',
    replacement: 'showInfo(\'Please select a receipt image\')'
  },
  {
    file: 'frontend\src\components\modals\UploadReceiptModal.tsx',
    line: 54,
    original: 'alert(\'Receipt uploaded successfully! Doctor will verify your payment.\')',
    replacement: 'showSuccess(\'Receipt uploaded successfully! Doctor will verify your payment.\')'
  },
  {
    file: 'frontend\src\components\modals\UploadReceiptModal.tsx',
    line: 61,
    original: 'alert(\'Failed to upload receipt. Please try again.\')',
    replacement: 'showError(\'Failed to upload receipt. Please try again.\')'
  },
  {
    file: 'frontend\src\components\VideoCall.tsx',
    line: 118,
    original: 'alert(\'Failed to access camera/microphone. Please check permissions.\')',
    replacement: 'showError(\'Failed to access camera/microphone. Please check permissions.\')'
  },
  {
    file: 'frontend\src\contexts\Web3Context.tsx',
    line: 109,
    original: 'alert(\'Please install MetaMask!\')',
    replacement: 'showInfo(\'Please install MetaMask!\')'
  },
  {
    file: 'frontend\src\contexts\Web3Context.tsx',
    line: 135,
    original: 'alert(`Failed to connect wallet: ${error.message}`)',
    replacement: 'showError(\'Failed to connect wallet: ${error.message}\')'
  },
  {
    file: 'frontend\src\pages\admin\AdminStaff.tsx',
    line: 26,
    original: 'alert(\'Staff member registered successfully!\')',
    replacement: 'showSuccess(\'Staff member registered successfully!\')'
  },
  {
    file: 'frontend\src\pages\admin\AdminStaff.tsx',
    line: 36,
    original: 'alert(\'Failed to register staff member\')',
    replacement: 'showError(\'Failed to register staff member\')'
  },
  {
    file: 'frontend\src\pages\admin\AdminUsers.tsx',
    line: 58,
    original: 'alert(\'Failed to update user status\')',
    replacement: 'showError(\'Failed to update user status\')'
  },
  {
    file: 'frontend\src\pages\admin\StaffManagement.tsx',
    line: 62,
    original: 'alert(\'Failed to delete staff member. Please try again.\')',
    replacement: 'showError(\'Failed to delete staff member. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\admin\StaffManagement.tsx',
    line: 82,
    original: 'alert(\'Failed to update staff status. Please try again.\')',
    replacement: 'showError(\'Failed to update staff status. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\admin\SystemSettings.tsx',
    line: 48,
    original: 'alert(\'Settings saved successfully!\')',
    replacement: 'showSuccess(\'Settings saved successfully!\')'
  },
  {
    file: 'frontend\src\pages\Appointments.tsx',
    line: 55,
    original: 'alert(\'Appointment booked successfully!\')',
    replacement: 'showSuccess(\'Appointment booked successfully!\')'
  },
  {
    file: 'frontend\src\pages\Appointments.tsx',
    line: 61,
    original: 'alert(\'Failed to book appointment. Please try again.\')',
    replacement: 'showError(\'Failed to book appointment. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\Appointments.tsx',
    line: 80,
    original: 'alert(\'Payment completed successfully!\')',
    replacement: 'showSuccess(\'Payment completed successfully!\')'
  },
  {
    file: 'frontend\src\pages\Appointments.tsx',
    line: 92,
    original: 'alert(\'Note saved successfully. Doctor has been notified.\')',
    replacement: 'showSuccess(\'Note saved successfully. Doctor has been notified.\')'
  },
  {
    file: 'frontend\src\pages\Appointments.tsx',
    line: 105,
    original: 'alert(\'Appointment rescheduled successfully\')',
    replacement: 'showSuccess(\'Appointment rescheduled successfully\')'
  },
  {
    file: 'frontend\src\pages\doctor\ComprehensiveConsultation.tsx',
    line: 225,
    original: 'alert(\'Failed to load consultation details\')',
    replacement: 'showError(\'Failed to load consultation details\')'
  },
  {
    file: 'frontend\src\pages\doctor\ComprehensiveConsultation.tsx',
    line: 243,
    original: 'alert(\'Failed to start consultation\')',
    replacement: 'showError(\'Failed to start consultation\')'
  },
  {
    file: 'frontend\src\pages\doctor\ComprehensiveConsultation.tsx',
    line: 302,
    original: 'alert(\'Consultation completed and medical record created successfully!\')',
    replacement: 'showSuccess(\'Consultation completed and medical record created successfully!\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationInterface.tsx',
    line: 127,
    original: 'alert(\'Failed to start consultation\')',
    replacement: 'showError(\'Failed to start consultation\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationInterface.tsx',
    line: 154,
    original: 'alert(\'Consultation completed successfully!\')',
    replacement: 'showSuccess(\'Consultation completed successfully!\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationInterface.tsx',
    line: 158,
    original: 'alert(\'Failed to complete consultation\')',
    replacement: 'showError(\'Failed to complete consultation\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationRoom.tsx',
    line: 81,
    original: 'alert(\'Notes saved successfully!\')',
    replacement: 'showSuccess(\'Notes saved successfully!\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationRoom.tsx',
    line: 84,
    original: 'alert(\'Failed to save notes\')',
    replacement: 'showError(\'Failed to save notes\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationRoom.tsx',
    line: 92,
    original: 'alert(\'Please fill in consultation notes and diagnosis before completing\')',
    replacement: 'showInfo(\'Please fill in consultation notes and diagnosis before completing\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationRoom.tsx',
    line: 105,
    original: 'alert(\'Consultation completed successfully!\')',
    replacement: 'showSuccess(\'Consultation completed successfully!\')'
  },
  {
    file: 'frontend\src\pages\doctor\ConsultationRoom.tsx',
    line: 110,
    original: 'alert(\'Failed to complete consultation\')',
    replacement: 'showError(\'Failed to complete consultation\')'
  },
  {
    file: 'frontend\src\pages\doctor\DoctorSettings.tsx',
    line: 47,
    original: 'alert(\'Payment settings saved successfully!\')',
    replacement: 'showSuccess(\'Payment settings saved successfully!\')'
  },
  {
    file: 'frontend\src\pages\doctor\DoctorSettings.tsx',
    line: 51,
    original: 'alert(\'Failed to save settings. Please try again.\')',
    replacement: 'showError(\'Failed to save settings. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\MedicalRecords.tsx',
    line: 598,
    original: 'alert(\'No file attached to this record\')',
    replacement: 'showInfo(\'No file attached to this record\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 120,
    original: 'alert(\'✅ Payment verified and completed successfully!\')',
    replacement: 'showSuccess(\'✅ Payment verified and completed successfully!\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 137,
    original: 'alert(\'✅ Payment manually marked as completed!\')',
    replacement: 'showSuccess(\'✅ Payment manually marked as completed!\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 147,
    original: 'alert(\'❌ Payment not found. It may have been already processed.\')',
    replacement: 'showError(\'❌ Payment not found. It may have been already processed.\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 151,
    original: 'alert(\'❌ Failed to complete payment. Please check your connection and try again.\')',
    replacement: 'showError(\'❌ Failed to complete payment. Please check your connection and try again.\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 173,
    original: 'alert(\'Payment cancelled successfully!\')',
    replacement: 'showSuccess(\'Payment cancelled successfully!\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 178,
    original: 'alert(\'Failed to cancel payment. Please try again.\')',
    replacement: 'showError(\'Failed to cancel payment. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 211,
    original: 'alert(\'Payment retry initialized! Please complete the payment in the opened window.\')',
    replacement: 'showInfo(\'Payment retry initialized! Please complete the payment in the opened window.\')'
  },
  {
    file: 'frontend\src\pages\Payments.tsx',
    line: 221,
    original: 'alert(\'Failed to retry payment. Please try again.\')',
    replacement: 'showError(\'Failed to retry payment. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\reception\ReceptionCheckIn.tsx',
    line: 76,
    original: 'alert(`Patient checked in successfully! Queue number: ${response.data.data.queueNumber}`)',
    replacement: 'showSuccess(\'Patient checked in successfully! Queue number: ${response.data.data.queueNumber}\')'
  },
  {
    file: 'frontend\src\pages\reception\ReceptionCheckIn.tsx',
    line: 83,
    original: 'alert(\'Failed to check in patient. Please try again.\')',
    replacement: 'showError(\'Failed to check in patient. Please try again.\')'
  },
  {
    file: 'frontend\src\pages\reception\ReceptionCheckIn.tsx',
    line: 96,
    original: 'alert(`Patient checked in successfully! Queue number: ${response.data.data.queueNumber}`)',
    replacement: 'showSuccess(\'Patient checked in successfully! Queue number: ${response.data.data.queueNumber}\')'
  },
  {
    file: 'frontend\src\pages\reception\ReceptionCheckIn.tsx',
    line: 102,
    original: 'alert(\'Invalid QR code or check-in failed.\')',
    replacement: 'showError(\'Invalid QR code or check-in failed.\')'
  },
];

// Function to apply replacements
function applyReplacements() {
  const fs = require('fs');
  
  replacements.forEach(replacement => {
    try {
      const content = fs.readFileSync(replacement.file, 'utf8');
      const newContent = content.replace(replacement.original, replacement.replacement);
      fs.writeFileSync(replacement.file, newContent);
      console.log(`✅ Replaced alert in ${replacement.file} at line ${replacement.line}`);
    } catch (error) {
      console.error(`❌ Failed to replace alert in ${replacement.file}:`, error.message);
    }
  });
}

// Uncomment to run replacements
// applyReplacements();
