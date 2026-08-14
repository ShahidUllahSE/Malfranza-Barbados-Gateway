import {
  apiRequest,
  clearAdminToken,
  clearDriverToken,
  clearUserToken,
  setAgencyToken,
  type AgencyIdentity,
} from "@/lib/api";

export type AgencyBooking = {
  id: string;
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  apartmentName: string;
  unitName: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  staySubtotal: number;
  totalAmount: number;
  commissionAmount: number;
  commissionRate: number;
  status: string;
  paymentStatus: string;
  agencyCode: string | null;
  createdAt: string;
};

export type AgencyCommissionSummary = {
  agencyCode: string;
  agencyName: string;
  commissionRate: number;
  bookings: number;
  stayRevenue: number;
  commissionOwed: number;
};

export async function registerTravelAgency(input: {
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ agency: AgencyIdentity }> {
  return apiRequest<{ agency: AgencyIdentity }>("/admin/agencies", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function createTravelAgencyAdmin(input: {
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ agency: AgencyIdentity }> {
  return registerTravelAgency(input);
}

export async function loginTravelAgency(
  email: string,
  password: string,
): Promise<{ agency: AgencyIdentity; token: string }> {
  const result = await apiRequest<{ agency: AgencyIdentity; token: string }>("/agencies/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  clearUserToken();
  clearAdminToken();
  clearDriverToken();
  setAgencyToken(result.token);
  return result;
}

export async function listMyAgencyBookings(): Promise<AgencyBooking[]> {
  const result = await apiRequest<{ items: AgencyBooking[] }>("/agencies/me/bookings", {
    agencyAuth: true,
  });
  return result.items.map((b) => ({
    ...b,
    checkIn: String(b.checkIn).slice(0, 10),
    checkOut: String(b.checkOut).slice(0, 10),
  }));
}

export async function getMyAgencyCommission(): Promise<AgencyCommissionSummary> {
  return apiRequest<AgencyCommissionSummary>("/agencies/me/commission", { agencyAuth: true });
}

export async function listAdminAgencies() {
  const result = await apiRequest<{ items: any[] }>("/admin/agencies", { auth: true });
  return result.items;
}

export async function fetchAdminAgencyCommission(params?: {
  fromDate?: string;
  toDate?: string;
  agencyCode?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.fromDate) qs.set("fromDate", params.fromDate);
  if (params?.toDate) qs.set("toDate", params.toDate);
  if (params?.agencyCode) qs.set("agencyCode", params.agencyCode);
  const q = qs.toString();
  return apiRequest<{
    filters: { fromDate: string | null; toDate: string | null; agencyCode: string | null };
    commissionRate: number;
    totals: { bookings: number; stayRevenue: number; commissionOwed: number };
    agencies: Array<{
      agencyCode: string;
      agencyName: string;
      bookings: number;
      stayRevenue: number;
      commissionOwed: number;
    }>;
    bookings: AgencyBooking[];
  }>(`/admin/agencies/commission${q ? `?${q}` : ""}`, { auth: true });
}

export async function setAdminAgencyActive(id: string, isActive: boolean) {
  return apiRequest(`/admin/agencies/${id}/active`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ isActive }),
  });
}

export type AgencyCommissionSettings = {
  defaultCommissionRate: number;
  defaultCommissionPercent: number;
};

export async function fetchAgencyCommissionRate(): Promise<AgencyCommissionSettings> {
  return apiRequest<AgencyCommissionSettings>("/agencies/commission-rate");
}

export async function fetchAdminAgencySettings(): Promise<AgencyCommissionSettings> {
  return apiRequest<AgencyCommissionSettings>("/admin/agencies/settings", { auth: true });
}

export async function updateAdminAgencySettings(input: {
  defaultCommissionPercent: number;
  applyToAllAgencies?: boolean;
}): Promise<AgencyCommissionSettings> {
  return apiRequest<AgencyCommissionSettings>("/admin/agencies/settings", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function requestAgencyPasswordReset(email: string): Promise<{ message: string }> {
  await apiRequest("/agencies/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return { message: "If that email is registered, a reset link has been sent." };
}

export async function confirmAgencyPasswordReset(input: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  await apiRequest("/agencies/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { message: "Password updated. You can sign in with your new password." };
}
