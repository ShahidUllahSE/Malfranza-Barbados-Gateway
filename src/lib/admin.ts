import { apiRequest, getCurrentAdmin } from "@/lib/api";

export type AptBookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
export type TaxiStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "en_route"
  | "completed"
  | "cancelled";

/** Guest van hold stores a driverId; a person is assigned only after admin assign. */
export function taxiHasAssignedDriver(status: TaxiStatus) {
  return status === "assigned" || status === "en_route" || status === "completed";
}
export type EnquiryStatus = "new" | "responded" | "closed";

export async function checkIsAdmin(): Promise<boolean> {
  try {
    await getCurrentAdmin();
    return true;
  } catch {
    return false;
  }
}

function mapLinkedUser(record: any) {
  if (!record?.userId || typeof record.userId !== "object") return null;
  return {
    id: record.userId._id ?? record.userId,
    name: record.userId.name,
    email: record.userId.email,
    phone: record.userId.phone ?? null,
  };
}

export async function listApartmentBookings() {
  const result = await apiRequest<{ items: any[] }>("/admin/bookings?limit=100", { auth: true });
  return result.items.map((booking) => ({
    id: booking._id,
    booking_reference: booking.bookingReference,
    apartment_id: String(booking.apartmentId),
    unit_id: booking.unitId ? String(booking.unitId) : null,
    unit_name: booking.unitName ?? null,
    guest_name: booking.guestName,
    guest_email: booking.guestEmail,
    guest_phone: booking.guestPhone,
    user_account: mapLinkedUser(booking),
    check_in: toDateOnly(booking.checkIn),
    check_out: toDateOnly(booking.checkOut),
    guests: booking.guests,
    nights: booking.nights,
    stay_subtotal: booking.staySubtotal,
    service_fee: booking.serviceFee,
    total_amount: booking.totalAmount,
    special_requests: booking.specialRequests ?? null,
    status: booking.status as AptBookingStatus,
    payment_status: booking.paymentStatus,
    payment_reference: booking.paymentReference ?? null,
    agency_id: booking.agencyId ? String(booking.agencyId) : null,
    agency_code: booking.agencyCode ?? null,
    agency_name: booking.agencyName ?? null,
    commission_rate: booking.commissionRate ?? null,
    commission_amount: booking.commissionAmount ?? 0,
    taxi_addon: !!booking.taxi,
    taxi_pickup: booking.taxi?.pickup ?? null,
    taxi_dropoff: booking.taxi?.dropoff ?? null,
    taxi_date: booking.taxi?.date ? toDateOnly(booking.taxi.date) : null,
    taxi_time: booking.taxi?.time ?? null,
    taxi_passengers: booking.taxi?.passengers ?? null,
    taxi_distance_km: booking.taxi?.distanceKm ?? null,
    taxi_fare: booking.taxi?.fare ?? 0,
    taxi_notes: booking.taxi?.notes ?? null,
    created_at: booking.createdAt,
    cancelled_at: booking.cancelledAt ?? null,
    cancelled_by: booking.cancelledBy ?? null,
    cancellation_reason: booking.cancellationReason ?? null,
    refund_percent: booking.refundPercent ?? 0,
    refund_amount: booking.refundAmount ?? 0,
    refund_status: booking.refundStatus ?? "none",
    refund_payout: booking.refundPayout ?? null,
    apartments: { name: booking.apartmentName, slug: "" },
  }));
}

export async function createAdminStayBooking(input: {
  apartmentId: string;
  unitId?: string;
  unitIds?: string[];
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  specialRequests?: string;
  agencyCode?: string;
  paymentStatus: "unpaid" | "paid";
  paymentReference?: string;
  status: "pending" | "confirmed";
  notifyGuest: boolean;
}) {
  return apiRequest("/admin/bookings", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      apartmentId: input.apartmentId,
      unitId: input.unitId,
      unitIds: input.unitIds,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      guests: input.guests,
      specialRequests: input.specialRequests || undefined,
      agencyCode: input.agencyCode || undefined,
      paymentStatus: input.paymentStatus,
      paymentReference: input.paymentReference || undefined,
      status: input.status,
      notifyGuest: input.notifyGuest,
    }),
  });
}

export async function updateApartmentBookingStatus(id: string, status: AptBookingStatus) {
  await apiRequest(`/admin/bookings/${id}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}

export type AdminTaxiBooking = {
  id: string;
  booking_reference: string;
  service_type: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  user_account: { id: string; name: string; email: string; phone: string | null } | null;
  notes: string | null;
  estimated_fare: number;
  distance_km: number;
  duration_minutes: number | null;
  status: TaxiStatus;
  driver: {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicleLabel: string | null;
    isAvailable: boolean;
  } | null;
  assigned_at: string | null;
  created_at: string;
  payment_status?: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  refund_percent?: number;
  refund_amount?: number;
  refund_status?: string;
  refund_payout?: {
    method?: string;
    accountName?: string;
    paypalEmail?: string;
    bankName?: string;
    accountNumber?: string;
    routingOrSortCode?: string;
    notes?: string;
  } | null;
};

function mapTaxiBooking(booking: any): AdminTaxiBooking {
  return {
    id: booking._id,
    booking_reference: booking.bookingReference,
    service_type: booking.serviceType,
    pickup_location: booking.pickupLocation,
    dropoff_location: booking.dropoffLocation,
    pickup_date: toDateOnly(booking.pickupDate),
    pickup_time: booking.pickupTime,
    passengers: booking.passengers,
    customer_name: booking.customerName,
    customer_email: booking.customerEmail,
    customer_phone: booking.customerPhone,
    user_account: mapLinkedUser(booking),
    notes: booking.notes ?? null,
    estimated_fare: booking.estimatedFare,
    distance_km: booking.distanceKm,
    duration_minutes: booking.durationMinutes ?? null,
    status: booking.status as TaxiStatus,
    driver: mapLinkedDriver(booking),
    assigned_at: booking.assignedAt ?? null,
    created_at: booking.createdAt,
    payment_status: booking.paymentStatus ?? null,
    cancelled_at: booking.cancelledAt ?? null,
    cancelled_by: booking.cancelledBy ?? null,
    cancellation_reason: booking.cancellationReason ?? null,
    refund_percent: booking.refundPercent ?? 0,
    refund_amount: booking.refundAmount ?? 0,
    refund_status: booking.refundStatus ?? "none",
    refund_payout: booking.refundPayout ?? null,
  };
}

export async function listTaxiBookings() {
  const result = await apiRequest<{ items: any[] }>("/admin/taxi?limit=100", { auth: true });
  return result.items.map(mapTaxiBooking);
}

export async function getTaxiBooking(id: string) {
  const booking = await apiRequest<any>(`/admin/taxi/${id}`, { auth: true });
  return mapTaxiBooking(booking);
}

export async function createAdminTaxiBooking(input: {
  serviceType: "Airport Pickup" | "Airport Drop-off" | "Point to Point" | "Hourly / Custom";
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
  paymentStatus: "unpaid" | "paid";
  paymentReference?: string;
  status: "pending" | "confirmed";
  notifyGuest: boolean;
}) {
  return apiRequest("/admin/taxi", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      serviceType: input.serviceType,
      pickupLocation: input.pickupLocation,
      dropoffLocation: input.dropoffLocation,
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime,
      passengers: input.passengers,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      notes: input.notes || undefined,
      driverId: input.driverId || undefined,
      paymentStatus: input.paymentStatus,
      paymentReference: input.paymentReference || undefined,
      paymentMethod: "Offline",
      status: input.status,
      notifyGuest: input.notifyGuest,
    }),
  });
}

export async function updateTaxiBookingStatus(id: string, status: TaxiStatus) {
  await apiRequest(`/admin/taxi/${id}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}

export async function assignTaxiDriver(bookingId: string, driverId: string) {
  return apiRequest(`/admin/taxi/${bookingId}/assign`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ driverId }),
  });
}

function mapLinkedDriver(record: any) {
  if (!record?.driverId || typeof record.driverId !== "object") return null;
  return {
    id: String(record.driverId._id ?? record.driverId),
    name: record.driverId.name as string,
    email: record.driverId.email as string,
    phone: record.driverId.phone as string,
    vehicleLabel: (record.driverId.vehicleLabel as string | null) ?? null,
    isAvailable: !!record.driverId.isAvailable,
  };
}

export async function listEnquiries() {
  const result = await apiRequest<{ items: any[] }>("/admin/enquiries?limit=100", { auth: true });
  return result.items.map((enquiry) => ({
    id: enquiry._id,
    reference: enquiry.reference,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone ?? null,
    user_account: mapLinkedUser(enquiry),
    interested_in: enquiry.interestedIn,
    preferred_dates: enquiry.preferredDate ? toDateOnly(enquiry.preferredDate) : null,
    message: enquiry.message,
    status: enquiry.status as EnquiryStatus,
    admin_notes: enquiry.adminNotes ?? null,
    created_at: enquiry.createdAt,
  }));
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  await apiRequest(`/admin/enquiries/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}

export async function updateEnquiry(
  id: string,
  patch: Partial<{ status: EnquiryStatus; admin_notes: string }>,
) {
  await apiRequest(`/admin/enquiries/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({
      status: patch.status,
      adminNotes: patch.admin_notes,
    }),
  });
}

export async function listAllApartments() {
  const result = await apiRequest<{ items: any[] }>("/admin/apartments?limit=100", { auth: true });
  return result.items.map(toLegacyApartment);
}

export async function createApartment(input: {
  name: string;
  slug: string;
  subtitle?: string;
  description: string;
  type: "one-bedroom" | "two-bedroom" | "three-bedroom";
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm?: number;
  amenities: string[];
  photos: string[];
  is_active?: boolean;
  units?: ApartmentUnitInput[];
  units_exclusive?: boolean;
}) {
  const result = await apiRequest<any>("/admin/apartments", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      subtitle: input.subtitle || undefined,
      description: input.description,
      type: input.type,
      pricePerNight: input.price_per_night,
      maxGuests: input.max_guests,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      sizeSqM: input.size_sqm,
      amenities: input.amenities,
      photos: input.photos,
      isActive: input.is_active ?? true,
      units: input.units ?? [],
      unitsExclusive: input.units_exclusive ?? false,
    }),
  });
  return toLegacyApartment(result);
}

export async function updateApartment(id: string, patch: Partial<{
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  type: "one-bedroom" | "two-bedroom" | "three-bedroom";
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  units: ApartmentUnitInput[];
  units_exclusive: boolean;
}>) {
  await apiRequest(`/admin/apartments/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({
      name: patch.name,
      slug: patch.slug,
      subtitle: patch.subtitle === null ? undefined : patch.subtitle,
      description: patch.description ?? undefined,
      type: patch.type,
      pricePerNight: patch.price_per_night,
      maxGuests: patch.max_guests,
      bedrooms: patch.bedrooms,
      bathrooms: patch.bathrooms,
      sizeSqM: patch.size_sqm === null ? undefined : patch.size_sqm,
      amenities: patch.amenities,
      photos: patch.photos,
      isActive: patch.is_active,
      units: patch.units,
      unitsExclusive: patch.units_exclusive,
    }),
  });
}

export async function deleteApartment(id: string) {
  await apiRequest(`/admin/apartments/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export type ApartmentUnitInput = {
  _id?: string;
  name: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  isActive: boolean;
};

export async function uploadApartmentImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  return apiRequest<{ url: string; publicId: string }>("/admin/media/images", {
    method: "POST",
    auth: true,
    body: form,
  });
}

export type AdminRefundItem = {
  id: string;
  kind: "stay" | "taxi";
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  title: string;
  eventDate: string;
  totalPaid: number;
  refundPercent: number;
  refundAmount: number;
  refundStatus: string;
  refundPayout: {
    method?: string;
    accountName?: string;
    paypalEmail?: string;
    bankName?: string;
    accountNumber?: string;
    routingOrSortCode?: string;
    notes?: string;
  } | null;
  refundAdminNote: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  refundRequestedAt: string | null;
  refundReviewedAt: string | null;
  refundProcessedAt: string | null;
  paymentStatus: string;
  href: string;
};

export async function listAdminRefunds(params?: {
  status?: "all" | "eligible" | "requested" | "reviewing" | "processed" | "rejected";
  kind?: "all" | "stay" | "taxi";
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.kind) qs.set("kind", params.kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<{
    items: AdminRefundItem[];
    counts: {
      eligible: number;
      requested: number;
      reviewing: number;
      processed: number;
      rejected: number;
      open: number;
    };
  }>(`/admin/refunds${suffix}`, { auth: true });
}

export async function updateAdminRefund(
  kind: "stay" | "taxi",
  id: string,
  input: { status: "reviewing" | "processed" | "rejected"; adminNote?: string },
) {
  return apiRequest<AdminRefundItem>(`/admin/refunds/${kind}/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function toLegacyApartment(apartment: any) {
  return {
    id: apartment._id,
    name: apartment.name,
    slug: apartment.slug,
    subtitle: apartment.subtitle ?? null,
    description: apartment.description,
    type: apartment.type as "one-bedroom" | "two-bedroom" | "three-bedroom",
    price_per_night: apartment.pricePerNight,
    max_guests: apartment.maxGuests,
    bedrooms: apartment.bedrooms,
    bathrooms: apartment.bathrooms,
    size_sqm: apartment.sizeSqM ?? null,
    amenities: apartment.amenities ?? [],
    photos: apartment.photos ?? [],
    is_active: apartment.isActive,
    units_exclusive: apartment.unitsExclusive === true,
    units: (apartment.units ?? []).map((unit: any) => ({
      _id: String(unit._id),
      name: unit.name,
      description: unit.description ?? "",
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      maxGuests: unit.maxGuests,
      pricePerNight: unit.pricePerNight,
      isActive: unit.isActive,
    })),
    created_at: apartment.createdAt,
  };
}
