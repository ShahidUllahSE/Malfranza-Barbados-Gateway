import { apiRequest, getUserToken } from "@/lib/api";

export async function getApartmentIdBySlug(slug: string): Promise<string | null> {
  try {
    const apartment = await apiRequest<{ _id: string }>(`/apartments/${encodeURIComponent(slug)}`);
    return apartment._id;
  } catch {
    return null;
  }
}

export async function checkApartmentAvailability(
  apartmentId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const params = new URLSearchParams({ apartmentId, checkIn, checkOut });
  const result = await apiRequest<{ available: boolean }>(`/bookings/availability?${params}`);
  return result.available;
}

export type ApartmentOccupancy = {
  apartmentId: string;
  slug: string;
  name: string;
  subtitle: string | null;
  available: boolean;
  occupiedNow: boolean;
  currentBooking: {
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  nextBooking: {
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  blockedRanges: Array<{ checkIn: string; checkOut: string; status: string }>;
};

export async function fetchApartmentOccupancy(opts?: {
  checkIn?: string;
  checkOut?: string;
}): Promise<ApartmentOccupancy[]> {
  const params = new URLSearchParams();
  if (opts?.checkIn) params.set("checkIn", opts.checkIn);
  if (opts?.checkOut) params.set("checkOut", opts.checkOut);
  const qs = params.toString();
  const result = await apiRequest<{ items: ApartmentOccupancy[] }>(
    `/bookings/occupancy${qs ? `?${qs}` : ""}`,
  );
  return result.items;
}

export type ApartmentBookingInput = {
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  paymentStatus?: "unpaid" | "paid";
  paymentReference?: string;
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
  if (!getUserToken()) {
    throw new Error("Sign in required to book a stay");
  }
  const result = await apiRequest<{ bookingReference: string }>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
    userAuth: true,
  });
  return result.bookingReference;
}

export async function getPublicBooking(reference: string, email: string) {
  return apiRequest<any>(
    `/bookings/${encodeURIComponent(reference)}?email=${encodeURIComponent(email)}`,
  );
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

export type TaxiBookingResult = {
  bookingReference: string;
  status: string;
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFare: number;
  currency: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  serviceType?: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleLabel: string | null;
  } | null;
};

export async function createTaxiBooking(input: TaxiBookingInput): Promise<TaxiBookingResult> {
  if (!getUserToken()) {
    throw new Error("Sign in required to book a ride");
  }
  return apiRequest<TaxiBookingResult>("/taxi/bookings", {
    method: "POST",
    body: JSON.stringify(input),
    userAuth: true,
  });
}

export type TaxiFareEstimate = {
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFare: number;
  currency?: string;
  estimated?: boolean;
};

/** Client-side fare estimate (replaces former TanStack Start server function). */
export async function estimateTaxiFare(input: {
  pickupLocation: string;
  dropoffLocation: string;
  passengers: number;
}): Promise<TaxiFareEstimate> {
  return apiRequest<TaxiFareEstimate>("/taxi/fare-estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  const result = await apiRequest<{ reference: string }>("/enquiries", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone,
      interestedIn: input.interestedIn,
      preferredDate: input.preferredDates,
      message: input.message,
    }),
    userAuth: !!getUserToken(),
  });
  return result.reference;
}
