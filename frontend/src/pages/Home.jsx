import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'

const Home = () => {
  const { isAuthenticated, user } = useAuth()
  const { isConnected } = useWeb3()

  const features = [
    {
      title: 'Patient-Owned Records',
      description: 'You control your medical data. Grant and revoke access to healthcare providers as needed.',
      icon: 'Ì¥í'
    },
    {
      title: 'Secure Blockchain Storage',
      description: 'Medical record hashes stored on blockchain for immutability and transparency.',
      icon: '‚õìÔ∏è'
    },
    {
      title: 'Easy Appointment Booking',
      description: 'Book appointments with verified doctors and pay securely with cryptocurrency.',
      icon: 'Ì≥Ö'
    },
    {
      title: 'Encrypted File Storage',
      description: 'Medical files encrypted and stored on IPFS for secure, decentralized storage.',
      icon: 'Ìª°Ô∏è'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="health-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Health Data, 
              <span className="block text-blue-100">Your Control</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Elite-Tena puts you in control of your medical records with blockchain technology. 
              Secure, transparent, and patient-centered healthcare.
            </p>
            
            {!isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
                >
                  Get Started
                </Link>
                <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200">
                  Learn More
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
                >
                  Go to Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200"
                  >
                    Admin Panel
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Elite-Tena?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're revolutionizing healthcare with blockchain technology, putting patients first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-6 card-shadow-hover text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">Patient Data Control</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">90/10</div>
              <div className="text-gray-600">Revenue Split (Doctor/Platform)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">$0.02</div>
              <div className="text-gray-600">Avg. Transaction Cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Take Control of Your Health Data?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join Elite-Tena today and experience healthcare that puts you first.
            </p>
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200 inline-block"
            >
              Start Your Journey
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home
