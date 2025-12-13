import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Shield, Mail, Lock, User, Phone, Calendar, Wallet, AlertCircle, CheckCircle, 
  MapPin, Globe, Users, Bell, MessageSquare, Heart, ArrowRight, ArrowLeft
} from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerWithEmail, connectWallet, registerWithWallet } = useAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet'>('email');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    walletAddress: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyEmail: '',
    
    // Location & Preferences
    region: '',
    city: '',
    preferredLanguage: 'English',
    
    // Communication Preferences
    emailNotifications: true,
    smsNotifications: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (authMethod === 'email') {
          return !!(formData.firstName && formData.lastName && formData.email && 
                   formData.password && formData.confirmPassword && 
                   formData.password === formData.confirmPassword);
        } else {
          return !!(formData.firstName && formData.lastName);
        }
      case 2:
        return !!(formData.phoneNumber && formData.dateOfBirth && formData.gender);
      case 3:
        return !!(formData.emergencyContactName && formData.emergencyRelationship && 
                 formData.emergencyPhone && formData.emergencyPhone !== formData.phoneNumber);
      case 4:
        return !!(formData.region && formData.city);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError('');
    } else {
      setError('Please fill in all required fields correctly');
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.emergencyPhone === formData.phoneNumber) {
      setError('Emergency contact phone must be different from your phone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerWithEmail({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        emergencyContact: {
          name: formData.emergencyContactName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
          email: formData.emergencyEmail
        },
        location: {
          region: formData.region,
          city: formData.city
        },
        preferences: {
          language: formData.preferredLanguage,
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications
        },
        role: 'patient'
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletRegister = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      setError('Please complete all required fields');
      return;
    }

    if (formData.emergencyPhone === formData.phoneNumber) {
      setError('Emergency contact phone must be different from your phone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const walletAddress = await connectWallet();
      await registerWithWallet({
        walletAddress,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        emergencyContact: {
          name: formData.emergencyContactName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
          email: formData.emergencyEmail
        },
        location: {
          region: formData.region,
          city: formData.city
        },
        preferences: {
          language: formData.preferredLanguage,
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications
        },
        role: 'patient'
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Ethiopian regions for dropdown
  const ethiopianRegions = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa',
    'Gambela', 'Harari', 'Oromia', 'Sidama', 'SNNP', 'Somali', 'Tigray'
  ];

  const relationships = [
    'Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Relative', 'Other'
  ];

  const languages = ['English', 'Amharic', 'Oromiffa', 'Tigrinya', 'Somali'];

  return (
    <div className="min-h-screen healthcare-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 healthcare-gradient rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Join Elite Tena</h1>
        <p className="text-gray-600 text-center mb-2">Register as a Patient</p>
        
        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-medical-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div className={`w-8 h-0.5 ${
                    step > stepNumber ? 'bg-medical-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            Step {step} of 5: {
              step === 1 ? 'Basic Information' :
              step === 2 ? 'Personal Details' :
              step === 3 ? 'Emergency Contact' :
              step === 4 ? 'Location & Preferences' :
              'Review & Complete'
            }
          </p>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'email'
                ? 'bg-white text-medical-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
          <button
            onClick={() => setAuthMethod('wallet')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'wallet'
                ? 'bg-white text-medical-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            Wallet
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Multi-Step Registration Form */}
        <div className="space-y-4">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              </div>

              {authMethod === 'email' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password * (min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number * (Ethiopian: +2519XXXXXXXX)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    placeholder="+2519XXXXXXXX"
                    pattern="^\+251[0-9]{9}$"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth * (DD/MM/YYYY)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Emergency Contact */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    placeholder="Emergency contact full name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.emergencyRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Relationship</option>
                      {relationships.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Phone * (different from yours)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="+2519XXXXXXXX"
                      pattern="^\+251[0-9]{9}$"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Email (optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.emergencyEmail}
                    onChange={(e) => setFormData({ ...formData, emergencyEmail: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    placeholder="emergency@email.com"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Location & Preferences */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Region</option>
                      {ethiopianRegions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City/Town *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      placeholder="Your city/town"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Communication Preferences
                </label>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={formData.emailNotifications}
                    onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                    className="w-4 h-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
                  />
                  <label htmlFor="emailNotifications" className="flex items-center text-sm text-gray-700">
                    <Mail className="w-4 h-4 mr-2" />
                    Email notifications
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    checked={formData.smsNotifications}
                    onChange={(e) => setFormData({ ...formData, smsNotifications: e.target.checked })}
                    className="w-4 h-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
                  />
                  <label htmlFor="smsNotifications" className="flex items-center text-sm text-gray-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS notifications
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review & Complete */}
          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">Review Your Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  {authMethod === 'email' && <p><strong>Email:</strong> {formData.email}</p>}
                  <p><strong>Phone:</strong> {formData.phoneNumber}</p>
                  <p><strong>Date of Birth:</strong> {formData.dateOfBirth}</p>
                  <p><strong>Gender:</strong> {formData.gender}</p>
                  <p><strong>Emergency Contact:</strong> {formData.emergencyContactName} ({formData.emergencyRelationship})</p>
                  <p><strong>Emergency Phone:</strong> {formData.emergencyPhone}</p>
                  <p><strong>Location:</strong> {formData.city}, {formData.region}</p>
                  <p><strong>Language:</strong> {formData.preferredLanguage}</p>
                </div>
              </div>

              {authMethod === 'email' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEmailRegister}
                  disabled={loading}
                  className="healthcare-button w-full disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWalletRegister}
                  disabled={loading}
                  className="healthcare-button w-full disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet & Register'}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="flex justify-between pt-4">
              {step > 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={prevStep}
                  className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextStep}
                disabled={!validateStep(step)}
                className="flex items-center px-4 py-2 bg-medical-500 text-white rounded-xl hover:bg-medical-600 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-medical-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
