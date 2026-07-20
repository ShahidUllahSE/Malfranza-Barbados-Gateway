import { parseApiErrorPayload } from "./api-errors";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? "http://localhost:5000/api/v1";

const TOKEN_KEY = "mfz.adminToken";
const USER_TOKEN_KEY = "mfz.userToken";
const DRIVER_TOKEN_KEY = "mfz.driverToken";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token: string): void {
  localStorage.setItem(USER_TOKEN_KEY, token);
}

export function clearUserToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(USER_TOKEN_KEY);
}

export function getDriverToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DRIVER_TOKEN_KEY);
}

export function setDriverToken(token: string): void {
  localStorage.setItem(DRIVER_TOKEN_KEY, token);
}

export function clearDriverToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(DRIVER_TOKEN_KEY);
}

export function clearAllTokens(): void {
  clearAdminToken();
  clearUserToken();
  clearDriverToken();
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { auth?: boolean; userAuth?: boolean; driverAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const flags = [init.auth, init.userAuth, init.driverAuth].filter(Boolean).length;
  if (flags > 1) {
    throw new Error("Use only one of auth, userAuth, or driverAuth");
  }

  if (init.auth) {
    const token = getAdminToken();
    if (!token) throw new Error("Admin authentication required");
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.userAuth) {
    const token = getUserToken();
    if (!token) throw new Error("Sign in required");
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.driverAuth) {
    const token = getDriverToken();
    if (!token) throw new Error("Driver authentication required");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string; errors?: Array<{ path: string; message: string }> }
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      if (init.auth) clearAdminToken();
      if (init.userAuth) clearUserToken();
      if (init.driverAuth) clearDriverToken();
    }
    throw parseApiErrorPayload(payload, response.status);
  }

  return (payload as ApiEnvelope<T>).data;
}

export type AdminIdentity = {
  id: string;
  email: string;
  role: "admin" | "staff";
};

export type DriverIdentity = {
  id: string;
  email: string;
  name: string;
  phone: string;
  vehicleLabel?: string;
  isAvailable: boolean;
  role: "driver";
};

export async function loginAdmin(email: string, password: string): Promise<AdminIdentity> {
  const result = await apiRequest<{ admin: AdminIdentity; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  clearUserToken();
  clearDriverToken();
  setAdminToken(result.token);
  return result.admin;
}

export async function bootstrapAdmin(
  email: string,
  password: string,
  bootstrapKey: string,
): Promise<AdminIdentity> {
  const result = await apiRequest<{ admin: AdminIdentity; token: string }>("/auth/bootstrap", {
    method: "POST",
    body: JSON.stringify({ email, password, bootstrapKey }),
  });
  clearUserToken();
  clearDriverToken();
  setAdminToken(result.token);
  return result.admin;
}

export function getCurrentAdmin(): Promise<AdminIdentity> {
  return apiRequest<AdminIdentity>("/auth/me", { auth: true });
}

export function getCurrentDriver(): Promise<DriverIdentity> {
  return apiRequest<DriverIdentity>("/drivers/me", { driverAuth: true });
}
