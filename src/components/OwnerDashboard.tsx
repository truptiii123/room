import React, { useState, useEffect } from 'react'
import { Hotel, Room, Booking, AutoCheckoutLog, hotelAPI, roomAPI, bookingAPI, autoCheckoutAPI } from '../lib/supabase'
import RoomCard from './RoomCard'
import { Clock, Users, DollarSign, Calendar, RefreshCw, AlertCircle } from 'lucide-react'

interface DashboardStats {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  todayCheckouts: number
  todayRevenue: number
}

export default function OwnerDashboard() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [autoCheckoutLogs, setAutoCheckoutLogs] = useState<AutoCheckoutLog[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    todayCheckouts: 0,
    todayRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load hotels on component mount
  useEffect(() => {
    loadHotels()
  }, [])

  // Load hotel data when selected hotel changes
  useEffect(() => {
    if (selectedHotel) {
      loadHotelData()
    }
  }, [selectedHotel])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedHotel) {
        loadHotelData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedHotel])

  const loadHotels = async () => {
    try {
      const hotelsData = await hotelAPI.getHotels()
      setHotels(hotelsData)
      if (hotelsData.length > 0 && !selectedHotel) {
        setSelectedHotel(hotelsData[0])
      }
    } catch (error) {
      console.error('Error loading hotels:', error)
    }
  }

  const loadHotelData = async () => {
    if (!selectedHotel) return

    try {
      setLoading(true)
      
      // Load rooms, bookings, and logs in parallel
      const [roomsData, bookingsData, logsData] = await Promise.all([
        roomAPI.getRoomsByHotel(selectedHotel.id),
        bookingAPI.getBookingsByHotel(selectedHotel.id),
        autoCheckoutAPI.getAutoCheckoutLogs(selectedHotel.id)
      ])

      setRooms(roomsData)
      setBookings(bookingsData)
      setAutoCheckoutLogs(logsData)

      // Calculate stats
      const today = new Date().toDateString()
      const todayCheckouts = logsData.filter(log => 
        new Date(log.created_at).toDateString() === today
      ).length

      const todayRevenue = bookingsData
        .filter(booking => 
          booking.status === 'checked_out' && 
          booking.actual_check_out &&
          new Date(booking.actual_check_out).toDateString() === today
        )
        .reduce((sum, booking) => sum + booking.total_amount, 0)

      setStats({
        totalRooms: roomsData.length,
        occupiedRooms: roomsData.filter(room => room.status === 'occupied').length,
        availableRooms: roomsData.filter(room => room.status === 'available').length,
        todayCheckouts,
        todayRevenue
      })

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error loading hotel data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualAutoCheckout = async () => {
    try {
      await autoCheckoutAPI.triggerAutoCheckout()
      await loadHotelData() // Refresh data
      alert('Auto-checkout completed successfully!')
    } catch (error) {
      console.error('Error triggering auto-checkout:', error)
      alert('Error triggering auto-checkout')
    }
  }

  const handleCheckOut = async (bookingId: string) => {
    try {
      await bookingAPI.checkOut(bookingId)
      await loadHotelData() // Refresh data
    } catch (error) {
      console.error('Error checking out:', error)
      alert('Error checking out guest')
    }
  }

  if (loading && !selectedHotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Hotel Dashboard</h1>
              {selectedHotel && (
                <span className="ml-4 text-gray-600">- {selectedHotel.name}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <button
                onClick={loadHotelData}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auto Checkout Notice */}
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-orange-800">Auto-Checkout System Active</h3>
              <p className="text-orange-700 mt-1">
                All rooms automatically checkout daily at 10:00 AM. Manual checkout available anytime.
              </p>
              <button
                onClick={handleManualAutoCheckout}
                className="mt-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Trigger Manual Auto-Checkout
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Occupied</p>
                <p className="text-2xl font-bold text-gray-900">{stats.occupiedRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today Checkouts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayCheckouts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.todayRevenue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Room Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map(room => {
              const roomBooking = bookings.find(booking => 
                booking.room_id === room.id && booking.status === 'checked_in'
              )
              
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  booking={roomBooking}
                  onCheckOut={handleCheckOut}
                />
              )
            })}
          </div>
        </div>

        {/* Recent Auto-Checkout Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Auto-Checkout Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {autoCheckoutLogs.slice(0, 10).map(log => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.checkout_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(log as any).rooms?.room_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(log as any).bookings?.guest_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.reason.replace(/_/g, ' ').toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}