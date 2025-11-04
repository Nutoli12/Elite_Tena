import React from 'react'
import { useAccount } from 'wagmi'

const Dashboard = () => {
  const { address, isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600">Please connect your wallet to view your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Your Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Connected as: <span className="font-mono">{address}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-3">📊 Medical Records</h3>
          <p className="text-gray-600 mb-4">View and manage your medical records</p>
          <button className="btn-primary w-full">View Records</button>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-3">🩺 Appointments</h3>
          <p className="text-gray-600 mb-4">Schedule and view appointments</p>
          <button className="btn-primary w-full">Manage Appointments</button>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-3">👥 Access Control</h3>
          <p className="text-gray-600 mb-4">Manage who can access your records</p>
          <button className="btn-primary w-full">Manage Access</button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
