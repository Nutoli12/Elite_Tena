import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // General
      welcome: "Welcome to Elite Tena Healthcare",
      connect_wallet: "Connect Your Wallet",
      medical_records: "Medical Records",
      prescriptions: "Prescriptions",
      appointments: "Appointments",
      lab_results: "Lab Results",
      consent_management: "Consent Management",
      payments: "Payments",
      dashboard: "Dashboard",
      profile: "Profile",
      logout: "Logout",
      settings: "Settings",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      search: "Search",
      filter: "Filter",
      status: "Status",
      date: "Date",
      time: "Time",
      description: "Description",
      actions: "Actions",
      
      // Patient specific
      my_health: "My Health",
      my_appointments: "My Appointments",
      my_prescriptions: "My Prescriptions",
      my_lab_results: "My Lab Results",
      grant_consent: "Grant Consent",
      revoke_consent: "Revoke Consent",
      emergency_access: "Emergency Access",
      
      // Doctor specific
      my_patients: "My Patients",
      issue_prescription: "Issue Prescription",
      approve_results: "Approve Results",
      create_medical_record: "Create Medical Record",
      
      // Consent types
      consent_medical_records: "Medical Records Access",
      consent_prescriptions: "Prescription Access",
      consent_lab_results: "Lab Results Access",
      consent_emergency: "Emergency Access",
      
      // Status types
      status_active: "Active",
      status_pending: "Pending",
      status_completed: "Completed",
      status_cancelled: "Cancelled",
      
      // Errors & Success
      error_connection_failed: "Connection failed",
      error_consent_required: "Consent required",
      success_operation: "Operation completed successfully",
    }
  },
  am: {
    translation: {
      // General
      welcome: "እንኳን ወደ ኤሊት ጤና ደህንነት በደህና መጡ",
      connect_wallet: "የእርስዎን ዋሌት ያገናኙ",
      medical_records: "የጤና መዝገቦች",
      prescriptions: "ፕሬስክሪፕሽኖች",
      appointments: "ቀጠሮዎች",
      lab_results: "የላብ ውጤቶች",
      consent_management: "የፍቃድ አስተዳደር",
      payments: "ክፍያዎች",
      dashboard: "ዳሽቦርድ",
      profile: "ፕሮፋይል",
      logout: "ውጣ",
      settings: "ማስተካከያዎች",
      save: "አስቀምጥ",
      cancel: "ሰርዝ",
      delete: "ሰርዝ",
      edit: "አርትዕ",
      view: "ተመልከት",
      search: "ፈልግ",
      filter: "ማጣሪያ",
      status: "ሁኔታ",
      date: "ቀን",
      time: "ሰዓት",
      description: "መግለጫ",
      actions: "ድርጊቶች",
      
      // Patient specific
      my_health: "የእኔ ጤና",
      my_appointments: "የእኔ ቀጠሮዎች",
      my_prescriptions: "የእኔ ፕሬስክሪፕሽኖች",
      my_lab_results: "የእኔ የላብ ውጤቶች",
      grant_consent: "ፍቃድ ስጥ",
      revoke_consent: "ፍቃድ ሰርዝ",
      emergency_access: "አደጋ መዳረሻ",
      
      // Doctor specific
      my_patients: "የእኔ ታካሚዎች",
      issue_prescription: "ፕሬስክሪፕሽን ስጥ",
      approve_results: "ውጤቶችን አጽድቅ",
      create_medical_record: "የጤና መዝገብ ፍጠር",
      
      // Consent types
      consent_medical_records: "ወደ ጤና መዝገቦች መዳረሻ",
      consent_prescriptions: "ወደ ፕሬስክሪፕሽኖች መዳረሻ",
      consent_lab_results: "ወደ የላብ ውጤቶች መዳረሻ",
      consent_emergency: "ወደ አደጋ መዳረሻ",
      
      // Status types
      status_active: "ንቁ",
      status_pending: "በጥበቃ",
      status_completed: "ተጠናቅቋል",
      status_cancelled: "ተሰርዟል",
      
      // Errors & Success
      error_connection_failed: "አገናኘ አልተቻለም",
      error_consent_required: "ፍቃድ ያስፈልጋል",
      success_operation: "ድርጊቱ በተሳካ ሁኔታ ተጠናቋል",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
