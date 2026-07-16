import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin, Users, BedDouble, Bath, Ruler, Shield, ChevronRight,
  Wind, Wifi, Tv, ChefHat, Refrigerator, Microwave, Flame, Coffee,
  ShowerHead, Droplets, Sparkles, Shirt, Wind as HairDryerIcon,
  BellRing, Car, Brush, Headphones, Images,
  BadgeCheck, HeartHandshake, CalendarCheck,
} from "lucide-react";
import { getApartment, APARTMENTS } from "@/data/apartments";
import { checkApartmentAvailability, getApartmentIdBySlug } from "@/lib/bookings";
import { AreaMap } from "@/components/maps/AreaMap";
import { OISTINS_CENTER } from "@/lib/googleMaps";


export const Route = createFileRoute("/stays/$id")({
  loader: ({ params }) => {
    const apt = getApartment(params.id);
    if (!apt) throw notFound();
    return { apt };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Apartment not found — Malfranza" }, { name: "robots", content: "noindex" }] };
    }
    const { apt } = loaderData;
    const title = `${apt.name} · ${apt.subtitle} — Malfranza`;
    const desc = apt.description;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: apt.images[0] },
      ],
    };
  },
  notFoundComponent: NotFound,
  component: ApartmentDetailPage,
});

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Apartment not found</h1>
      <p className="mt-3 text-muted-foreground">We couldn't find that apartment.</p>
      <Link to="/stays" className="mt-6 inline-flex rounded-full bg-brand-green px-6 py-3 text-white">
        Back to Stays
      </Link>
    </div>
  );
}

const AMENITIES: { label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Air Conditioning", Icon: Wind },
  { label: "Free Wi-Fi", Icon: Wifi },
  { label: "Smart TV", Icon: Tv },
  { label: "Fully Equipped Kitchen", Icon: ChefHat },
  { label: "Refrigerator", Icon: Refrigerator },
  { label: "Microwave", Icon: Microwave },
  { label: "Stove & Oven", Icon: Flame },
  { label: "Coffee Maker", Icon: Coffee },
  { label: "Private Bathroom", Icon: Bath },
  { label: "Walk-in Shower", Icon: ShowerHead },
  { label: "Hot Water", Icon: Droplets },
  { label: "Fresh Towels", Icon: Sparkles },
  { label: "Linens Provided", Icon: BedDouble },
  { label: "Iron & Ironing Board", Icon: Shirt },
  { label: "Hair Dryer", Icon: HairDryerIcon },
  { label: "Smoke Detector", Icon: BellRing },
  { label: "Free Parking", Icon: Car },
  { label: "Daily Housekeeping", Icon: Brush },
  { label: "24/7 Support", Icon: Headphones },
];

function ApartmentDetailPage() {
  const { apt } = Route.useLoaderData();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const intro =
    apt.type === "two-bedroom"
      ? "Our Two-Bedroom Apartment is designed for families and small groups who want space to unwind. Enjoy two comfortable bedrooms, a full kitchen, and a bright living area — a true home away from home."
      : "Our One-Bedroom Apartment offers the perfect blend of comfort, style, and convenience. Ideal for couples or solo travelers, it features a spacious bedroom, full kitchen, and cozy living area — your home away from home.";

  const about =
    "Relax in a tastefully furnished space with air conditioning, high-speed Wi-Fi, and a smart TV. The fully equipped kitchen makes it easy to cook your favorite meals, while the private bathroom includes a walk-in shower and complimentary toiletries. Located just minutes from beaches, restaurants, and local attractions.";

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      setError("Please choose check-in and check-out dates.");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out must be after check-in.");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const apartmentId = await getApartmentIdBySlug(apt.id);
      if (!apartmentId) {
        setError("This apartment is not available right now.");
        return;
      }
      const available = await checkApartmentAvailability(apartmentId, checkIn, checkOut);
      if (!available) {
        setError("Not available for these dates — try adjusting your stay.");
        return;
      }
      navigate({
        to: "/book",
        search: { apartment: apt.id, checkIn, checkOut, guests },
      });
    } catch {
      setError("Couldn't check availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };


  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-7xl px-6 pt-8 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-brand-green">Home</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5" /></li>
          <li><Link to="/stays" className="hover:text-brand-green">Stays</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5" /></li>
          <li className="text-brand-green font-medium">{apt.name} · {apt.subtitle}</li>
        </ol>
      </nav>

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-3xl overflow-hidden">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-[520px]">
            <img src={apt.images[0]} alt={`${apt.name} main view`} className="h-full w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:h-[520px]">
            {[1, 2, 3, 4].map((i) => {
              const src = apt.images[i % apt.images.length];
              const isLast = i === 4;
              return (
                <div key={i} className="relative overflow-hidden">
                  <img src={src} alt={`${apt.name} ${i}`} className="h-full w-full object-cover aspect-square md:aspect-auto" />
                  {isLast && (
                    <button className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-brand-green shadow-card hover:bg-white">
                      <Images className="h-4 w-4" /> View all photos
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-green">
            {apt.name} <span className="text-brand-sage font-semibold">— {apt.subtitle}</span>
          </h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-brand-orange" /> Oistins, Christ Church, Barbados
          </p>

          {/* Direct book CTA */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const today = new Date();
                const ci = new Date(today.getTime() + 86400000);
                const co = new Date(today.getTime() + 3 * 86400000);
                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                navigate({
                  to: "/book",
                  search: {
                    apartment: apt.id,
                    checkIn: checkIn || fmt(ci),
                    checkOut: checkOut || fmt(co),
                    guests,
                  },
                });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 font-semibold text-white shadow-sm hover:brightness-105 transition"
            >
              <CalendarCheck className="h-4 w-4" /> Book this stay
            </button>
            <a
              href="#book"
              className="inline-flex items-center gap-2 rounded-full border border-brand-green px-6 py-3 font-semibold text-brand-green hover:bg-brand-cream transition"
            >
              Pick dates first
            </a>
            <span className="text-sm text-muted-foreground">
              From <span className="font-semibold text-brand-green">${apt.pricePerNight}</span> / night
            </span>
          </div>

          <p className="mt-6 text-brand-charcoal leading-relaxed">{intro}</p>

          {/* Quick facts */}
          <div className="mt-6 rounded-2xl border border-border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Fact icon={Users} label={`${apt.guests} Guests`} />
            <Fact icon={BedDouble} label={`${apt.beds} Bedroom${apt.beds > 1 ? "s" : ""}`} />
            <Fact icon={Bath} label={`${apt.baths} Bathroom`} />
            <Fact icon={Ruler} label={`${apt.sizeSqM} m² Apartment`} />
          </div>


          {/* About */}
          <h2 className="mt-10 text-2xl font-bold">About this apartment</h2>
          <p className="mt-3 text-brand-charcoal leading-relaxed">{about}</p>

          {/* Amenities */}
          <h2 className="mt-10 text-2xl font-bold">Amenities</h2>
          <ul className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {AMENITIES.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-3 text-sm">
                <Icon className="h-4 w-4 text-brand-green shrink-0" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sticky booking card (desktop) */}
        <aside id="book" className="hidden lg:block lg:sticky lg:top-24 h-fit scroll-mt-24">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-green">${apt.pricePerNight}</span>
              <span className="text-muted-foreground">/ night</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From ${apt.pricePerNight} · taxes not included</p>

            <div className="mt-5 rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-2">
                <DateField label="Check-in" value={checkIn} onChange={setCheckIn} />
                <DateField label="Check-out" value={checkOut} onChange={setCheckOut} borderLeft />
              </div>
              <label className="block border-t border-border px-4 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">Guests</span>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                >
                  {Array.from({ length: apt.guests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              onClick={handleCheckAvailability}
              disabled={checking}
              className="mt-4 w-full rounded-full bg-brand-orange px-6 py-3.5 font-semibold text-white hover:brightness-105 transition disabled:opacity-60"
            >
              {checking ? "Checking availability…" : "Check Availability"}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <Link
              to="/contact"
              className="block w-full rounded-full border border-brand-green px-6 py-3.5 text-center font-semibold text-brand-green hover:bg-brand-cream transition"
            >
              Send Enquiry
            </Link>

            <div className="mt-5 flex gap-3 rounded-xl bg-brand-cream p-4">
              <Shield className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-brand-green">Secure booking. Local service.</p>
                <p className="text-muted-foreground">Clean, comfortable, and trusted by travelers.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile inline booking form (visible on small screens above trust strip) */}
        <div id="book-mobile" className="lg:hidden rounded-2xl border border-border bg-white p-5 shadow-card scroll-mt-24">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-green">${apt.pricePerNight}</span>
            <span className="text-muted-foreground text-sm">/ night</span>
          </div>
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-2">
              <DateField label="Check-in" value={checkIn} onChange={setCheckIn} />
              <DateField label="Check-out" value={checkOut} onChange={setCheckOut} borderLeft />
            </div>
            <label className="block border-t border-border px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">Guests</span>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              >
                {Array.from({ length: apt.guests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </section>

      {/* Mobile fixed bottom booking bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-brand-green leading-none">${apt.pricePerNight}<span className="text-sm font-medium text-muted-foreground"> / night</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Free cancellation options</p>
          </div>
          <button
            onClick={handleCheckAvailability}
            disabled={checking}
            className="ml-auto shrink-0 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check Availability"}
          </button>
        </div>
      </div>



      {/* Location */}
      <section className="mx-auto max-w-7xl px-6 mt-16">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Location</h2>
            <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand-green" />
              Oistins, Christ Church, Barbados
            </p>
          </div>
        </div>
        <div className="mt-5 relative rounded-2xl overflow-hidden border border-border shadow-card h-[320px] bg-brand-cream">
          <AreaMap center={OISTINS_CENTER} zoom={14} radius={550} className="absolute inset-0 h-full w-full" />
          <div className="absolute left-4 bottom-4 rounded-xl bg-white/95 backdrop-blur px-4 py-3 shadow-card">
            <p className="text-sm font-semibold text-brand-green">Exact address provided after booking.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Central Oistins — minutes from the highway and the airport.</p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-7xl px-6 mt-16 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrustCard icon={BadgeCheck} title="Best Price Guarantee" body="Get the best rates when you book direct." />
          <TrustCard icon={Sparkles} title="Clean & Comfortable" body="Well-maintained apartments with everything you need." />
          <TrustCard icon={HeartHandshake} title="Local Support" body="We're here to help before, during, and after your stay." />
          <TrustCard icon={CalendarCheck} title="Flexible Booking" body="Easy changes and cancellation options." />
        </div>
      </section>
    </div>
  );
}

function Fact({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-brand-green" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function DateField({ label, value, onChange, borderLeft }: { label: string; value: string; onChange: (v: string) => void; borderLeft?: boolean }) {
  return (
    <label className={`block px-4 py-3 ${borderLeft ? "border-l border-border" : ""}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-sm outline-none"
      />
    </label>
  );
}

function TrustCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border p-5 bg-white">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream">
        <Icon className="h-5 w-5 text-brand-green" />
      </div>
      <h3 className="mt-3 font-bold text-brand-green">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// Suppress unused warning
void APARTMENTS;
