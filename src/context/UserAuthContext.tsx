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
import { ApiError, validateLoginForm, validateRegisterForm, validateAgencyRegisterForm } from "@/lib/api-errors";
import {
  clearAllTokens,
  loginSession,
  restoreSession,
  type AuthSession,
} from "@/lib/session";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  confirmPasswordReset,
  requestPasswordReset,
  resendSignupOtp,
  startSignup,
  verifySignupOtp,
  type UserIdentity,
} from "@/lib/user";
import {
  resendAgencySignupOtp,
  startAgencySignup,
  verifyAgencySignupOtp,
} from "@/lib/agency";

type AuthMode = "signin" | "signup" | "agency-signup" | "setup" | "forgot" | "reset";
type SignupStep = "form" | "otp";

type OpenAuthOptions = {
  mode?: AuthMode;
  reason?: string;
  /** Navigate here after a successful guest sign-in / sign-up */
  redirectTo?: string;
  /** Password reset token from email link */
  resetToken?: string;
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
        auth?: "signin" | "signup" | "setup" | "forgot" | "reset" | "agency-signup";
        redirect?: string;
        token?: string;
      };
      return {
        auth: search.auth,
        redirect: search.redirect,
        token: search.token,
        pathname: s.location.pathname,
      };
    },
  });

  const [session, setSession] = useState<AuthSession | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
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
    setSignupStep("form");
    setOtpCode("");
    setAuthReason(options.reason ?? null);
    setRedirectTo(options.redirectTo ?? null);
    setResetToken(options.resetToken ?? "");
    setConfirmPassword("");
    if (options.mode === "agency-signup") {
      setAgencyName("");
    }
    clearErrors();
    setOpen(true);
  }, [clearErrors]);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    setPassword("");
    setConfirmPassword("");
    setResetToken("");
    setOtpCode("");
    setSignupStep("form");
    setBootstrapKey("");
    setAgencyName("");
    setAuthReason(null);
    setRedirectTo(null);
    clearErrors();
  }, [clearErrors]);

  const switchMode = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setSignupStep("form");
    setOtpCode("");
    setPassword("");
    setConfirmPassword("");
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
      resetToken: authSearch.token,
      reason:
        authSearch.redirect === "/admin"
          ? "Sign in with your admin account to open the admin dashboard."
          : authSearch.auth === "reset"
            ? "Choose a new password for your Malfranza account."
            : authSearch.auth === "agency-signup"
              ? "Create a travel agent account — we’ll email a code to verify your address."
              : undefined,
    });
    navigate({
      to: "/",
      search: {},
      replace: true,
    });
  }, [authSearch.auth, authSearch.redirect, authSearch.token, navigate, openAuthModal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    if (mode === "forgot") {
      if (!email.trim()) {
        setFieldErrors({ email: "Enter your email" });
        toastError("Enter the email for your account.");
        return;
      }
    } else if (mode === "reset") {
      if (!resetToken) {
        setFormError("This reset link is missing or invalid. Request a new password reset.");
        toastError("Invalid reset link.");
        return;
      }
      if (password.length < 8) {
        setFieldErrors({ password: "At least 8 characters" });
        toastError("Choose a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setFieldErrors({ confirmPassword: "Passwords do not match" });
        toastError("Passwords do not match.");
        return;
      }
    } else if (mode === "signin" || mode === "setup") {
      const clientErrors = validateLoginForm({ email, password });
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        toastError("Please fix the highlighted fields.");
        return;
      }
    } else if (mode === "signup" && signupStep === "form") {
      const clientErrors = validateRegisterForm({ name, email, password, phone });
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        toastError("Please fix the highlighted fields.");
        return;
      }
    } else if (mode === "agency-signup" && signupStep === "form") {
      const clientErrors = validateAgencyRegisterForm({
        agencyName,
        contactName: name,
        email,
        password,
        phone,
      });
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        toastError("Please fix the highlighted fields.");
        return;
      }
    } else if ((mode === "signup" || mode === "agency-signup") && signupStep === "otp") {
      if (!/^\d{6}$/.test(otpCode.trim())) {
        setFieldErrors({ code: "Enter the 6-digit code from your email" });
        toastError("Enter the 6-digit verification code.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "forgot") {
        const result = await requestPasswordReset(email.trim());
        toastSuccess("Check your email", result.message || "If that email is registered, a reset link is on its way.");
        switchMode("signin");
        return;
      }

      if (mode === "reset") {
        await confirmPasswordReset({ token: resetToken, password });
        toastSuccess("Password updated", "You can sign in with your new password.");
        setResetToken("");
        switchMode("signin");
        return;
      }

      if (mode === "setup") {
        const admin = await bootstrapAdmin(email.trim(), password, bootstrapKey);
        setSession({
          kind: "admin",
          role: admin.role,
          admin,
          user: null,
          driver: null,
          agency: null,
        });
        closeAuthModal();
        toastSuccess("Primary admin created", "Opening admin dashboard.");
        navigate({ to: "/admin" });
        return;
      }

      if (mode === "signup" && signupStep === "form") {
        const result = await startSignup({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
        setSignupStep("otp");
        toastSuccess("Check your email", result.message);
        return;
      }

      if (mode === "agency-signup" && signupStep === "form") {
        const result = await startAgencySignup({
          agencyName: agencyName.trim(),
          contactName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
        setSignupStep("otp");
        toastSuccess("Check your email", result.message);
        return;
      }

      if (mode === "signup" && signupStep === "otp") {
        const identity = await verifySignupOtp({
          email: email.trim(),
          code: otpCode.trim(),
        });
        const nextPath = redirectTo;
        setSession({
          kind: "user",
          role: "user",
          user: identity,
          admin: null,
          driver: null,
          agency: null,
        });
        closeAuthModal();
        toastSuccess("Account verified", "You're signed in.");
        if (nextPath) navigateToRedirect(nextPath);
        return;
      }

      if (mode === "agency-signup" && signupStep === "otp") {
        const result = await verifyAgencySignupOtp({
          email: email.trim(),
          code: otpCode.trim(),
        });
        setSession({
          kind: "agency",
          role: "agency",
          agency: result.agency,
          admin: null,
          user: null,
          driver: null,
        });
        closeAuthModal();
        toastSuccess("Account verified", "Opening your travel agent portal.");
        navigate({ to: "/agency" });
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
            : next.kind === "agency"
              ? "Opening travel agency portal."
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
      if (next.kind === "agency") {
        navigate({ to: "/agency" });
        return;
      }

      if (
        guestRedirect &&
        guestRedirect !== "/admin" &&
        guestRedirect !== "/driver" &&
        guestRedirect !== "/agency"
      ) {
        navigateToRedirect(guestRedirect);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setFormError(err.message);
        toastError(err.message);
        if (err.status === 409) switchMode("signin");
        if (err.status === 410 || err.status === 404) {
          setSignupStep("form");
          setOtpCode("");
        }
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setFormError(message);
        toastError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onResendOtp() {
    clearErrors();
    setBusy(true);
    try {
      const result =
        mode === "agency-signup"
          ? await resendAgencySignupOtp(email.trim())
          : await resendSignupOtp(email.trim());
      toastSuccess("Code resent", result.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        toastError(err.message);
        if (err.status === 410 || err.status === 404) {
          setSignupStep("form");
          setOtpCode("");
        }
      } else {
        const message = err instanceof Error ? err.message : "Could not resend code";
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
    mode === "setup"
      ? "Create admin account"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : (mode === "signup" || mode === "agency-signup") && signupStep === "otp"
            ? "Verify your email"
            : mode === "agency-signup"
              ? "Create travel agent account"
              : mode === "signup"
                ? "Create account"
                : "Sign in";

  const description =
    authReason
    ?? (mode === "setup"
      ? "One-time setup for the primary admin account."
      : mode === "forgot"
        ? "We'll email a link to reset your password if that address is registered."
        : mode === "reset"
          ? "Enter a new password for your account."
          : (mode === "signup" || mode === "agency-signup") && signupStep === "otp"
            ? `Enter the 6-digit code we sent to ${email.trim() || "your email"}.`
            : mode === "agency-signup"
              ? "Create a travel agent account — we’ll email a code to verify your address."
              : mode === "signup"
                ? "Create a guest account — we’ll email a code to verify your address."
                : null);

  return (
    <UserAuthContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAuthModal())}>
        <DialogContent className="max-w-md overflow-y-auto rounded-2xl border-border p-0 sm:max-h-[min(90dvh,720px)]">
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
              {mode === "forgot" ? (
                <>
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
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Sending…" : "Email reset link"}
                  </button>
                </>
              ) : mode === "reset" ? (
                <>
                  <AuthField label="New password" error={fieldErrors.password}>
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
                  <AuthField label="Confirm password" error={fieldErrors.confirmPassword}>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword)
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                      }}
                      className={inputClass(!!fieldErrors.confirmPassword)}
                      placeholder="Re-enter password"
                    />
                  </AuthField>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Update password"}
                  </button>
                </>
              ) : (mode === "signup" || mode === "agency-signup") && signupStep === "otp" ? (
                <>
                  <AuthField label="Verification code" error={fieldErrors.code}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: "" }));
                      }}
                      className={`${inputClass(!!fieldErrors.code)} tracking-[0.35em] text-center text-lg font-semibold`}
                      placeholder="000000"
                    />
                  </AuthField>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Verifying…" : "Verify & create account"}
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setSignupStep("form");
                        setOtpCode("");
                        clearErrors();
                      }}
                      className="cursor-pointer font-medium text-muted-foreground hover:text-brand-green"
                    >
                      ← Edit details
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onResendOtp()}
                      className="cursor-pointer font-semibold text-brand-green hover:underline disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {mode === "agency-signup" && (
                    <>
                      <AuthField label="Agency name" error={fieldErrors.agencyName}>
                        <input
                          type="text"
                          required
                          value={agencyName}
                          onChange={(e) => {
                            setAgencyName(e.target.value);
                            if (fieldErrors.agencyName) setFieldErrors((prev) => ({ ...prev, agencyName: "" }));
                          }}
                          className={inputClass(!!fieldErrors.agencyName)}
                          placeholder="Your agency or company"
                        />
                      </AuthField>
                      <AuthField label="Contact name" error={fieldErrors.contactName}>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (fieldErrors.contactName) setFieldErrors((prev) => ({ ...prev, contactName: "" }));
                          }}
                          className={inputClass(!!fieldErrors.contactName)}
                          placeholder="Your full name"
                        />
                      </AuthField>
                      <AuthField label="Phone" error={fieldErrors.phone}>
                        <input
                          type="tel"
                          required
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
                  {mode === "signin" && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="cursor-pointer text-xs font-semibold text-brand-green hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy
                      ? "Please wait…"
                      : mode === "setup"
                        ? "Create admin"
                        : mode === "signup" || mode === "agency-signup"
                          ? "Continue"
                          : "Sign in"}
                  </button>
                </>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  <p>
                    New guest?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="cursor-pointer font-semibold text-brand-green hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                  <p className="mt-2">
                    Travel agent?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("agency-signup")}
                      className="cursor-pointer font-semibold text-brand-green hover:underline"
                    >
                      Create an agency account
                    </button>
                  </p>
                </>
              ) : mode === "forgot" || mode === "reset" ? (
                <>
                  Remembered it?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="cursor-pointer font-semibold text-brand-green hover:underline"
                  >
                    Sign in
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
