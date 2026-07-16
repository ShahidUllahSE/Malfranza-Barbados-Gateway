
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.apt_booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE public.taxi_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE public.enquiry_status AS ENUM ('new', 'responded', 'closed');

-- ============================================================
-- USER ROLES (admin gate)
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
$$;

-- ============================================================
-- BOOKING REFERENCE GENERATOR (MFZ-YYYY-NNNN)
-- ============================================================
CREATE SEQUENCE public.booking_reference_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num bigint;
BEGIN
  next_num := nextval('public.booking_reference_seq');
  RETURN 'MFZ-' || to_char(now(), 'YYYY') || '-' || lpad(next_num::text, 4, '0');
END;
$$;

-- ============================================================
-- APARTMENTS
-- ============================================================
CREATE TABLE public.apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text,
  description text,
  price_per_night numeric(10,2) NOT NULL,
  max_guests int NOT NULL DEFAULT 2,
  bedrooms int NOT NULL DEFAULT 1,
  bathrooms int NOT NULL DEFAULT 1,
  size_sqm int,
  amenities text[] NOT NULL DEFAULT '{}',
  photos text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.apartments TO anon;
GRANT SELECT ON public.apartments TO authenticated;
GRANT ALL ON public.apartments TO service_role;

ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active apartments"
  ON public.apartments FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all apartments"
  ON public.apartments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage apartments"
  ON public.apartments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- APARTMENT BOOKINGS
-- ============================================================
CREATE TABLE public.apartment_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL UNIQUE DEFAULT public.generate_booking_reference(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE RESTRICT,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  nights int NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  special_requests text,
  status public.apt_booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (nights > 0),
  CHECK (guests > 0)
);

CREATE INDEX ON public.apartment_bookings (apartment_id, check_in, check_out);
CREATE INDEX ON public.apartment_bookings (status);

GRANT INSERT ON public.apartment_bookings TO anon;
GRANT INSERT ON public.apartment_bookings TO authenticated;
GRANT ALL ON public.apartment_bookings TO service_role;

ALTER TABLE public.apartment_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create an apartment booking"
  ON public.apartment_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view apartment bookings"
  ON public.apartment_bookings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update apartment bookings"
  ON public.apartment_bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete apartment bookings"
  ON public.apartment_bookings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Public availability check function (safe: returns only a boolean)
CREATE OR REPLACE FUNCTION public.check_apartment_availability(
  _apartment_id uuid,
  _check_in date,
  _check_out date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.apartment_bookings
    WHERE apartment_id = _apartment_id
      AND status IN ('pending', 'confirmed', 'checked_in')
      AND check_in < _check_out
      AND check_out > _check_in
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_apartment_availability(uuid, date, date) TO anon, authenticated;

-- ============================================================
-- TAXI BOOKINGS
-- ============================================================
CREATE TABLE public.taxi_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL UNIQUE DEFAULT public.generate_booking_reference(),
  service_type text NOT NULL,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  pickup_date date NOT NULL,
  pickup_time time NOT NULL,
  passengers int NOT NULL DEFAULT 1,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  notes text,
  estimated_fare numeric(10,2),
  status public.taxi_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (passengers > 0)
);

CREATE INDEX ON public.taxi_bookings (pickup_date);
CREATE INDEX ON public.taxi_bookings (status);

GRANT INSERT ON public.taxi_bookings TO anon;
GRANT INSERT ON public.taxi_bookings TO authenticated;
GRANT ALL ON public.taxi_bookings TO service_role;

ALTER TABLE public.taxi_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a taxi booking"
  ON public.taxi_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view taxi bookings"
  ON public.taxi_bookings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update taxi bookings"
  ON public.taxi_bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete taxi bookings"
  ON public.taxi_bookings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- ENQUIRIES
-- ============================================================
CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.generate_booking_reference(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  interested_in text NOT NULL,
  preferred_dates date,
  message text NOT NULL,
  status public.enquiry_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.enquiries TO anon;
GRANT INSERT ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an enquiry"
  ON public.enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view enquiries"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update enquiries"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete enquiries"
  ON public.enquiries FOR DELETE
  TO authenticated
  USING (public.is_admin());
