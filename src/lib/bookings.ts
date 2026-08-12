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
  unitIds?: string | string[],
): Promise<boolean> {
  const params = new URLSearchParams({ apartmentId, checkIn, checkOut });
  const ids = (Array.isArray(unitIds) ? unitIds : unitIds ? [unitIds] : []).filter(Boolean);
  if (ids.length === 1) params.set("unitId", ids[0]);
  else if (ids.length > 1) params.set("unitIds", ids.join(","));
  const result = await apiRequest<{ available: boolean }>(`/bookings/availability?${params}`);
  return result.available;
}

export type ApartmentOccupancy = {
  apartmentId: string;
  slug: string;
  name: string;
  subtitle: string | null;
  unitsExclusive?: boolean;
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
  blockedRanges: Array<{
    checkIn: string;
    checkOut: string;
    status: string;
    unitId?: string | null;
    unitName?: string | null;
  }>;
  units: Array<{
    id: string;
    name: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    pricePerNight: number;
    isActive: boolean;
    available: boolean;
    occupiedNow: boolean;
    blockedRanges: Array<{ checkIn: string; checkOut: string; status: string }>;
  }>;
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
  unitId?: string;
  unitIds?: string[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  agencyCode?: string;
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

export type ApartmentBookingResult = {
  bookingReference: string;
  status?: string;
  paymentStatus?: string;
  nights?: number;
  totalAmount?: number;
  accountCreated?: boolean;
  token?: string | null;
  user?: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: "user";
  };
};

export async function createApartmentBooking(input: ApartmentBookingInput): Promise<ApartmentBookingResult> {
  return apiRequest<ApartmentBookingResult>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
    optionalUserAuth: true,
  });
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
  driverId?: string;
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
  accountCreated?: boolean;
  token?: string | null;
  user?: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: "user";
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleLabel: string | null;
    passengerCapacity?: number | null;
  } | null;
};

export type PublicTaxiVehicle = {
  id: string;
  name: string;
  vehicleLabel: string;
  passengerCapacity: number;
  isAvailable: boolean;
  fitsParty: boolean;
  fare: number;
};

export type PublicTaxiVehiclesResult = {
  fare: number;
  distanceKm: number | null;
  durationMinutes: number | null;
  currency: string;
  vehicles: PublicTaxiVehicle[];
};

export async function fetchTaxiVehicles(input: {
  passengers: number;
  pickupDate?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}): Promise<PublicTaxiVehiclesResult> {
  const params = new URLSearchParams({
    passengers: String(input.passengers),
  });
  if (input.pickupDate) params.set("pickupDate", input.pickupDate);
  if (input.pickupLocation) params.set("pickupLocation", input.pickupLocation);
  if (input.dropoffLocation) params.set("dropoffLocation", input.dropoffLocation);
  return apiRequest<PublicTaxiVehiclesResult>(`/taxi/vehicles?${params.toString()}`);
}

export async function createTaxiBooking(input: TaxiBookingInput): Promise<TaxiBookingResult> {
  return apiRequest<TaxiBookingResult>("/taxi/bookings", {
    method: "POST",
    body: JSON.stringify(input),
    optionalUserAuth: true,
  });
}

export type TaxiFareEstimate = {
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFare: number;
  currency?: string;
  estimated?: boolean;
  guestFare?: number;
  perKmUsd?: number;
};

export type TaxiFareSettings = {
  fareFor1Guest: number;
  fareFor2Guests: number;
  fareFor3Guests: number;
  fareFor4PlusGuests: number;
  perKmUsd: number;
  minimumFareUsd: number;
};

export function guestFareFromSettings(settings: TaxiFareSettings, passengers: number): number {
  if (passengers <= 1) return settings.fareFor1Guest;
  if (passengers === 2) return settings.fareFor2Guests;
  if (passengers === 3) return settings.fareFor3Guests;
  return settings.fareFor4PlusGuests;
}

export async function fetchTaxiFareSettings(): Promise<TaxiFareSettings> {
  return apiRequest<TaxiFareSettings>("/taxi/fare-settings");
}

export async function fetchAdminTaxiFareSettings(): Promise<TaxiFareSettings> {
  return apiRequest<TaxiFareSettings>("/admin/taxi/settings", { auth: true });
}

export async function updateAdminTaxiFareSettings(
  settings: TaxiFareSettings,
): Promise<TaxiFareSettings> {
  return apiRequest<TaxiFareSettings>("/admin/taxi/settings", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(settings),
  });
}

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
