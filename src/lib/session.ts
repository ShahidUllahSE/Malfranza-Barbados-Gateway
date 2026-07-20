import {
  apiRequest,
  clearAdminToken,
  clearAllTokens,
  clearDriverToken,
  clearUserToken,
  getAdminToken,
  getCurrentAdmin,
  getCurrentDriver,
  getDriverToken,
  getUserToken,
  setAdminToken,
  setDriverToken,
  setUserToken,
  type AdminIdentity,
  type DriverIdentity,
} from "@/lib/api";
import { getCurrentUser, type UserIdentity } from "@/lib/user";

export type SessionKind = "admin" | "user" | "driver";

export type AuthSession =
  | {
      kind: "admin";
      role: "admin" | "staff";
      admin: AdminIdentity;
      user: null;
      driver: null;
    }
  | {
      kind: "driver";
      role: "driver";
      driver: DriverIdentity;
      admin: null;
      user: null;
    }
  | {
      kind: "user";
      role: "user";
      user: UserIdentity;
      admin: null;
      driver: null;
    };

type SessionLoginResponse =
  | {
      kind: "admin";
      role: "admin" | "staff";
      token: string;
      admin: AdminIdentity;
    }
  | {
      kind: "driver";
      role: "driver";
      token: string;
      driver: DriverIdentity;
    }
  | {
      kind: "user";
      role: "user";
      token: string;
      user: UserIdentity & { role?: "user" };
    };

export { clearAllTokens };

/** Store the matching token and clear the others so only one role is active. */
export function applySessionTokens(kind: SessionKind, token: string): void {
  clearAdminToken();
  clearUserToken();
  clearDriverToken();
  if (kind === "admin") setAdminToken(token);
  else if (kind === "driver") setDriverToken(token);
  else setUserToken(token);
}

export function homePathForSession(session: AuthSession): string {
  if (session.kind === "admin") return "/admin";
  if (session.kind === "driver") return "/driver";
  return "/my-bookings";
}

/**
 * Unified sign-in: backend resolves admin/staff vs driver vs guest.
 */
export async function loginSession(email: string, password: string): Promise<AuthSession> {
  const result = await apiRequest<SessionLoginResponse>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  applySessionTokens(result.kind, result.token);

  if (result.kind === "admin") {
    return {
      kind: "admin",
      role: result.role,
      admin: result.admin,
      user: null,
      driver: null,
    };
  }

  if (result.kind === "driver") {
    return {
      kind: "driver",
      role: "driver",
      driver: result.driver,
      admin: null,
      user: null,
    };
  }

  const { role: _role, ...user } = result.user;
  return {
    kind: "user",
    role: "user",
    user,
    admin: null,
    driver: null,
  };
}

/** Restore session from whichever token is present (admin → driver → user). */
export async function restoreSession(): Promise<AuthSession | null> {
  if (getAdminToken()) {
    try {
      const admin = await getCurrentAdmin();
      clearUserToken();
      clearDriverToken();
      return { kind: "admin", role: admin.role, admin, user: null, driver: null };
    } catch {
      clearAdminToken();
    }
  }

  if (getDriverToken()) {
    try {
      const driver = await getCurrentDriver();
      clearUserToken();
      clearAdminToken();
      return { kind: "driver", role: "driver", driver, admin: null, user: null };
    } catch {
      clearDriverToken();
    }
  }

  if (getUserToken()) {
    try {
      const user = await getCurrentUser();
      return { kind: "user", role: "user", user, admin: null, driver: null };
    } catch {
      clearUserToken();
    }
  }

  return null;
}
