CREATE OR REPLACE FUNCTION public.create_public_apartment_booking(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ref text;
BEGIN
  INSERT INTO public.apartment_bookings (
    apartment_id, guest_name, guest_email, guest_phone,
    check_in, check_out, guests, nights,
    stay_subtotal, service_fee, total_amount, special_requests,
    taxi_addon, taxi_pickup, taxi_dropoff, taxi_date, taxi_time,
    taxi_passengers, taxi_distance_km, taxi_fare, taxi_notes
  ) VALUES (
    (payload->>'apartment_id')::uuid,
    payload->>'guest_name',
    payload->>'guest_email',
    payload->>'guest_phone',
    (payload->>'check_in')::date,
    (payload->>'check_out')::date,
    (payload->>'guests')::int,
    (payload->>'nights')::int,
    (payload->>'stay_subtotal')::numeric,
    COALESCE((payload->>'service_fee')::numeric, 0),
    (payload->>'total_amount')::numeric,
    payload->>'special_requests',
    COALESCE((payload->>'taxi_addon')::boolean, false),
    payload->>'taxi_pickup',
    payload->>'taxi_dropoff',
    NULLIF(payload->>'taxi_date','')::date,
    NULLIF(payload->>'taxi_time','')::time,
    NULLIF(payload->>'taxi_passengers','')::int,
    NULLIF(payload->>'taxi_distance_km','')::numeric,
    COALESCE((payload->>'taxi_fare')::numeric, 0),
    payload->>'taxi_notes'
  )
  RETURNING booking_reference INTO new_ref;
  RETURN new_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_apartment_booking(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_taxi_booking(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ref text;
BEGIN
  INSERT INTO public.taxi_bookings (
    service_type, pickup_location, dropoff_location,
    pickup_date, pickup_time, passengers,
    customer_name, customer_email, customer_phone,
    notes, estimated_fare
  ) VALUES (
    payload->>'service_type',
    payload->>'pickup_location',
    payload->>'dropoff_location',
    (payload->>'pickup_date')::date,
    NULLIF(payload->>'pickup_time','')::time,
    (payload->>'passengers')::int,
    payload->>'customer_name',
    payload->>'customer_email',
    payload->>'customer_phone',
    payload->>'notes',
    COALESCE((payload->>'estimated_fare')::numeric, 0)
  )
  RETURNING booking_reference INTO new_ref;
  RETURN new_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_taxi_booking(jsonb) TO anon, authenticated;