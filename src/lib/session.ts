import {
  apiRequest,
  clearAdminToken,
  clearAllTokens,
  clearAgencyToken,
  clearDriverToken,
  clearUserToken,
  getAdminToken,
  getAgencyToken,
  getCurrentAdmin,
  getCurrentAgency,
  getCurrentDriver,
  getDriverToken,
  getUserToken,
  setAdminToken,
  setAgencyToken,
  setDriverToken,
  setUserToken,
  type AdminIdentity,
  type AgencyIdentity,
  type DriverIdentity,
} from "@/lib/api";
import { getCurrentUser, type UserIdentity } from "@/lib/user";

export type SessionKind = "admin" | "user" | "driver" | "agency";

export type AuthSession =
  | {
      kind: "admin";
      role: "admin" | "staff";
      admin: AdminIdentity;
      user: null;
      driver: null;
      agency: null;
    }
  | {
      kind: "driver";
      role: "driver";
      driver: DriverIdentity;
      admin: null;
      user: null;
      agency: null;
    }
  | {
      kind: "agency";
      role: "agency";
      agency: AgencyIdentity;
      admin: null;
      user: null;
      driver: null;
    }
  | {
      kind: "user";
      role: "user";
      user: UserIdentity;
      admin: null;
      driver: null;
      agency: null;
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
      kind: "agency";
      role: "agency";
      token: string;
      agency: AgencyIdentity;
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
  clearAgencyToken();
  if (kind === "admin") setAdminToken(token);
  else if (kind === "driver") setDriverToken(token);
  else if (kind === "agency") setAgencyToken(token);
  else setUserToken(token);
}

export function homePathForSession(session: AuthSession): string {
  if (session.kind === "admin") return "/admin";
  if (session.kind === "driver") return "/driver";
  if (session.kind === "agency") return "/agency";
  return "/my-bookings";
}

/**
 * Unified sign-in: backend resolves admin/staff vs driver vs agency vs guest.
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
      agency: null,
    };
  }

  if (result.kind === "driver") {
    return {
      kind: "driver",
      role: "driver",
      driver: result.driver,
      admin: null,
      user: null,
      agency: null,
    };
  }

  if (result.kind === "agency") {
    return {
      kind: "agency",
      role: "agency",
      agency: result.agency,
      admin: null,
      user: null,
      driver: null,
    };
  }

  const { role: _role, ...user } = result.user;
  return {
    kind: "user",
    role: "user",
    user,
    admin: null,
    driver: null,
    agency: null,
  };
}

/** Restore session from whichever token is present. */
export async function restoreSession(): Promise<AuthSession | null> {
  if (getAdminToken()) {
    try {
      const admin = await getCurrentAdmin();
      clearUserToken();
      clearDriverToken();
      clearAgencyToken();
      return {
        kind: "admin",
        role: admin.role,
        admin,
        user: null,
        driver: null,
        agency: null,
      };
    } catch {
      clearAdminToken();
    }
  }

  if (getDriverToken()) {
    try {
      const driver = await getCurrentDriver();
      clearUserToken();
      clearAdminToken();
      clearAgencyToken();
      return {
        kind: "driver",
        role: "driver",
        driver,
        admin: null,
        user: null,
        agency: null,
      };
    } catch {
      clearDriverToken();
    }
  }

  if (getAgencyToken()) {
    try {
      const agency = await getCurrentAgency();
      clearUserToken();
      clearAdminToken();
      clearDriverToken();
      return {
        kind: "agency",
        role: "agency",
        agency,
        admin: null,
        user: null,
        driver: null,
      };
    } catch {
      clearAgencyToken();
    }
  }

  if (getUserToken()) {
    try {
      const user = await getCurrentUser();
      return {
        kind: "user",
        role: "user",
        user,
        admin: null,
        driver: null,
        agency: null,
      };
    } catch {
      clearUserToken();
    }
  }

  return null;
}
