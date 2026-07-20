import { apiRequest, type DriverIdentity } from "@/lib/api";

export type AdminDriver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleLabel: string | null;
  isAvailable: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
};

export async function listDrivers(): Promise<AdminDriver[]> {
  const result = await apiRequest<{ items: AdminDriver[] }>("/admin/drivers?limit=100", {
    auth: true,
  });
  return result.items;
}

export async function listAvailableDrivers(): Promise<AdminDriver[]> {
  const result = await apiRequest<{ items: AdminDriver[] }>("/admin/drivers/available", {
    auth: true,
  });
  return result.items;
}

export async function createDriver(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleLabel?: string;
  isAvailable?: boolean;
}) {
  return apiRequest<DriverIdentity>("/admin/drivers", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function updateDriver(
  id: string,
  patch: Partial<{
    name: string;
    phone: string;
    vehicleLabel: string | null;
    password: string;
    isAvailable: boolean;
    isActive: boolean;
  }>,
) {
  return apiRequest<DriverIdentity>(`/admin/drivers/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(patch),
  });
}

export type DriverTripStatus = "assigned" | "en_route" | "completed" | "cancelled";

export type DriverDetailTrip = {
  id: string;
  bookingReference: string;
  serviceType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string | null;
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFare: number;
  status: DriverTripStatus | string;
  assignedAt: string | null;
  createdAt: string | null;
};

export type DriverDetailStats = {
  total: number;
  completed: number;
  cancelled: number;
  assigned: number;
  enRoute: number;
  completedToday: number;
  completedThisWeek: number;
  activeNow: number;
  fareEarned: number;
};

export type DriverDetailFilters = {
  status?: "all" | DriverTripStatus;
  day?: "all" | "today" | "yesterday" | "week" | "month";
  fromDate?: string;
  toDate?: string;
};

export type DriverDetailResponse = {
  driver: AdminDriver;
  stats: DriverDetailStats;
  trips: DriverDetailTrip[];
  filters: {
    status: string;
    day: string;
    fromDate: string | null;
    toDate: string | null;
  };
};

export async function getDriverDetail(
  id: string,
  filters: DriverDetailFilters = {},
): Promise<DriverDetailResponse> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.day && filters.day !== "all") params.set("day", filters.day);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  const qs = params.toString();
  return apiRequest<DriverDetailResponse>(`/admin/drivers/${id}${qs ? `?${qs}` : ""}`, {
    auth: true,
  });
}

export async function setMyDriverAvailability(isAvailable: boolean) {
  return apiRequest<DriverIdentity>("/drivers/me/availability", {
    method: "PATCH",
    driverAuth: true,
    body: JSON.stringify({ isAvailable }),
  });
}

export async function listMyDriverTrips() {
  const result = await apiRequest<{ items: any[] }>("/drivers/me/trips", { driverAuth: true });
  return result.items;
}

export async function updateMyTripStatus(
  tripId: string,
  status: "en_route" | "completed" | "cancelled",
) {
  return apiRequest(`/drivers/me/trips/${tripId}/status`, {
    method: "PATCH",
    driverAuth: true,
    body: JSON.stringify({ status }),
  });
}
