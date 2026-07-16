import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock, Sparkles, ShieldCheck, Plane, Car, Users, MapPin, Compass,
  Calendar, Watch, User, ArrowRight, CheckCircle2, HeartHandshake, DollarSign,
} from "lucide-react";
import taxiHero from "@/assets/ChatGPT Image Jul 2, 2026, 10_48_48 PM.png";
import { createTaxiBooking } from "@/lib/bookings";
import { PlacesAutocompleteInput } from "@/components/maps/PlacesAutocompleteInput";


export const Route = createFileRoute("/taxi")({
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
];

function TaxiPage() {
  const [form, setForm] = useState({
    serviceType: SERVICE_TYPES[0],
    pickup: "",
    dropoff: "",
    date: "",
    time: "",
    passengers: 1,
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const ref = await createTaxiBooking({
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
      setReference(ref);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Couldn't submit your ride request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream">
          <CheckCircle2 className="h-7 w-7 text-brand-green" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Ride request received</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks, {form.name} — we'll confirm your {form.serviceType.toLowerCase()} at {form.email} shortly.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-cream px-5 py-3">
          <span className="text-sm text-muted-foreground">Booking reference</span>
          <span className="font-mono font-bold text-brand-green">{reference}</span>
        </div>
        <div className="mt-8 rounded-2xl border border-border p-6 text-left shadow-card">
          <h2 className="text-lg font-bold text-brand-green">Ride summary</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <SummaryItem label="Service" value={form.serviceType} />
            <SummaryItem label="Passengers" value={String(form.passengers)} />
            <SummaryItem label="Pickup" value={form.pickup} />
            <SummaryItem label="Drop-off" value={form.dropoff} />
            <SummaryItem label="Date" value={form.date} />
            <SummaryItem label="Time" value={form.time} />
          </dl>
        </div>
        <button
          onClick={() => { setReference(null); setForm({ ...form, pickup: "", dropoff: "", date: "", time: "" }); }}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-white font-semibold"
        >
          Book another ride
        </button>
      </div>
    );
  }


  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-10 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-green">
              Malfranza Taxi Service
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-[1.05]">
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
      <section className="mx-auto max-w-7xl px-6 mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-green p-6 md:p-8 shadow-card-hover">
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

            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <RideField label="Service Type" icon={Car} className="lg:col-span-2">
                <select
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {SERVICE_TYPES.map((s) => <option key={s} className="bg-brand-green-deep text-white">{s}</option>)}
                </select>
              </RideField>
              <RideField label="Pickup Location" icon={MapPin} className="lg:col-span-2">
                <PlacesAutocompleteInput
                  value={form.pickup}
                  onChange={(v) => setForm({ ...form, pickup: v })}
                  placeholder="e.g. Grantley Adams Airport"
                  ariaLabel="Pickup location"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </RideField>
              <RideField label="Drop-off Location" icon={MapPin} className="lg:col-span-2">
                <PlacesAutocompleteInput
                  value={form.dropoff}
                  onChange={(v) => setForm({ ...form, dropoff: v })}
                  placeholder="e.g. Oistins"
                  ariaLabel="Drop-off location"
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
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255} placeholder="you@example.com" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
              </RideField>
              <RideField label="Phone" icon={User} className="lg:col-span-2">
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40} placeholder="+1 246 000 0000" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
              </RideField>

              <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-sm text-white/70 font-medium inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-sage" /> Free cancellation up to 12 hours
                </p>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-orange/20 hover:-translate-y-0.5 hover:brightness-105 transition disabled:opacity-60">
                  {submitting ? "Submitting…" : <>Book Ride Now <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>

              {error && <p className="lg:col-span-6 text-sm text-red-200">{error}</p>}
            </form>
          </div>
        </div>
      </section>


      {/* SERVICES GRID */}
      <section className="mx-auto max-w-7xl px-6 mt-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">Our taxi services</h2>
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
      <section className="mx-auto max-w-7xl px-6 mt-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">Why ride with us</h2>
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
      <section className="mx-auto max-w-7xl px-6 my-20">
        <div className="rounded-3xl bg-brand-cream p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <BannerPoint icon={Clock} label="On-time. Every time." />
            <BannerPoint icon={Sparkles} label="Clean vehicles." />
            <BannerPoint icon={HeartHandshake} label="Local drivers." />
          </div>
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white hover:opacity-95 transition whitespace-nowrap"
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
