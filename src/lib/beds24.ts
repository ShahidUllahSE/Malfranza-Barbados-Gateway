import { apiRequest } from "@/lib/api";
import type { Beds24ChannelId } from "@/lib/beds24-channels";

export type Beds24Status = {
  configured: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
  apiBase: string;
};

export type Beds24Health = Beds24Status & {
  apiOk: boolean;
  propertyCount?: number;
  bookingCount?: number;
  message?: string;
  error?: string;
};

export async function fetchBeds24Status() {
  return apiRequest<Beds24Status>("/admin/beds24/status", { auth: true });
}

export async function fetchBeds24Health() {
  return apiRequest<Beds24Health>("/admin/beds24/health", { auth: true });
}

/** Raw Beds24 response body (includes success, count, data[]) */
export async function fetchBeds24Properties() {
  return apiRequest<unknown>("/admin/beds24/properties", { auth: true });
}

export async function fetchBeds24Bookings(channel?: Beds24ChannelId) {
  const query = channel ? `?channel=${encodeURIComponent(channel)}` : "";
  return apiRequest<unknown>(`/admin/beds24/bookings${query}`, { auth: true });
}
