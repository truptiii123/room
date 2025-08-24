import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Hotel {
  id: string
  name: string
  owner_id: string
  address?: string
  phone?: string
  email?: string
  checkout_time: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  hotel_id: string
  room_number: string
  room_type: string
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning'
  price_per_night: number
  max_occupancy: number
  amenities?: string[]
  last_checkout?: string
  auto_checkout_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  hotel_id: string
  room_id: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  check_in_date: string
  check_out_date: string
  actual_check_in?: string
  actual_check_out?: string
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  total_amount: number
  payment_status: 'pending' | 'paid' | 'refunded'
  auto_checkout: boolean
  created_at: string
  updated_at: string
}

export interface AutoCheckoutLog {
  id: string
  hotel_id: string
  room_id: string
  booking_id?: string
  checkout_time: string
  reason: string
  created_at: string
}

// API functions
export const hotelAPI = {
  // Get all hotels
  async getHotels() {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Hotel[]
  },

  // Get hotel by ID
  async getHotel(id: string) {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Hotel
  },

  // Create hotel
  async createHotel(hotel: Partial<Hotel>) {
    const { data, error } = await supabase
      .from('hotels')
      .insert(hotel)
      .select()
      .single()
    
    if (error) throw error
    return data as Hotel
  }
}

export const roomAPI = {
  // Get rooms by hotel ID
  async getRoomsByHotel(hotelId: string) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('room_number')
    
    if (error) throw error
    return data as Room[]
  },

  // Update room status
  async updateRoomStatus(roomId: string, status: Room['status']) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', roomId)
      .select()
      .single()
    
    if (error) throw error
    return data as Room
  },

  // Get room with current booking
  async getRoomWithBooking(roomId: string) {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        bookings!inner(*)
      `)
      .eq('id', roomId)
      .eq('bookings.status', 'checked_in')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}

export const bookingAPI = {
  // Create booking
  async createBooking(booking: Partial<Booking>) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single()
    
    if (error) throw error
    return data as Booking
  },

  // Check in guest
  async checkIn(bookingId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'checked_in',
        actual_check_in: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()
    
    if (error) throw error

    // Update room status to occupied
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', data.room_id)
    
    return data as Booking
  },

  // Manual checkout
  async checkOut(bookingId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'checked_out',
        actual_check_out: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()
    
    if (error) throw error

    // Update room status to available
    await supabase
      .from('rooms')
      .update({ 
        status: 'available',
        last_checkout: new Date().toISOString()
      })
      .eq('id', data.room_id)
    
    return data as Booking
  },

  // Get bookings by hotel
  async getBookingsByHotel(hotelId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms(room_number, room_type)
      `)
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

export const autoCheckoutAPI = {
  // Trigger manual auto-checkout (for testing)
  async triggerAutoCheckout() {
    const { data, error } = await supabase.rpc('auto_checkout_rooms')
    if (error) throw error
    return data
  },

  // Get auto-checkout logs
  async getAutoCheckoutLogs(hotelId: string) {
    const { data, error } = await supabase
      .from('auto_checkout_logs')
      .select(`
        *,
        rooms(room_number),
        bookings(guest_name)
      `)
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    return data
  }
}