import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Web3Provider } from './contexts/Web3Context.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import Header from './components/common/Header.jsx'
import Footer from './components/common/Footer.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </Web3Provider>
  )
}

export default App
