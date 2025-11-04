import React from 'react'

const Admin = () => {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage the Elite-Tena healthcare system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-3">👨‍⚕️ Doctor Management</h3>
          <p className="text-gray-600 mb-4">Approve and manage healthcare providers</p>
          <button className="btn-primary w-full">Manage Doctors</button>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-3">📈 System Analytics</h3>
          <p className="text-gray-600 mb-4">View system usage and statistics</p>
          <button className="btn-primary w-full">View Analytics</button>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-3">⚙️ System Settings</h3>
          <p className="text-gray-600 mb-4">Configure system parameters</p>
          <button className="btn-primary w-full">Settings</button>
        </div>
      </div>
    </div>
  )
}

export default Admin
