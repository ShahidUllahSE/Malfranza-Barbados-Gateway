import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ApiError } from "@/lib/api-errors";
import {
  resendAgencySignupOtp,
  startAgencySignup,
  verifyAgencySignupOtp,
} from "@/lib/agency";
import { useUserAuth } from "@/context/UserAuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/agency_/signup")({
  head: () => ({
    meta: [
      { title: "Travel agent signup — Malfranza" },
      {
        name: "description",
        content:
          "Create a Malfranza travel agent account. Verify your email, then sign in with the same site login.",
      },
    ],
  }),
  component: AgencySignupPage,
});

type Step = "form" | "otp";

function AgencySignupPage() {
  const navigate = useNavigate();
  const { refreshSession, openAuthModal } = useUserAuth();
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [form, setForm] = useState({
    agencyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (step === "form") {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setBusy(true);
      try {
        const result = await startAgencySignup({
          agencyName: form.agencyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        });
        setStep("otp");
        toast.success(result.message);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not start signup";
        setError(message);
        toast.error(message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    try {
      await verifyAgencySignupOtp({
        email: form.email.trim(),
        code: otpCode.trim(),
      });
      await refreshSession();
      toast.success("Email verified", { description: "Your travel agent account is ready." });
      navigate({ to: "/agency" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify code";
      setError(message);
      toast.error(message);
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        setStep("form");
        setOtpCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    setBusy(true);
    try {
      const result = await resendAgencySignupOtp(form.email.trim());
      toast.success(result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resend code";
      setError(message);
      toast.error(message);
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        setStep("form");
        setOtpCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-brand-cream to-white">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:py-16">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo className="h-12 w-auto" />
        </Link>

        <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-card sm:p-8">
          <div className="mb-1 flex items-center gap-2 text-brand-green">
            <Building2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Travel agents</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-charcoal">
            {step === "otp" ? "Verify your email" : "Create a travel agent account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "otp"
              ? `Enter the 6-digit code we sent to ${form.email}.`
              : "We’ll email a verification code, then you can sign in with the same site Sign in as everyone else."}
          </p>

          {error ? (
            <div className="mt-4 rounded-lg border border-brand-orange/30 bg-brand-orange/5 px-3 py-2.5 text-sm text-brand-charcoal">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {step === "form" ? (
              <>
                <label className="block">
                  <span className="text-xs font-medium">Agency name</span>
                  <input
                    required
                    minLength={2}
                    value={form.agencyName}
                    onChange={(e) => update("agencyName", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="Your agency or company"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Contact name</span>
                  <input
                    required
                    minLength={2}
                    value={form.contactName}
                    onChange={(e) => update("contactName", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="Your full name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="you@agency.com"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Phone</span>
                  <input
                    required
                    minLength={6}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="+1 246 …"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Confirm password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="Re-enter password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Sending code…" : "Send verification code"}
                </button>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs font-medium">Verification code</span>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-center text-lg font-semibold tracking-[0.35em]"
                    placeholder="000000"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Verifying…" : "Verify & create account"}
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStep("form");
                      setOtpCode("");
                      setError(null);
                    }}
                    className="font-medium text-muted-foreground hover:text-brand-green"
                  >
                    ← Edit details
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onResend()}
                    className="font-medium text-brand-green hover:underline"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() =>
                openAuthModal({
                  mode: "signin",
                  redirectTo: "/agency",
                  reason: "Sign in with your travel agent email and password.",
                })
              }
              className="font-semibold text-brand-green hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
