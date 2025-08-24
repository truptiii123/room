import React from 'react'
import { Room, Booking } from '../lib/supabase'
import { Clock, Users, Wifi, Car, Coffee, Tv } from 'lucide-react'

interface RoomCardProps {
  room: Room
  booking?: Booking
  onCheckIn?: (roomId: string) => void
  onCheckOut?: (bookingId: string) => void
  onBook?: (roomId: string) => void
}

const statusColors = {
  available: 'bg-green-100 text-green-800 border-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cleaning: 'bg-blue-100 text-blue-800 border-blue-200'
}

const statusLabels = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  cleaning: 'Cleaning'
}

const amenityIcons = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  tv: Tv
}

export default function RoomCard({ room, booking, onCheckIn, onCheckOut, onBook }: RoomCardProps) {
  const getActionButton = () => {
    if (room.status === 'occupied' && booking && onCheckOut) {
      return (
        <button
          onClick={() => onCheckOut(booking.id)}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
        >
          Check Out
        </button>
      )
    }
    
    if (room.status === 'available' && onBook) {
      return (
        <button
          onClick={() => onBook(room.id)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Book Room
        </button>
      )
    }
    
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
      {/* Auto Checkout Notice */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
        <div className="flex items-center justify-center text-orange-800 text-sm font-medium">
          <Clock className="w-4 h-4 mr-2" />
          AUTO CHECKOUT DAILY AT 10AM
        </div>
      </div>

      <div className="p-6">
        {/* Room Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{room.room_number}</h3>
            <p className="text-gray-600 capitalize">{room.room_type}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[room.status]}`}>
            {statusLabels[room.status]}
          </div>
        </div>

        {/* Room Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>Max {room.max_occupancy} guests</span>
          </div>
          
          <div className="text-2xl font-bold text-gray-900">
            ${room.price_per_night}
            <span className="text-sm font-normal text-gray-600">/night</span>
          </div>

          {/* Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((amenity, index) => {
                const IconComponent = amenityIcons[amenity as keyof typeof amenityIcons]
                return (
                  <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded-md text-sm text-gray-700">
                    {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
                    <span className="capitalize">{amenity}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Current Booking Info */}
        {booking && room.status === 'occupied' && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Guest</h4>
            <p className="text-sm text-gray-600">{booking.guest_name}</p>
            {booking.guest_email && (
              <p className="text-sm text-gray-600">{booking.guest_email}</p>
            )}
            <p className="text-sm text-gray-600">
              Check-in: {booking.actual_check_in ? new Date(booking.actual_check_in).toLocaleDateString() : 'Pending'}
            </p>
            <p className="text-sm text-gray-600">
              Expected checkout: {new Date(booking.check_out_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Last Checkout Info */}
        {room.last_checkout && room.status === 'available' && (
          <div className="bg-green-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">
              Last checkout: {new Date(room.last_checkout).toLocaleString()}
            </p>
          </div>
        )}

        {/* Action Button */}
        {getActionButton()}
      </div>
    </div>
  )
}