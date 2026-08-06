import { apiRequest } from "@/lib/api";

export type Beds24Status = {
  configured: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
  apiBase: string;
};

export async function fetchBeds24Status() {
  return apiRequest<Beds24Status>("/admin/beds24/status", { auth: true });
}

/** Raw Beds24 response body (includes success, count, data[]) */
export async function fetchBeds24Properties() {
  return apiRequest<unknown>("/admin/beds24/properties", { auth: true });
}

export async function fetchBeds24Bookings() {
  return apiRequest<unknown>("/admin/beds24/bookings", { auth: true });
}
