import React, { useState } from 'react'
import { Hotel, Building2, Calendar } from 'lucide-react'
import OwnerDashboard from './components/OwnerDashboard'
import BookingSystem from './components/BookingSystem'

type ViewMode = 'booking' | 'dashboard'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('booking')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Hotel className="w-8 h-8 text-blue-600 mr-3" />
              <span className="text-xl font-bold text-gray-900">Hotel Management System</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('booking')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'booking'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Room
              </button>
              
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Owner Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {viewMode === 'booking' ? <BookingSystem /> : <OwnerDashboard />}
    </div>
  )
}

export default App