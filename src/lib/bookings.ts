import { supabase } from "@/integrations/supabase/client";

export async function getApartmentIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("apartments")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function checkApartmentAvailability(
  apartmentId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_apartment_availability", {
    _apartment_id: apartmentId,
    _check_in: checkIn,
    _check_out: checkOut,
  });
  if (error) throw error;
  return !!data;
}

export type ApartmentBookingInput = {
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  staySubtotal: number;
  serviceFee: number;
  totalAmount: number;
  specialRequests?: string;
  taxi?: {
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
    passengers: number;
    distanceKm: number;
    fare: number;
    notes?: string;
  };
};

export async function createApartmentBooking(input: ApartmentBookingInput) {
  const { data, error } = await supabase.rpc("create_public_apartment_booking", {
    payload: {
      apartment_id: input.apartmentId,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests: input.guests,
      nights: input.nights,
      stay_subtotal: input.staySubtotal,
      service_fee: input.serviceFee,
      total_amount: input.totalAmount,
      special_requests: input.specialRequests ?? null,
      taxi_addon: !!input.taxi,
      taxi_pickup: input.taxi?.pickup ?? null,
      taxi_dropoff: input.taxi?.dropoff ?? null,
      taxi_date: input.taxi?.date ?? "",
      taxi_time: input.taxi?.time ?? "",
      taxi_passengers: input.taxi ? String(input.taxi.passengers) : "",
      taxi_distance_km: input.taxi ? String(input.taxi.distanceKm) : "",
      taxi_fare: input.taxi?.fare ?? 0,
      taxi_notes: input.taxi?.notes ?? null,
    },
  });
  if (error) throw error;
  return data as string;
}

export type TaxiBookingInput = {
  serviceType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
};

export async function createTaxiBooking(input: TaxiBookingInput) {
  const { data, error } = await supabase.rpc("create_public_taxi_booking", {
    payload: {
      service_type: input.serviceType,
      pickup_location: input.pickupLocation,
      dropoff_location: input.dropoffLocation,
      pickup_date: input.pickupDate,
      pickup_time: input.pickupTime,
      passengers: String(input.passengers),
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      notes: input.notes ?? null,
      estimated_fare: 0,
    },
  });
  if (error) throw error;
  return data as string;
}

export type EnquiryInput = {
  name: string;
  email: string;
  phone?: string;
  interestedIn: string;
  preferredDates?: string;
  message: string;
};

export async function createEnquiry(input: EnquiryInput) {
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      interested_in: input.interestedIn,
      preferred_dates: input.preferredDates || null,
      message: input.message,
    })
    .select("reference")
    .single();
  if (error) throw error;
  return data.reference;
}
