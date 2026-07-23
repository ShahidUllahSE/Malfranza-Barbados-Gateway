import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bootstrapAdmin, type AdminIdentity, type DriverIdentity } from "@/lib/api";
import { ApiError, validateLoginForm, validateRegisterForm } from "@/lib/api-errors";
import {
  clearAllTokens,
  loginSession,
  restoreSession,
  type AuthSession,
} from "@/lib/session";
import { toastError, toastSuccess } from "@/lib/toast";
import { registerUser, type UserIdentity } from "@/lib/user";

type AuthMode = "signin" | "signup" | "setup";

type OpenAuthOptions = {
  mode?: AuthMode;
  reason?: string;
  /** Navigate here after a successful guest sign-in / sign-up */
  redirectTo?: string;
};

type UserAuthContextValue = {
  session: AuthSession | null;
  user: UserIdentity | null;
  admin: AdminIdentity | null;
  driver: DriverIdentity | null;
  role: AuthSession["role"] | null;
  refreshSession: () => Promise<void>;
  signOut: () => void;
  openAuthModal: (modeOrOptions?: AuthMode | OpenAuthOptions) => void;
  closeAuthModal: () => void;
};

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const authSearch = useRouterState({
    select: (s) => {
      const search = s.location.search as {
        auth?: "signin" | "signup" | "setup";
        redirect?: string;
      };
      return {
        auth: search.auth,
        redirect: search.redirect,
        pathname: s.location.pathname,
      };
    },
  });

  const [session, setSession] = useState<AuthSession | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  // Bumped on sign-out so an in-flight restoreSession cannot put the user back.
  const sessionEpochRef = useRef(0);

  const refreshSession = useCallback(async () => {
    const epoch = sessionEpochRef.current;
    const next = await restoreSession();
    if (epoch !== sessionEpochRef.current) return;
    setSession(next);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const openAuthModal = useCallback((modeOrOptions: AuthMode | OpenAuthOptions = "signin") => {
    const options = typeof modeOrOptions === "string"
      ? { mode: modeOrOptions }
      : modeOrOptions;
    setMode(options.mode ?? "signin");
    setAuthReason(options.reason ?? null);
    setRedirectTo(options.redirectTo ?? null);
    clearErrors();
    setOpen(true);
  }, [clearErrors]);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    setPassword("");
    setBootstrapKey("");
    setAuthReason(null);
    setRedirectTo(null);
    clearErrors();
  }, [clearErrors]);

  const switchMode = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    clearErrors();
  }, [clearErrors]);

  const signOut = useCallback(() => {
    sessionEpochRef.current += 1;
    clearAllTokens();
    setSession(null);
  }, []);

  const navigateToRedirect = useCallback(
    (path: string) => {
      if (!path.startsWith("/")) return;
      const url = new URL(path, window.location.origin);
      const search = Object.fromEntries(url.searchParams.entries());
      if (search.guests != null && search.guests !== "") {
        const n = Number(search.guests);
        if (!Number.isNaN(n)) search.guests = String(n);
      }
      navigate({
        to: url.pathname,
        search: Object.keys(search).length > 0 ? search : undefined,
      } as never);
    },
    [navigate],
  );

  // Open modal from ?auth= on homepage (used by /auth redirect + admin guard).
  useEffect(() => {
    if (!authSearch.auth) return;
    openAuthModal({
      mode: authSearch.auth === "setup" ? "setup" : authSearch.auth,
      redirectTo:
        authSearch.redirect && authSearch.redirect.startsWith("/")
          ? authSearch.redirect
          : undefined,
      reason:
        authSearch.redirect === "/admin"
          ? "Sign in with your staff account to open the admin dashboard."
          : undefined,
    });
    navigate({
      to: "/",
      search: {},
      replace: true,
    });
  }, [authSearch.auth, authSearch.redirect, navigate, openAuthModal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    if (mode === "signin" || mode === "setup") {
      const clientErrors = validateLoginForm({ email, password });
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        toastError("Please fix the highlighted fields.");
        return;
      }
    } else {
      const clientErrors = validateRegisterForm({ name, email, password, phone });
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        toastError("Please fix the highlighted fields.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "setup") {
        const admin = await bootstrapAdmin(email.trim(), password, bootstrapKey);
        setSession({ kind: "admin", role: admin.role, admin, user: null, driver: null });
        closeAuthModal();
        toastSuccess("Primary admin created", "Opening admin dashboard.");
        navigate({ to: "/admin" });
        return;
      }

      if (mode === "signup") {
        const identity = await registerUser({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
        const nextPath = redirectTo;
        setSession({ kind: "user", role: "user", user: identity, admin: null, driver: null });
        closeAuthModal();
        toastSuccess("Account created", "You're signed in.");
        if (nextPath) navigateToRedirect(nextPath);
        return;
      }

      const next = await loginSession(email.trim(), password);
      const guestRedirect = redirectTo;
      setSession(next);
      closeAuthModal();
      toastSuccess(
        "Welcome back",
        next.kind === "admin"
          ? "Opening admin dashboard."
          : next.kind === "driver"
            ? "Opening driver portal."
            : "You're signed in.",
      );

      if (next.kind === "admin") {
        navigate({ to: "/admin" });
        return;
      }
      if (next.kind === "driver") {
        navigate({ to: "/driver" });
        return;
      }

      if (guestRedirect && guestRedirect !== "/admin" && guestRedirect !== "/driver") {
        navigateToRedirect(guestRedirect);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setFormError(err.message);
        toastError(err.message);
        if (err.status === 409) switchMode("signin");
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setFormError(message);
        toastError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.kind === "user" ? session.user : null,
      admin: session?.kind === "admin" ? session.admin : null,
      driver: session?.kind === "driver" ? session.driver : null,
      role: session?.role ?? null,
      refreshSession,
      signOut,
      openAuthModal,
      closeAuthModal,
    }),
    [session, refreshSession, signOut, openAuthModal, closeAuthModal],
  );

  const title =
    mode === "setup" ? "Create admin account" : mode === "signup" ? "Create account" : "Sign in";

  const description =
    authReason
    ?? (mode === "setup"
      ? "One-time setup for the primary admin account."
      : mode === "signup"
        ? "Create a guest account to book and manage your Malfranza bookings."
        : null);

  return (
    <UserAuthContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAuthModal())}>
        <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden sm:max-h-[min(90dvh,720px)]">
          <div className="p-6 sm:p-8">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-display font-bold text-brand-charcoal">
                {title}
              </DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>

            {formError && (
              <div className="mt-4 rounded-lg border border-brand-orange/30 bg-brand-orange/5 px-3 py-2.5 text-sm text-brand-charcoal">
                {formError}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <AuthField label="Full name" error={fieldErrors.name}>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      className={inputClass(!!fieldErrors.name)}
                      placeholder="Your name"
                    />
                  </AuthField>
                  <AuthField label="Phone (optional)" error={fieldErrors.phone}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      className={inputClass(!!fieldErrors.phone)}
                      placeholder="+1 246 000 0000"
                    />
                  </AuthField>
                </>
              )}
              <AuthField label="Email" error={fieldErrors.email}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={inputClass(!!fieldErrors.email)}
                  placeholder="you@example.com"
                />
              </AuthField>
              {mode === "setup" && (
                <AuthField label="Bootstrap key" error={fieldErrors.bootstrapKey}>
                  <input
                    type="password"
                    required
                    value={bootstrapKey}
                    onChange={(e) => setBootstrapKey(e.target.value)}
                    className={inputClass(!!fieldErrors.bootstrapKey)}
                    placeholder="One-time key from backend .env"
                  />
                </AuthField>
              )}
              <AuthField label="Password" error={fieldErrors.password}>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={inputClass(!!fieldErrors.password)}
                  placeholder="At least 8 characters"
                />
              </AuthField>
              <button
                type="submit"
                disabled={busy}
                className="w-full cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Please wait…"
                  : mode === "setup"
                    ? "Create admin"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  New guest?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="cursor-pointer font-semibold text-brand-green hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="cursor-pointer font-semibold text-brand-green hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </UserAuthContext.Provider>
  );
}

function inputClass(hasError: boolean) {
  return [
    "mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition",
    hasError
      ? "border-brand-orange focus:ring-2 focus:ring-brand-orange/25"
      : "border-input focus:ring-2 focus:ring-brand-green/25",
  ].join(" ");
}

function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-brand-charcoal">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-brand-orange">{error}</p> : null}
    </div>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}
