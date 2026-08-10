import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";
import { Building2, CheckCircle2 } from "lucide-react";
import { registerTravelAgency } from "@/lib/agency";
import { useUserAuth } from "@/context/UserAuthContext";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/agency_/signup")({
  head: () => ({
    meta: [
      { title: "Sign up as a travel agent — Malfranza" },
      {
        name: "description",
        content:
          "Register your travel agency with Malfranza. Get an automatic booking code and earn 10% commission on guest stays.",
      },
    ],
  }),
  component: AgencySignupPage,
});

function AgencySignupPage() {
  const navigate = useNavigate();
  const { refreshSession } = useUserAuth();
  const [agencyName, setAgencyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toastError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toastError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const result = await registerTravelAgency({
        agencyName: agencyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      setCreatedCode(result.agency.agencyCode);
      await refreshSession().catch(() => undefined);
      toastSuccess("Agency registered", "Your unique booking code is ready.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream via-white to-brand-sage/10">
      <header className="border-b border-brand-sage/20 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/">
            <Logo className="h-10 w-auto" />
          </Link>
          <Link
            to="/agency"
            className="text-sm font-semibold text-brand-green hover:underline"
          >
            Agency login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
              <Building2 className="h-3.5 w-3.5" />
              Travel partners
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold text-brand-charcoal sm:text-4xl">
              Sign up as a travel agent
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Onboard your agency, receive an auto-generated booking code, and earn{" "}
              <span className="font-semibold text-brand-green">10% commission</span> on
              stays you book for guests.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-brand-charcoal">
              {[
                "Unique agency booking code — never assigned by hand",
                "Use your code on every guest booking",
                "Portal to track stays and commission owed",
                "Gregory sees your code on each booking in admin",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-card sm:p-7">
            {createdCode ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-brand-green" />
                <h2 className="font-display text-xl font-bold text-brand-charcoal">
                  You're registered
                </h2>
                <p className="text-sm text-muted-foreground">
                  Save this code. Add it when booking on behalf of a guest.
                </p>
                <div className="rounded-xl border-2 border-dashed border-brand-green/40 bg-brand-cream/50 px-4 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your agency code
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-brand-green">
                    {createdCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/agency" })}
                  className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Open agency portal
                </button>
                <Link to="/book" className="inline-block text-sm font-semibold text-brand-orange hover:underline">
                  Book a stay with this code
                </Link>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={onSubmit}>
                <h2 className="font-display text-lg font-bold text-brand-charcoal">
                  Agency details
                </h2>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Agency name</span>
                  <input
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="Island Dreams Travel"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Contact name</span>
                  <input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="Alex Rivera"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Work email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="bookings@agency.com"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Phone</span>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    placeholder="+1 246 000 0000"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    autoComplete="new-password"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-brand-charcoal">Confirm password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                    autoComplete="new-password"
                  />
                </label>
                <p className="pt-1 text-xs text-muted-foreground">
                  Your unique booking code is generated automatically after you register. Commission
                  is 10% of the stay (room nights only).
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Creating account…" : "Create agency account"}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Already registered?{" "}
                  <Link to="/agency" className="font-semibold text-brand-green hover:underline">
                    Log in to your portal
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
