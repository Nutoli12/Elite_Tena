export class ValidationService {
  static validateRegistration(data) {
    const errors = [];

    // Required fields
    if (!data.walletAddress) errors.push('Wallet address is required');
    if (!data.email) errors.push('Email is required');
    if (!data.fullName) errors.push('Full name is required');
    if (!data.role) errors.push('Role is required');

    // Format validation
    if (data.walletAddress && !this.isValidEthAddress(data.walletAddress)) {
      errors.push('Invalid Ethereum address format');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  static isValidEthAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}