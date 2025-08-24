/*
  # Hotel Management System with Auto-Checkout

  1. New Tables
    - `hotels` - Store hotel information
    - `rooms` - Store room details with status
    - `bookings` - Store booking information with check-in/out times
    - `auto_checkout_logs` - Log auto-checkout activities
    - `room_status_history` - Track room status changes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for hotel owners

  3. Features
    - Auto-checkout system support
    - Real-time room status tracking
    - Booking management
    - Owner dashboard support
*/

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  address text,
  phone text,
  email text,
  checkout_time time DEFAULT '10:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_type text DEFAULT 'standard',
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')),
  price_per_night decimal(10,2) DEFAULT 0,
  max_occupancy integer DEFAULT 2,
  amenities text[],
  last_checkout timestamptz,
  auto_checkout_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hotel_id, room_number)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
  total_amount decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  auto_checkout boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto checkout logs table
CREATE TABLE IF NOT EXISTS auto_checkout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  checkout_time timestamptz DEFAULT now(),
  reason text DEFAULT 'daily_auto_checkout',
  created_at timestamptz DEFAULT now()
);

-- Room status history table
CREATE TABLE IF NOT EXISTS room_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_checkout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hotels
CREATE POLICY "Hotel owners can manage their hotels"
  ON hotels
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view hotels"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for rooms
CREATE POLICY "Hotel owners can manage their rooms"
  ON rooms
  FOR ALL
  TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

CREATE POLICY "Anyone can view available rooms"
  ON rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for bookings
CREATE POLICY "Hotel owners can manage bookings for their hotels"
  ON bookings
  FOR ALL
  TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

CREATE POLICY "Guests can view their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (guest_email = auth.email());

-- RLS Policies for auto checkout logs
CREATE POLICY "Hotel owners can view their auto checkout logs"
  ON auto_checkout_logs
  FOR SELECT
  TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

-- RLS Policies for room status history
CREATE POLICY "Hotel owners can view room status history"
  ON room_status_history
  FOR SELECT
  TO authenticated
  USING (room_id IN (SELECT id FROM rooms WHERE hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())));

-- Function to auto checkout rooms daily at 10 AM
CREATE OR REPLACE FUNCTION auto_checkout_rooms()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update bookings to checked out
  UPDATE bookings 
  SET 
    status = 'checked_out',
    actual_check_out = now(),
    auto_checkout = true,
    updated_at = now()
  WHERE 
    status = 'checked_in' 
    AND check_out_date <= CURRENT_DATE;

  -- Update room status to available
  UPDATE rooms 
  SET 
    status = 'available',
    last_checkout = now(),
    updated_at = now()
  WHERE 
    id IN (
      SELECT DISTINCT room_id 
      FROM bookings 
      WHERE status = 'checked_out' 
      AND auto_checkout = true 
      AND DATE(actual_check_out) = CURRENT_DATE
    );

  -- Log auto checkout activities
  INSERT INTO auto_checkout_logs (hotel_id, room_id, booking_id, checkout_time, reason)
  SELECT 
    b.hotel_id,
    b.room_id,
    b.id,
    now(),
    'daily_auto_checkout_10am'
  FROM bookings b
  WHERE 
    b.status = 'checked_out' 
    AND b.auto_checkout = true 
    AND DATE(b.actual_check_out) = CURRENT_DATE;

  -- Log room status changes
  INSERT INTO room_status_history (room_id, old_status, new_status, change_reason)
  SELECT 
    r.id,
    'occupied',
    'available',
    'auto_checkout_daily_10am'
  FROM rooms r
  WHERE 
    r.status = 'available' 
    AND DATE(r.last_checkout) = CURRENT_DATE;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_id ON bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_auto_checkout_logs_hotel_id ON auto_checkout_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_status_history_room_id ON room_status_history(room_id);

-- Insert sample data for testing
INSERT INTO hotels (name, owner_id, address, phone, email) VALUES
('Sample Hotel', auth.uid(), '123 Main St, City', '+1234567890', 'owner@hotel.com')
ON CONFLICT DO NOTHING;

-- Insert sample rooms
INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, max_occupancy) 
SELECT 
  h.id,
  'Room ' || generate_series(101, 110),
  'standard',
  100.00,
  2
FROM hotels h
WHERE h.name = 'Sample Hotel'
ON CONFLICT DO NOTHING;