/**
 * Age calculation utility
 * Calculates age from date of birth
 */

/**
 * Calculate age from date of birth
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {number|null} - Age in years, or null if invalid date
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      return null;
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
};

/**
 * Calculate age with more detailed information
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {object} - Age details including years, months, days
 */
export const calculateDetailedAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    if (isNaN(birthDate.getTime())) {
      return null;
    }
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return {
      years: years >= 0 ? years : 0,
      months: months >= 0 ? months : 0,
      days: days >= 0 ? days : 0,
      totalYears: years >= 0 ? years : 0
    };
  } catch (error) {
    console.error('Error calculating detailed age:', error);
    return null;
  }
};

/**
 * Format age for display
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {string} - Formatted age string
 */
export const formatAge = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  
  if (age === null) return 'Age unknown';
  
  if (age === 0) {
    const detailed = calculateDetailedAge(dateOfBirth);
    if (detailed && detailed.months > 0) {
      return `${detailed.months} month${detailed.months !== 1 ? 's' : ''} old`;
    }
    if (detailed && detailed.days > 0) {
      return `${detailed.days} day${detailed.days !== 1 ? 's' : ''} old`;
    }
    return 'Newborn';
  }
  
  return `${age} year${age !== 1 ? 's' : ''} old`;
};

export default {
  calculateAge,
  calculateDetailedAge,
  formatAge
};