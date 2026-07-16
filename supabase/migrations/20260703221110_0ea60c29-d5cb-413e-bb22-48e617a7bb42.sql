CREATE OR REPLACE FUNCTION public.get_public_booking(_reference text)
RETURNS TABLE (
  booking_reference text,
  apartment_name text,
  check_in date,
  check_out date,
  nights int,
  guests int,
  total_amount numeric,
  status text,
  taxi_addon boolean,
  taxi_date date,
  taxi_time time,
  taxi_pickup text,
  taxi_dropoff text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.booking_reference, a.name, b.check_in, b.check_out, b.nights, b.guests,
         b.total_amount, b.status::text, b.taxi_addon, b.taxi_date, b.taxi_time,
         b.taxi_pickup, b.taxi_dropoff, b.created_at
  FROM public.apartment_bookings b
  LEFT JOIN public.apartments a ON a.id = b.apartment_id
  WHERE b.booking_reference = _reference
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking(text) TO anon, authenticated;