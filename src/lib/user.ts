import { apiRequest, clearAdminToken, clearDriverToken, clearUserToken, getUserToken, setUserToken } from "@/lib/api";

export type UserIdentity = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
};

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<UserIdentity> {
  const result = await apiRequest<{ user: UserIdentity; token: string }>("/users/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  clearAdminToken();
  clearDriverToken();
  setUserToken(result.token);
  return result.user;
}

export async function loginUser(email: string, password: string): Promise<UserIdentity> {
  const result = await apiRequest<{ user: UserIdentity; token: string }>("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  clearAdminToken();
  clearDriverToken();
  setUserToken(result.token);
  return result.user;
}

export function logoutUser(): void {
  clearUserToken();
}

export function getCurrentUser(): Promise<UserIdentity> {
  return apiRequest<UserIdentity>("/users/me", { userAuth: true });
}

export function isUserSignedIn(): boolean {
  return !!getUserToken();
}

export async function listMyBookings() {
  const result = await apiRequest<{ items: any[] }>("/users/me/bookings", { userAuth: true });
  return result.items;
}

export async function getMyBooking(reference: string) {
  return apiRequest<any>(`/users/me/bookings/${encodeURIComponent(reference)}`, { userAuth: true });
}

export async function listMyTaxiBookings() {
  const result = await apiRequest<{ items: any[] }>("/users/me/taxi", { userAuth: true });
  return result.items;
}
