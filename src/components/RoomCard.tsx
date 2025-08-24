import React, { useState, useEffect } from 'react'
import { Hotel, Room, hotelAPI, roomAPI, bookingAPI } from '../lib/supabase'
import RoomCard from './RoomCard'
import { Calendar, Users, Mail, Phone, User, Clock } from 'lucide-react'

interface BookingFormData {
  guestName: string
  guestEmail: string
  guestPhone: string
  checkInDate: string
  checkOutDate: string
  totalAmount: number
}

export default function BookingSystem() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    totalAmount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHotels()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadRooms()
    }
  }, [selectedHotel])

  useEffect(() => {
    if (selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate) {
      calculateTotal()
    }
  }, [selectedRoom, bookingForm.checkInDate, bookingForm.checkOutDate])

  const loadHotels = async () => {
    try {
      const hotelsData = await hotelAPI.getHotels()
      setHotels(hotelsData)
      if (hotelsData.length > 0) {
        setSelectedHotel(hotelsData[0])
      }
    } catch (error) {
      console.error('Error loading hotels:', error)
    }
  }

  const loadRooms = async () => {
    if (!selectedHotel) return

    try {
      setLoading(true)
      const roomsData = await roomAPI.getRoomsByHotel(selectedHotel.id)
      setRooms(roomsData.filter(room => room.status === 'available'))
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    if (!selectedRoom || !bookingForm.checkInDate || !bookingForm.checkOutDate) return

    const checkIn = new Date(bookingForm.checkInDate)
    const checkOut = new Date(bookingForm.checkOutDate)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const total = nights * selectedRoom.price_per_night

    setBookingForm(prev => ({ ...prev, totalAmount: total }))
  }

  const handleRoomSelect = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (room) {
      setSelectedRoom(room)
      setShowBookingForm(true)
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRoom || !selectedHotel) return

    try {
      const booking = await bookingAPI.createBooking({
        hotel_id: selectedHotel.id,
        room_id: selectedRoom.id,
        guest_name: bookingForm.guestName,
        guest_email: bookingForm.guestEmail,
        guest_phone: bookingForm.guestPhone,
        check_in_date: bookingForm.checkInDate,
        check_out_date: bookingForm.checkOutDate,
        total_amount: bookingForm.totalAmount,
        status: 'confirmed'
      })

      alert('Booking created successfully!')
      setShowBookingForm(false)
      setSelectedRoom(null)
      setBookingForm({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        checkInDate: new Date().toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        totalAmount: 0
      })
      loadRooms() // Refresh rooms
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Error creating booking')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Book a Room</h1>
            {selectedHotel && (
              <div className="text-gray-600">
                <span className="font-medium">{selectedHotel.name}</span>
                {selectedHotel.address && (
                  <span className="ml-2 text-sm">• {selectedHotel.address}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hotel Selection */}
        {hotels.length > 1 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Hotel
            </label>
            <select
              value={selectedHotel?.id || ''}
              onChange={(e) => {
                const hotel = hotels.find(h => h.id === e.target.value)
                setSelectedHotel(hotel || null)
              }}
              className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {hotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Auto Checkout Notice */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-red-800">🚨 AUTO CHECKOUT SYSTEM ACTIVE</h3>
              <p className="text-red-700 mt-2 font-medium">
                ⏰ ALL ROOMS AUTOMATICALLY CHECKOUT DAILY AT 10:00 AM
              </p>
              <p className="text-red-600 font-medium">
                ✅ You can check in at ANY TIME during day or night<br/>
                ⚠️ System will automatically checkout all occupied rooms at 10 AM every morning
              </p>
            </div>
          </div>
        </div>

        {/* Available Rooms */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Available Rooms</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No available rooms at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onBook={handleRoomSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Booking Form Modal */}
        {showBookingForm && selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Book {selectedRoom.room_number}
              </h3>
              
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingForm.guestName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, guestName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={bookingForm.guestEmail}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={bookingForm.guestPhone}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, guestPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.checkInDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, checkInDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.checkOutDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, checkOutDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      ${bookingForm.totalAmount}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingForm(false)
                      setSelectedRoom(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Book Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}