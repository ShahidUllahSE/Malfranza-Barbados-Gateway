import { apiRequest, clearAdminToken, clearDriverToken, clearUserToken, getUserToken, setUserToken } from "@/lib/api";

export type UserIdentity = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
};

export async function startSignup(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<{ email: string; message: string; emailSent: boolean; expiresInSeconds: number }> {
  return apiRequest("/users/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifySignupOtp(input: {
  email: string;
  code: string;
}): Promise<UserIdentity> {
  const result = await apiRequest<{ user: UserIdentity; token: string }>(
    "/users/register/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  clearAdminToken();
  clearDriverToken();
  setUserToken(result.token);
  return result.user;
}

export async function resendSignupOtp(email: string): Promise<{
  email: string;
  message: string;
  emailSent: boolean;
  expiresInSeconds: number;
}> {
  return apiRequest("/users/register/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
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
