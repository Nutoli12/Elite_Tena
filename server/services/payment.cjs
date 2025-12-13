const axios = require('axios');
require('dotenv').config();

/**
 * Chapa Payment Service
 * Documentation: https://developer.chapa.co/docs
 */
class ChapaService {
  constructor(secretKey) {
    this.secretKey = secretKey || process.env.CHAPA_SECRET_KEY || '';
    this.baseURL = 'https://api.chapa.co/v1';
  }

  /**
   * Initialize payment
   */
  async initializePayment(data) {
    try {
      // Validate secret key
      if (!this.secretKey || this.secretKey === 'CHASECK_TEST-your-actual-chapa-secret-key-here') {
        throw new Error('Chapa secret key not configured. Please add CHAPA_SECRET_KEY to your .env file. Get one from https://dashboard.chapa.co/');
      }

      const requestPayload = {
        amount: data.amount,
        currency: data.currency || 'ETB',
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phoneNumber,
        tx_ref: data.txRef,
        callback_url: data.callbackUrl,
        return_url: data.returnUrl,
        customization: {
          title: data.title || 'Elite Tena',
          description: data.description || 'Healthcare Payment',
        },
      };

      console.log('🔑 Chapa API Request:', {
        url: `${this.baseURL}/transaction/initialize`,
        payload: requestPayload,
        titleLength: (data.title || 'Elite Tena').length,
        secretKeyLength: this.secretKey.length
      });

      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Chapa API Response:', response.data);

      return {
        success: true,
        data: response.data.data,
        checkoutUrl: response.data.data.checkout_url,
      };
    } catch (error) {
      console.error('❌ Chapa initialization error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        secretKeyConfigured: !!this.secretKey && this.secretKey !== 'CHASECK_TEST-your-actual-chapa-secret-key-here'
      });
      
      let errorMessage = 'Payment initialization failed';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Chapa API credentials. Please check your secret key.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid payment request data';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        details: error.response?.data
      };
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(txRef) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${txRef}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
        status: response.data.data.status,
      };
    } catch (error) {
      console.error('Chapa verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(txRef) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${txRef}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Chapa get payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

/**
 * Telebirr Payment Service
 * Documentation: https://developer.ethiotelecom.et/
 */
class TelebirrService {
  constructor(appId, appKey, merchantId) {
    this.appId = appId || process.env.TELEBIRR_APP_ID || '';
    this.appKey = appKey || process.env.TELEBIRR_APP_KEY || '';
    this.merchantId = merchantId || process.env.TELEBIRR_MERCHANT_ID || '';
    this.baseURL = process.env.TELEBIRR_BASE_URL || 'https://app.ethiotelecom.et:9443/payment';
  }

  /**
   * Initialize payment
   */
  async initializePayment(data) {
    try {
      const timestamp = Date.now();
      const nonce = this.generateNonce();
      
      const payload = {
        appId: this.appId,
        merchantId: this.merchantId,
        timestamp,
        nonce,
        notifyUrl: data.notifyUrl,
        returnUrl: data.returnUrl,
        outTradeNo: data.outTradeNo, // Unique order number
        subject: data.subject || 'Healthcare Payment',
        totalAmount: data.amount,
        timeout: data.timeout || '30m',
      };

      // Generate signature
      const signature = this.generateSignature(payload);
      payload.sign = signature;

      const response = await axios.post(
        `${this.baseURL}/v1/h5/pay`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data,
        paymentUrl: response.data.data?.paymentUrl,
      };
    } catch (error) {
      console.error('Telebirr initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Query payment status
   */
  async queryPayment(outTradeNo) {
    try {
      const timestamp = Date.now();
      const nonce = this.generateNonce();

      const payload = {
        appId: this.appId,
        merchantId: this.merchantId,
        timestamp,
        nonce,
        outTradeNo,
      };

      const signature = this.generateSignature(payload);
      payload.sign = signature;

      const response = await axios.post(
        `${this.baseURL}/v1/query`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data,
        status: response.data.data?.tradeStatus,
      };
    } catch (error) {
      console.error('Telebirr query error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Generate nonce (random string)
   */
  generateNonce() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate signature for Telebirr
   */
  generateSignature(payload) {
    const crypto = require('crypto');
    
    // Sort keys alphabetically
    const sortedKeys = Object.keys(payload).sort();
    
    // Create string to sign
    let stringToSign = '';
    sortedKeys.forEach(key => {
      if (key !== 'sign' && payload[key]) {
        stringToSign += `${key}=${payload[key]}&`;
      }
    });
    
    // Remove trailing &
    stringToSign = stringToSign.slice(0, -1);
    
    // Add app key
    stringToSign += this.appKey;
    
    // Generate SHA256 hash
    return crypto.createHash('sha256').update(stringToSign).digest('hex').toUpperCase();
  }
}

/**
 * Unified Payment Service
 */
class PaymentService {
  constructor() {
    // Pass environment variables explicitly to ensure they're available
    this.chapa = new ChapaService(process.env.CHAPA_SECRET_KEY);
    this.telebirr = new TelebirrService(
      process.env.TELEBIRR_APP_ID,
      process.env.TELEBIRR_APP_KEY,
      process.env.TELEBIRR_MERCHANT_ID
    );
  }

  /**
   * Initialize payment with selected provider
   */
  async initializePayment(provider, data) {
    if (provider === 'chapa') {
      return await this.chapa.initializePayment(data);
    } else if (provider === 'telebirr') {
      return await this.telebirr.initializePayment(data);
    } else {
      return {
        success: false,
        error: 'Invalid payment provider',
      };
    }
  }

  /**
   * Verify payment with selected provider
   */
  async verifyPayment(provider, reference) {
    if (provider === 'chapa') {
      return await this.chapa.verifyPayment(reference);
    } else if (provider === 'telebirr') {
      return await this.telebirr.queryPayment(reference);
    } else {
      return {
        success: false,
        error: 'Invalid payment provider',
      };
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods() {
    return [
      {
        id: 'chapa',
        name: 'Chapa',
        description: 'Pay with Chapa (Cards, Mobile Money, Bank Transfer)',
        enabled: !!process.env.CHAPA_SECRET_KEY,
      },
      {
        id: 'telebirr',
        name: 'Telebirr',
        description: 'Pay with Telebirr Mobile Money',
        enabled: !!process.env.TELEBIRR_APP_ID,
      },
    ];
  }

  /**
   * Enhanced error handling for Chapa API
   */
  handleChapaError(error) {
    const errorMap = {
      401: 'Invalid API credentials - check your secret key',
      400: 'Invalid request data - check payment parameters',
      422: 'Validation error - check required fields',
      429: 'Rate limit exceeded - try again later',
      500: 'Chapa server error - try again later'
    };
    
    const status = error.response?.status;
    const message = errorMap[status] || error.message;
    
    return {
      success: false,
      error: message,
      status: status,
      details: error.response?.data,
      troubleshooting: this.getTroubleshootingSteps(status)
    };
  }
  
  getTroubleshootingSteps(status) {
    switch(status) {
      case 401:
        return [
          'Verify CHAPA_SECRET_KEY in .env file',
          'Check if key is from correct environment (test/live)',
          'Ensure key is not expired'
        ];
      case 400:
        return [
          'Check all required fields are provided',
          'Verify email format is valid',
          'Ensure amount is positive number',
          'Check phone number format (+251...)'
        ];
      default:
        return ['Check Chapa status page', 'Try again in a few minutes'];
    }
  }
}

module.exports = new PaymentService();
