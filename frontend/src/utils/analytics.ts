// Google Analytics 4 Setup
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || 'G-XXXXXXXXXX';

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined') return;
  
  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (typeof window.gtag === 'undefined') return;
  
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
    page_title: title,
  });
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window.gtag === 'undefined') return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Healthcare-specific tracking events
export const trackHealthcareEvent = {
  // Authentication events
  login: (method: 'email' | 'wallet') => trackEvent('login', 'auth', method),
  register: (role: string) => trackEvent('register', 'auth', role),
  
  // Appointment events
  appointmentBooked: (doctorId: string) => trackEvent('appointment_booked', 'healthcare', doctorId),
  appointmentCancelled: (appointmentId: string) => trackEvent('appointment_cancelled', 'healthcare', appointmentId),
  
  // Payment events
  paymentInitiated: (amount: number) => trackEvent('payment_initiated', 'payment', 'chapa', amount),
  paymentCompleted: (amount: number) => trackEvent('payment_completed', 'payment', 'chapa', amount),
  
  // Lab events
  labOrderCreated: (testType: string) => trackEvent('lab_order_created', 'lab', testType),
  labResultUploaded: (orderId: string) => trackEvent('lab_result_uploaded', 'lab', orderId),
  
  // Chat events
  messagesSent: (recipientRole: string) => trackEvent('message_sent', 'communication', recipientRole),
  videoCallStarted: (participantCount: number) => trackEvent('video_call_started', 'communication', 'jitsi', participantCount),
  
  // Error tracking
  error: (errorType: string) => trackEvent('error', 'system', errorType),
};