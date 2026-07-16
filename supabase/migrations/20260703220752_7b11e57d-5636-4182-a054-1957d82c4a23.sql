GRANT EXECUTE ON FUNCTION public.generate_booking_reference() TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.booking_reference_seq TO anon, authenticated;