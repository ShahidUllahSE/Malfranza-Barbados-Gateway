
ALTER TABLE public.apartment_bookings
  ADD COLUMN IF NOT EXISTS taxi_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxi_pickup text,
  ADD COLUMN IF NOT EXISTS taxi_dropoff text,
  ADD COLUMN IF NOT EXISTS taxi_date date,
  ADD COLUMN IF NOT EXISTS taxi_time time,
  ADD COLUMN IF NOT EXISTS taxi_passengers integer,
  ADD COLUMN IF NOT EXISTS taxi_distance_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS taxi_fare numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxi_notes text,
  ADD COLUMN IF NOT EXISTS stay_subtotal numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_fee numeric(10,2);
