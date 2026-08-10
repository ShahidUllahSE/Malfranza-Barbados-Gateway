import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  LogOut,
  Percent,
  ClipboardList,
  Copy,
  ExternalLink,
} from "lucide-react";
import { getCurrentAgency, type AgencyIdentity } from "@/lib/api";
import {
  getMyAgencyCommission,
  listMyAgencyBookings,
  loginTravelAgency,
  confirmAgencyPasswordReset,
  requestAgencyPasswordReset,
} from "@/lib/agency";
import { StatusPill, AdminEmptyState } from "@/components/admin/AdminBits";
import { Logo } from "@/components/Logo";
import { useUserAuth } from "@/context/UserAuthContext";
import { z } from "zod";

export const Route = createFileRoute("/agency")({
  validateSearch: (search) =>
    z
      .object({
        reset: z.string().optional(),
      })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Travel agency portal — Malfranza" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgencyPortalPage,
});

function money(n: number) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AgencyPortalPage() {
  const navigate = useNavigate();
  const { reset } = Route.useSearch();
  const { signOut: clearAuthSession, refreshSession } = useUserAuth();
  const [agency, setAgency] = useState<AgencyIdentity | null>(null);
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "reset">(
    reset ? "reset" : "login",
  );

  useEffect(() => {
    if (reset) setMode("reset");
  }, [reset]);

  useEffect(() => {
    getCurrentAgency()
      .then((a) => {
        setAgency(a);
        setStatus("ok");
      })
      .catch(() => setStatus("denied"));
  }, []);

  const bookingsQ = useQuery({
    queryKey: ["agency", "bookings"],
    queryFn: listMyAgencyBookings,
    enabled: status === "ok",
  });

  const commissionQ = useQuery({
    queryKey: ["agency", "commission"],
    queryFn: getMyAgencyCommission,
    enabled: status === "ok",
  });

  const commissionsEarned = useMemo(() => {
    return money(commissionQ.data?.commissionOwed ?? 0);
  }, [commissionQ.data]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const result = await requestAgencyPasswordReset(email.trim());
        toast.success(result.message || "If that email is registered, a reset link was sent.");
        setMode("login");
        return;
      }
      if (mode === "reset") {
        if (!reset) {
          toast.error("This reset link is invalid. Request a new one.");
          return;
        }
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        await confirmAgencyPasswordReset({ token: reset, password });
        toast.success("Password updated — sign in with your new password");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        navigate({ to: "/agency", search: {}, replace: true });
        return;
      }

      const result = await loginTravelAgency(email.trim(), password);
      setAgency(result.agency);
      setStatus("ok");
      await refreshSession().catch(() => undefined);
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearAuthSession();
    setAgency(null);
    setStatus("denied");
    navigate({ to: "/agency" });
  }

  function copyCode() {
    if (!agency?.agencyCode) return;
    void navigator.clipboard.writeText(agency.agencyCode);
    toast.success("Agency code copied");
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="mfz-shimmer h-10 w-48 rounded-lg" />
      </div>
    );
  }

  if (status === "denied" || !agency) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
          <Link to="/" className="mb-8 self-center">
            <Logo className="h-12 w-auto" />
          </Link>
          <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-1 flex items-center gap-2 text-brand-green">
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Agency portal</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-brand-charcoal">
              {mode === "forgot"
                ? "Reset agency password"
                : mode === "reset"
                  ? "Choose a new password"
                  : "Travel agent login"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "forgot"
                ? "We’ll email a reset link if that address is registered."
                : mode === "reset"
                  ? "Set a new password for your agency account."
                  : "View bookings and commission for your agency code only."}
            </p>
            <form className="mt-6 space-y-3" onSubmit={onLogin}>
              {(mode === "login" || mode === "forgot") && (
                <label className="block">
                  <span className="text-xs font-medium">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                  />
                </label>
              )}
              {(mode === "login" || mode === "reset") && (
                <label className="block">
                  <span className="text-xs font-medium">
                    {mode === "reset" ? "New password" : "Password"}
                  </span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                  />
                </label>
              )}
              {mode === "reset" && (
                <label className="block">
                  <span className="text-xs font-medium">Confirm password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input px-3 py-2.5 text-sm"
                  />
                </label>
              )}
              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs font-semibold text-brand-green hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy
                  ? "Please wait…"
                  : mode === "forgot"
                    ? "Email reset link"
                    : mode === "reset"
                      ? "Update password"
                      : "Sign in"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mode !== "login" ? (
                <>
                  Back to{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-semibold text-brand-green hover:underline"
                  >
                    sign in
                  </button>
                </>
              ) : (
                <>
                  New partner?{" "}
                  <Link to="/agency/signup" className="font-semibold text-brand-green hover:underline">
                    Sign up as a travel agent
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bookings = bookingsQ.data ?? [];
  const summary = commissionQ.data;

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-sage/20 bg-brand-green text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <div>
              <p className="text-xs text-white/70">Travel agency portal</p>
              <p className="font-display text-lg font-bold leading-tight">{agency.agencyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border border-border/70 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your booking code
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-brand-green">
                {agency.agencyCode}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter this code when booking for a guest. Auto-generated — never reassign manually.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-cream"
              >
                <Copy className="h-4 w-4" />
                Copy code
              </button>
              <Link
                to="/book"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Book for guest
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi
            icon={ClipboardList}
            label="Attributed bookings"
            value={String(summary?.bookings ?? bookings.length)}
            hint="Non-cancelled stays"
          />
          <Kpi
            icon={Percent}
            label="Commission rate"
            value={`${Math.round((agency.commissionRate || 0.1) * 100)}%`}
            hint="Of stay subtotal"
          />
          <Kpi
            icon={Building2}
            label="Commission earned"
            value={commissionsEarned}
            hint={`Stay revenue ${money(summary?.stayRevenue ?? 0)}`}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-card">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="font-display text-lg font-bold text-brand-charcoal">Your bookings</h2>
            <p className="text-xs text-muted-foreground">
              Only bookings that used code {agency.agencyCode}.
            </p>
          </div>

          {bookingsQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="mfz-shimmer h-14 rounded-lg" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <AdminEmptyState message="No agency bookings yet. Use your code on the booking form." />
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-green">
                        {b.bookingReference}
                      </span>
                      <StatusPill status={b.status} />
                      <StatusPill status={b.paymentStatus} />
                    </div>
                    <p className="mt-1 truncate font-semibold text-brand-charcoal">{b.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.apartmentName}
                      {b.unitName ? ` · ${b.unitName}` : ""} · {b.checkIn} → {b.checkOut}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-sm font-bold text-brand-charcoal">{money(b.staySubtotal)} stay</p>
                    <p className="text-xs font-semibold text-brand-orange">
                      Commission {money(b.commissionAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-sage/20 text-brand-green">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-display text-xl font-bold text-brand-charcoal">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
