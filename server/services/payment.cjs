const axios = require('axios');

/**
 * Chapa Payment Service
 * Documentation: https://developer.chapa.co/docs
 */
class ChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || '';
    this.baseURL = 'https://api.chapa.co/v1';
  }

  /**
   * Initialize payment
   */
  async initializePayment(data) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          amount: data.amount,
          currency: data.currency || 'ETB',
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          tx_ref: data.txRef, // Unique transaction reference
          callback_url: data.callbackUrl,
          return_url: data.returnUrl,
          customization: {
            title: data.title || 'Elite Tena Healthcare',
            description: data.description || 'Healthcare Payment',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
        checkoutUrl: response.data.data.checkout_url,
      };
    } catch (error) {
      console.error('Chapa initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
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
  constructor() {
    this.appId = process.env.TELEBIRR_APP_ID || '';
    this.appKey = process.env.TELEBIRR_APP_KEY || '';
    this.merchantId = process.env.TELEBIRR_MERCHANT_ID || '';
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
    this.chapa = new ChapaService();
    this.telebirr = new TelebirrService();
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
}

module.exports = new PaymentService();
