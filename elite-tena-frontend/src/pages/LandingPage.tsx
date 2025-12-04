import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Shield, Heart, Activity, Lock, Zap, Globe, 
  FileText, CheckCircle, Moon, Sun,
  Wallet, ArrowRight, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ParticleBackground } from '../components/ui/ParticleBackground';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    // Check system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const features = [
    {
      icon: Shield,
      title: 'Encrypted Medical Records',
      description: 'Your health data is secured with military-grade encryption',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Activity,
      title: 'Blockchain Security',
      description: 'Immutable records verified on the blockchain',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Zap,
      title: 'Instant Prescriptions',
      description: 'Get prescriptions instantly from verified doctors',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: FileText,
      title: 'Lab Results Access',
      description: 'Access your lab results anytime, anywhere',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Lock,
      title: 'Consent Management',
      description: 'Full control over who accesses your medical data',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: Globe,
      title: 'Ethiopia Focused',
      description: 'Built specifically for Ethiopian healthcare needs',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const steps = [
    { number: '01', title: 'Connect Wallet', description: 'Link your MetaMask or create account' },
    { number: '02', title: 'Access Records', description: 'View all your medical history securely' },
    { number: '03', title: 'Manage Care', description: 'Control appointments, prescriptions & more' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'
    }`}>
      {/* Particle Background */}
      <ParticleBackground darkMode={darkMode} />

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 ${
            darkMode ? 'bg-blue-500' : 'bg-cyan-400'
          }`}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className={`absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full blur-3xl opacity-20 ${
            darkMode ? 'bg-purple-500' : 'bg-indigo-400'
          }`}
        />
      </div>

      {/* Floating Medical Icons */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed pointer-events-none"
          initial={{ 
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: 0.1
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          {i % 3 === 0 && <Heart className={`w-8 h-8 ${darkMode ? 'text-pink-400' : 'text-pink-500'}`} />}
          {i % 3 === 1 && <Shield className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />}
          {i % 3 === 2 && <Activity className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />}
        </motion.div>
      ))}

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
            }`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Elite Tena</span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl transition-colors ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity }}
        className="relative z-10 px-6 pt-20 pb-32"
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Decentralized Healthcare for Ethiopia</span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className={`bg-gradient-to-r ${
                darkMode 
                  ? 'from-blue-400 via-purple-400 to-pink-400' 
                  : 'from-blue-600 via-purple-600 to-pink-600'
              } bg-clip-text text-transparent`}>
                Your Health,
              </span>
              <br />
              <span className={darkMode ? 'text-slate-100' : 'text-gray-900'}>
                Your Control
              </span>
            </h1>

            <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto ${
              darkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              Secure, blockchain-powered healthcare management. 
              Access your medical records, prescriptions, and lab results with complete privacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className={`group px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 ${
                  darkMode
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                } text-white shadow-xl transition-all`}
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/register')}
                className={`px-8 py-4 rounded-2xl font-semibold text-lg border-2 transition-all ${
                  darkMode
                    ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                Create Account
              </motion.button>
            </div>
          </motion.div>

          {/* Floating Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            {[
              { value: '10K+', label: 'Patients' },
              { value: '500+', label: 'Doctors' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className={`p-6 rounded-2xl backdrop-blur-xl ${
                  darkMode ? 'bg-slate-800/50' : 'bg-white/50'
                } border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}
              >
                <div className={`text-3xl font-bold mb-2 bg-gradient-to-r ${
                  darkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'
                } bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className={darkMode ? 'text-slate-400' : 'text-gray-600'}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose Elite Tena?
            </h2>
            <p className={`text-xl ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Healthcare powered by blockchain technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`p-8 rounded-3xl backdrop-blur-xl ${
                  darkMode ? 'bg-slate-800/50 hover:bg-slate-800/70' : 'bg-white/50 hover:bg-white/70'
                } border ${darkMode ? 'border-slate-700' : 'border-gray-200'} transition-all cursor-pointer group`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className={darkMode ? 'text-slate-400' : 'text-gray-600'}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Get Started in 3 Steps
            </h2>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className={`flex items-center gap-8 p-8 rounded-3xl backdrop-blur-xl ${
                  darkMode ? 'bg-slate-800/50' : 'bg-white/50'
                } border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}
              >
                <div className={`text-6xl font-bold bg-gradient-to-br ${
                  darkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'
                } bg-clip-text text-transparent`}>
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className={darkMode ? 'text-slate-400' : 'text-gray-600'}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Showcase */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`p-12 rounded-3xl backdrop-blur-xl ${
              darkMode ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80' : 'bg-gradient-to-br from-white/80 to-gray-50/80'
            } border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Enterprise-Grade Security
              </h2>
              <p className={`text-xl ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Your health data is protected by the best
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Lock, label: 'End-to-End Encryption' },
                { icon: Shield, label: 'Blockchain Verified' },
                { icon: CheckCircle, label: 'HIPAA Compliant' },
                { icon: Globe, label: 'Ethiopia Optimized' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="text-center p-6"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${
                    darkMode ? 'from-blue-500 to-purple-600' : 'from-blue-600 to-purple-600'
                  } flex items-center justify-center`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-semibold">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Ready to take control of your health?
          </h2>
          <p className={`text-xl mb-12 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Join thousands of Ethiopians managing their healthcare securely
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 25px 50px rgba(59, 130, 246, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className={`px-12 py-5 rounded-2xl font-bold text-xl ${
              darkMode
                ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                : 'bg-gradient-to-r from-blue-600 to-purple-600'
            } text-white shadow-2xl`}
          >
            Get Started Now
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 px-6 py-12 border-t ${
        darkMode ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className={darkMode ? 'text-slate-400' : 'text-gray-600'}>
            © 2024 Elite Tena Healthcare. Built with ❤️ for Ethiopia.
          </p>
        </div>
      </footer>
    </div>
  );
};
