import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Clock, Sparkles, ShieldCheck, Plane, Car, Users, MapPin, Compass,
  Calendar, Watch, User, ArrowRight, CheckCircle2, HeartHandshake, DollarSign,
} from "lucide-react";
import taxiHero from "@/assets/ChatGPT Image Jul 2, 2026, 10_48_48 PM.png";
import { createTaxiBooking, estimateTaxiFare, fetchTaxiFareSettings, type TaxiBookingResult, type TaxiFareSettings } from "@/lib/bookings";
import { useUserAuth } from "@/context/UserAuthContext";
import { clearAdminToken, clearDriverToken, setUserToken } from "@/lib/api";
import { toast } from "sonner";

const taxiSearchSchema = z.object({
  serviceType: z.enum(["Airport Pickup", "Airport Drop-off", "Point to Point", "Hourly / Custom"]).optional(),
  pickup: z.string().optional(),
  dropoff: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  passengers: z.coerce.number().int().min(1).max(14).optional(),
});

export const Route = createFileRoute("/taxi")({
  validateSearch: (search) => taxiSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Taxi Service — Malfranza Apartments & Taxi" },
      { name: "description", content: "Reliable Barbados taxi service — airport transfers, daily rides, group and custom trips. Book with Malfranza Taxi." },
      { property: "og:title", content: "Reliable rides across Barbados — Malfranza Taxi" },
      { property: "og:description", content: "Safe, comfortable and on-time taxi service for airport transfers, daily rides and group travel." },
      { property: "og:image", content: taxiHero },
    ],
  }),
  component: TaxiPage,
});

const SERVICE_TYPES = [
  "Airport Pickup",
  "Airport Drop-off",
  "Point to Point",
  "Hourly / Custom",
] as const;

function TaxiPage() {
  const search = Route.useSearch();
  const { user, refreshSession } = useUserAuth();
  const [form, setForm] = useState({
    serviceType: search.serviceType ?? SERVICE_TYPES[0],
    pickup: search.pickup ?? "",
    dropoff: search.dropoff ?? "",
    date: search.date ?? "",
    time: search.time ?? "",
    passengers: search.passengers ?? 1,
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<TaxiBookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fareSettings, setFareSettings] = useState<TaxiFareSettings | null>(null);
  const [estimate, setEstimate] = useState<{ fare: number; distanceKm?: number } | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTaxiFareSettings()
      .then((settings) => {
        if (!cancelled) setFareSettings(settings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setForm((current) => ({ ...current, name: "", email: "", phone: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      name: user.name,
      email: user.email,
      phone: user.phone ?? current.phone,
    }));
  }, [user]);

  // Live fare estimate when pickup, drop-off, or passengers change.
  useEffect(() => {
    const pickup = form.pickup.trim();
    const dropoff = form.dropoff.trim();
    if (pickup.length < 2 || dropoff.length < 2) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setEstimating(true);
      estimateTaxiFare({
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        passengers: form.passengers,
      })
        .then((result) => {
          if (!cancelled) {
            setEstimate({
              fare: result.estimatedFare,
              distanceKm: result.distanceKm,
            });
          }
        })
        .catch(() => {
          if (!cancelled) setEstimate(null);
        })
        .finally(() => {
          if (!cancelled) setEstimating(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.pickup, form.dropoff, form.passengers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup || !form.dropoff || !form.date || !form.time) {
      setError("Please fill in pickup, drop-off, date and time.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please add your name, email and phone so we can confirm the ride.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createTaxiBooking({
        serviceType: form.serviceType,
        pickupLocation: form.pickup,
        dropoffLocation: form.dropoff,
        pickupDate: form.date,
        pickupTime: form.time,
        passengers: form.passengers,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
      });
      if (result.token) {
        clearAdminToken();
        clearDriverToken();
        setUserToken(result.token);
        await refreshSession().catch(() => undefined);
      }
      if (result.accountCreated) {
        toast.success("Account created — check your email for a temporary password.");
      }
      setConfirmation(result);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Couldn't submit your ride request. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    const etaMins = confirmation.durationMinutes ?? 25;
    const driver = confirmation.driver;

    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream">
          <CheckCircle2 className="h-7 w-7 text-brand-green" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">
          {driver ? "Your driver is assigned" : "Ride request received"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {driver
            ? `Thanks, ${form.name} — your ride is confirmed and a driver is on the schedule.`
            : `Thanks, ${form.name} — we're matching a free driver now. Details will show in My Bookings once assigned.`}
        </p>
        <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-brand-cream px-4 py-3 sm:px-5">
          <span className="text-sm text-muted-foreground">Booking reference</span>
          <span className="break-all font-mono text-sm font-bold text-brand-green sm:text-base">
            {confirmation.bookingReference}
          </span>
        </div>

        {driver ? (
          <div className="mt-8 rounded-2xl border border-brand-sage/40 bg-brand-cream/40 p-6 text-left shadow-card">
            <h2 className="text-lg font-bold text-brand-green">Your driver & vehicle</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <SummaryItem label="Driver" value={driver.name} />
              <SummaryItem label="Phone" value={driver.phone || "—"} />
              <SummaryItem label="Vehicle" value={driver.vehicleLabel || "Malfranza taxi"} />
              <SummaryItem
                label="Approx. trip time"
                value={`~${etaMins} min`}
              />
            </dl>
            <p className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-sm text-brand-charcoal">
              Pickup is scheduled for <strong>{form.time}</strong> on <strong>{form.date}</strong>.
              Expect about <strong>~{etaMins} minutes</strong> travel time for this route.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border p-6 text-left shadow-card">
            <h2 className="text-lg font-bold text-brand-green">Matching a driver</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No free driver was available instantly. As soon as one is free, they'll be auto-assigned
              and you'll see their name and vehicle under My Bookings.
            </p>
            <p className="mt-3 text-sm text-brand-charcoal">
              Estimated trip time once underway: <strong>~{etaMins} min</strong>
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border p-6 text-left shadow-card">
          <h2 className="text-lg font-bold text-brand-green">Ride summary</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <SummaryItem label="Service" value={form.serviceType} />
            <SummaryItem label="Passengers" value={String(form.passengers)} />
            <SummaryItem label="Pickup" value={form.pickup} />
            <SummaryItem label="Drop-off" value={form.dropoff} />
            <SummaryItem label="Date" value={form.date} />
            <SummaryItem label="Time" value={form.time} />
            <SummaryItem label="Status" value={confirmation.status.replaceAll("_", " ")} />
            <SummaryItem
              label="Fare estimate"
              value={`$${Number(confirmation.estimatedFare).toFixed(0)} ${confirmation.currency}`}
            />
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-semibold text-white"
          >
            View My Bookings
          </Link>
          <button
            onClick={() => {
              setConfirmation(null);
              setForm({ ...form, pickup: "", dropoff: "", date: "", time: "" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-green px-6 py-3 font-semibold text-brand-green"
          >
            Book another ride
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-green">
              Malfranza Taxi Service
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05]">
              Reliable rides across Barbados.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              Safe, comfortable and on-time taxi service for airport transfers, daily rides,
              group travel and local errands. Wherever you're headed, we'll get you there.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <TrustPill icon={Clock} label="Punctual" />
              <TrustPill icon={Sparkles} label="Comfortable" />
              <TrustPill icon={ShieldCheck} label="Trusted" />
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-card">
            <img
              src={taxiHero}
              alt="Malfranza white passenger van with palm trees in Barbados"
              width={1280}
              height={1024}
              className="w-full h-full object-cover aspect-[5/4]"
            />
          </div>
        </div>
      </section>

      {/* BOOKING BAR */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-green p-4 sm:p-6 md:p-8 shadow-card-hover">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-brand-sage/20 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Book your ride</h2>
                <p className="text-sm text-brand-sage mt-1">
                  Fast, easy and secure. Your ride is just a few clicks away.
                </p>
              </div>
            </div>

            {!user && (
              <div className="relative mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                No account needed — fill in your details below and we’ll email you a temporary password to track your ride.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <RideField label="Service Type" icon={Car} className="lg:col-span-2">
                <select
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value as (typeof SERVICE_TYPES)[number] })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {SERVICE_TYPES.map((s) => <option key={s} className="bg-brand-green-deep text-white">{s}</option>)}
                </select>
              </RideField>
              <RideField label="Pickup Location" icon={MapPin} className="lg:col-span-2">
                <input
                  type="text"
                  value={form.pickup}
                  onChange={(e) => setForm({ ...form, pickup: e.target.value })}
                  placeholder="e.g. Grantley Adams Airport"
                  aria-label="Pickup location"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </RideField>
              <RideField label="Drop-off Location" icon={MapPin} className="lg:col-span-2">
                <input
                  type="text"
                  value={form.dropoff}
                  onChange={(e) => setForm({ ...form, dropoff: e.target.value })}
                  placeholder="e.g. Oistins, Barbados"
                  aria-label="Drop-off location"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </RideField>
              <RideField label="Date" icon={Calendar} className="lg:col-span-2">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]" />
              </RideField>
              <RideField label="Time" icon={Watch} className="lg:col-span-2">
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]" />
              </RideField>
              <RideField label="Passengers" icon={User} className="lg:col-span-2">
                <select
                  value={form.passengers}
                  onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-brand-green-deep text-white">{n} passenger{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </RideField>

              <RideField label="Your Name" icon={User} className="lg:col-span-2">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100} placeholder="Jane Doe" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
              </RideField>
              <RideField label="Email" icon={User} className="lg:col-span-2">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  readOnly={!!user}
                  maxLength={255}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40 read-only:opacity-80"
                />
              </RideField>
              <RideField label="Phone" icon={User} className="lg:col-span-2">
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40} placeholder="+1 246 000 0000" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
              </RideField>

              <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="text-sm text-white/70 font-medium">
                  {estimating ? (
                    <span>Calculating fare…</span>
                  ) : estimate ? (
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <DollarSign className="h-4 w-4 text-brand-sage" />
                      Estimated fare{" "}
                      <span className="font-bold text-white">${estimate.fare}</span>
                      {estimate.distanceKm != null && (
                        <span className="text-white/50">· ~{estimate.distanceKm} km</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-sage" /> Free cancellation up to 12 hours
                    </span>
                  )}
                </div>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-orange/20 hover:-translate-y-0.5 hover:brightness-105 transition disabled:opacity-60">
                  {submitting ? "Submitting…" : <>Book Ride Now <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>

              {error && <p className="lg:col-span-6 text-sm text-red-200">{error}</p>}
            </form>
          </div>
        </div>
      </section>

      {fareSettings && (
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-bold text-brand-green sm:text-xl">Fares by guests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Base rates set by Malfranza
              {fareSettings.perKmUsd > 0
                ? ` · plus $${fareSettings.perKmUsd}/km for your route`
                : " · flat guest pricing"}
              . Minimum fare ${fareSettings.minimumFareUsd}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "1 guest", value: fareSettings.fareFor1Guest },
                { label: "2 guests", value: fareSettings.fareFor2Guests },
                { label: "3 guests", value: fareSettings.fareFor3Guests },
                { label: "4+ guests", value: fareSettings.fareFor4PlusGuests },
              ].map((tier) => (
                <div key={tier.label} className="rounded-xl bg-brand-cream/80 px-3 py-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tier.label}
                  </div>
                  <div className="mt-1 text-xl font-bold text-brand-green">${tier.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* SERVICES GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Our taxi services</h2>
          <p className="mt-3 text-muted-foreground">
            From airport pickups to island adventures, we've got you covered.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ServiceCard icon={Plane} title="Airport Transfers" body="Reliable pickups and drop-offs to and from Grantley Adams International Airport." />
          <ServiceCard icon={Car} title="Regular Taxi Bookings" body="Daily rides around the island for business, appointments, dining and more." />
          <ServiceCard icon={Users} title="Group & Custom Trips" body="Travel together in comfort. Perfect for families, events and special occasions." />
          <ServiceCard icon={MapPin} title="Local Errands" body="Need to run errands? We'll take you to shops, markets, and local destinations." />
          <ServiceCard icon={Compass} title="Island Transport" body="Explore Barbados with ease. Tours, beach days and custom itineraries available." />
        </div>
      </section>

      {/* WHY RIDE WITH US */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Why ride with us</h2>
          <p className="mt-3 text-muted-foreground">
            Every ride is built around your comfort and peace of mind.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <WhyCard icon={ShieldCheck} title="Safe & Reliable" body="Your safety is our priority. Professional drivers and well-maintained vehicles." />
          <WhyCard icon={Clock} title="On-Time, Every Time" body="We value your time and ensure punctual pickups and drop-offs." />
          <WhyCard icon={Sparkles} title="Clean & Comfortable" body="Modern, spacious vehicles designed for a smooth and relaxing ride." />
          <WhyCard icon={HeartHandshake} title="Local & Friendly Drivers" body="Knowledgeable, courteous and always happy to help you navigate the island." />
          <WhyCard icon={DollarSign} title="Transparent Pricing" body="No hidden fees. Clear, competitive rates you can trust." />
        </div>
      </section>

      {/* BOTTOM BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 my-20">
        <div className="rounded-3xl bg-brand-cream p-5 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <BannerPoint icon={Clock} label="On-time. Every time." />
            <BannerPoint icon={Sparkles} label="Clean vehicles." />
            <BannerPoint icon={HeartHandshake} label="Local drivers." />
          </div>
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white hover:opacity-95 transition whitespace-nowrap md:w-auto"
          >
            Book Your Ride <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function TrustPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm">
      <Icon className="h-4 w-4 text-brand-green" /> {label}
    </span>
  );
}

function RideField({
  label, icon: Icon, children, className = "",
}: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 focus-within:border-brand-orange/60 transition ${className}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-sage">
        <Icon className="h-3.5 w-3.5 text-brand-orange" /> {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}


function ServiceCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <article className="group rounded-2xl border border-border bg-white p-6 shadow-card hover:shadow-[var(--shadow-card-hover)] transition">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-cream">
        <Icon className="h-5 w-5 text-brand-green" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-green">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </article>
  );
}

function WhyCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-green">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-green">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function BannerPoint({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-brand-green">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white">
        <Icon className="h-4 w-4 text-brand-green" />
      </span>
      {label}
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-brand-charcoal">{value}</dd>
    </div>
  );
}
