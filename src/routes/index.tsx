import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Home, BedDouble, Plane, Users, Calendar, MapPin, Car,
  CheckCircle2, ShieldCheck, Sparkles, ArrowRight,
} from "lucide-react";
import { APARTMENTS, fetchApartments, type Apartment } from "@/data/apartments";
import heroImg from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_43 PM.png";
import stayKitchen from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_20 PM.png";
import stay2br from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_43 PM.png";
import stayBathroom from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_13 PM.png";
import stayGarden from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_00 PM.png";
import stayTropical from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_27 PM.png";
import stay1br from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_34 PM.png";
import taxiVan from "@/assets/ChatGPT Image Jul 2, 2026, 10_48_48 PM.png";
import locationBanner from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_00 PM.png";

const homeSearchSchema = z.object({
  auth: z.enum(["signin", "signup", "setup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => homeSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Malfranza Apartments & Taxi | Comfortable Stays & Reliable Rides in Barbados" },
      { name: "description", content: "Book comfortable one- and two-bedroom apartments in Oistins, Barbados, plus reliable taxi service for airport transfers and daily rides." },
      { property: "og:title", content: "Malfranza Apartments & Taxi — Barbados" },
      { property: "og:description", content: "Clean stays. Reliable service. Local hospitality — right in Oistins, Barbados." },
      { property: "og:image", content: heroImg },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

const categories = [
  { icon: Home, label: "One-Bedroom", to: "/stays" as const, search: { type: "one-bedroom" as const } },
  { icon: BedDouble, label: "Two-Bedroom", to: "/stays" as const, search: { type: "two-bedroom" as const } },
  { icon: Plane, label: "Airport Transfers", to: "/taxi" as const, search: { serviceType: "Airport Pickup" as const } },
  { icon: Users, label: "Group & Custom Trips", to: "/taxi" as const, search: { serviceType: "Hourly / Custom" as const } },
];

const galleryImages = [
  stayGarden, stayKitchen, stay2br,
  stayTropical, stayBathroom, stay1br,
];

const whyReasons = [
  { title: "Easy highway access", desc: "Minutes from the highway for quick travel across Barbados." },
  { title: "Clean & comfortable", desc: "Well-maintained apartments with everything you need." },
  { title: "Comfortable longer stays", desc: "Spacious apartments with kitchens to feel at home." },
  { title: "Reliable local transport", desc: "Dependable taxi service for transfers and daily rides." },
];

/* Subtle palm-leaf watermark for section corners */
function PalmWatermark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className={`pointer-events-none absolute text-brand-sage/15 ${className}`}
      fill="currentColor"
    >
      <path d="M100 190c0-40 8-72 26-96 16-22 40-38 70-46-4 32-18 60-40 82-20 20-40 34-56 60zm0 0c0-40-8-72-26-96C58 72 34 56 4 48c4 32 18 60 40 82 20 20 40 34 56 60zm0-30c0-32-4-58-14-80-8-18-22-32-42-40 2 26 12 48 28 66 12 14 20 30 28 54z" />
    </svg>
  );
}

/* Orange arc divider echoing the logo */
function OrangeArc({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 20" className={`h-3 w-20 ${className}`} fill="none">
      <path d="M2 18 Q 40 -6 78 18" stroke="#F15A2B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px w-8 bg-brand-orange" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-sage">
        {children}
      </span>
    </div>
  );
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Drop empty, placeholder, or otherwise unusable image URLs from gallery mixes. */
function isUsableImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const value = src.trim();
  if (!value) return false;
  if (value.includes("placeholder")) return false;
  if (value === "null" || value === "undefined") return false;
  return true;
}

function HomePage() {
  const navigate = useNavigate();
  // Seed instantly so first paint isn't blank while the API loads.
  const [apartments, setApartments] = useState<Apartment[]>(APARTMENTS);

  useEffect(() => {
    let cancelled = false;
    fetchApartments().then((items) => {
      if (!cancelled && items.length > 0) setApartments(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredStays = apartments.slice(0, 4).map((a) => ({
    id: a.id,
    img: a.images[0],
    name: a.subtitle,
    type: a.name,
    desc: a.description,
    guests: a.guests,
    beds: a.beds,
    price: a.pricePerNight,
  }));
  const liveGallery = useMemo(() => {
    const preferred = apartments
      .flatMap((a) => a.images.slice(0, 2))
      .filter(isUsableImageSrc);
    const merged: string[] = [];
    for (const src of [...preferred, ...galleryImages]) {
      if (!isUsableImageSrc(src)) continue;
      if (merged.includes(src)) continue;
      merged.push(src);
      if (merged.length >= 6) break;
    }
    // Always fill to 6 with known-good local photos so the grid never has empty slots.
    for (const src of galleryImages) {
      if (merged.length >= 6) break;
      if (!merged.includes(src)) merged.push(src);
    }
    return merged.slice(0, 6);
  }, [apartments]);

  // Hero search state
  const [checkIn, setCheckIn] = useState(todayISO(7));
  const [checkOut, setCheckOut] = useState(todayISO(14));
  const [searchGuests, setSearchGuests] = useState(2);
  const [searchType, setSearchType] = useState<"any" | "one-bedroom" | "two-bedroom">("any");
  const [taxiPickup, setTaxiPickup] = useState("");

  // Homepage taxi quick-book
  const [rideService, setRideService] = useState("Airport Pickup");
  const [ridePickup, setRidePickup] = useState("Grantley Adams Intl. Airport (BGI)");
  const [rideDropoff, setRideDropoff] = useState("");
  const [rideDate, setRideDate] = useState(todayISO(1));
  const [rideTime, setRideTime] = useState("10:30");
  const [ridePassengers, setRidePassengers] = useState(2);
  const [rideError, setRideError] = useState<string | null>(null);

  const handleSearch = () => {
    navigate({
      to: "/stays",
      search: {
        checkIn,
        checkOut,
        guests: searchGuests,
        type: searchType,
        taxiPickup: taxiPickup || undefined,
      },
    });
  };

  const handleBookRide = () => {
    if (!ridePickup.trim() || !rideDropoff.trim()) {
      setRideError("Add pickup and drop-off locations to continue.");
      return;
    }
    setRideError(null);
    navigate({
      to: "/taxi",
      search: {
        serviceType: rideService as "Airport Pickup" | "Airport Drop-off" | "Point to Point" | "Hourly / Custom",
        pickup: ridePickup.trim(),
        dropoff: rideDropoff.trim(),
        date: rideDate,
        time: rideTime,
        passengers: ridePassengers,
      },
    });
  };

  return (
    <div>
      {/* HERO — full-bleed photo */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Bright Malfranza apartment interior"
          className="absolute inset-0 h-full w-full object-cover"
          width={1600}
          height={1000}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/85 via-brand-green/55 to-brand-charcoal/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/40 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-16 lg:pt-28">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-brand-orange" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
                Oistins · Barbados
              </span>
            </div>
            <h1 className="mt-4 text-3xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Stay comfortably.<br />Move easily.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              Affordable one- and two-bedroom apartments in Barbados with reliable taxi service
              for airport transfers, daily rides, and more.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/stays"
                className="inline-flex items-center rounded-xl bg-brand-orange px-6 py-3.5 text-sm font-semibold text-brand-orange-foreground shadow-lg transition-all hover:brightness-105"
              >
                Book a Stay
              </Link>
              <Link
                to="/taxi"
                className="inline-flex items-center rounded-xl border-2 border-white bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-brand-green"
              >
                Book a Ride
              </Link>
            </div>
          </div>

          {/* Search bar — floats over hero, overlaps next section */}
          <div className="relative mt-8 lg:-mb-14 lg:mt-12">
            <div className="rounded-2xl border border-white/40 bg-white/95 p-3 shadow-card backdrop-blur-md sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6 lg:items-end">
                <SearchInput icon={Calendar} label="Check-in" type="date" value={checkIn} min={todayISO(0)} onChange={setCheckIn} />
                <SearchInput icon={Calendar} label="Check-out" type="date" value={checkOut} min={checkIn} onChange={setCheckOut} />
                <SearchInput icon={Users} label="Guests" type="number" value={String(searchGuests)} min="1" max="6" onChange={(v) => setSearchGuests(Math.max(1, Math.min(6, parseInt(v || "1", 10))))} />
                <SearchSelect icon={Home} label="Type" value={searchType} onChange={(v) => setSearchType(v as typeof searchType)} options={[
                  { value: "any", label: "Any" },
                  { value: "one-bedroom", label: "One-Bedroom" },
                  { value: "two-bedroom", label: "Two-Bedroom" },
                ]} />
                <SearchText icon={MapPin} label="Taxi Pickup" value={taxiPickup} onChange={setTaxiPickup} placeholder="Type pickup location" />
                <button type="button" onClick={handleSearch} className="inline-flex h-[52px] items-center justify-center rounded-xl bg-brand-green px-6 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category strip — 2x2 mobile, 4-across desktop */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map(({ icon: Icon, label, to, search }) => (
            <Link
              key={label}
              to={to}
              search={search}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:gap-4 sm:p-5 sm:text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-sage/25 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 text-brand-green" />
              </div>
              <span className="font-display text-[13px] font-semibold leading-tight text-brand-green sm:text-[15px]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured stays — mobile carousel, desktop grid */}
      <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <PalmWatermark className="right-0 top-0 h-40 w-40 -translate-y-6 translate-x-6 rotate-45" />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <Eyebrow>Featured Stays</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">Comfortable places for your short stay</h2>
            <div className="mt-2"><OrangeArc /></div>
          </div>
          <Link
            to="/stays"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-green hover:text-brand-orange sm:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredStays.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center shadow-card">
            <p className="text-brand-charcoal/75">Apartments are loading from our listings. Please refresh in a moment.</p>
            <Link to="/stays" className="mt-4 inline-flex text-sm font-semibold text-brand-green">
              Browse stays
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile carousel */}
            <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
              {featuredStays.map((s) => (
                <Link
                  key={s.id}
                  to="/stays/$id"
                  params={{ id: s.id }}
                  className="group w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-white shadow-card"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-brand-cream">
                    <img src={s.img} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-sage">{s.type}</p>
                    <h3 className="mt-0.5 text-base">{s.name}</h3>
                    <p className="mt-1 text-xs text-brand-charcoal/70 line-clamp-2">{s.desc}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-brand-charcoal/75">
                      <span className="inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-brand-green" /> {s.guests}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedDouble className="h-3.5 w-3.5 text-brand-green" /> {s.beds}
                        </span>
                      </span>
                      <span className="font-semibold text-brand-green">${s.price}/nt</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop grid */}
            <div className="mt-8 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              {featuredStays.map((s) => (
                <Link
                  key={s.id}
                  to="/stays/$id"
                  params={{ id: s.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-brand-cream">
                    <img
                      src={s.img}
                      alt={s.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-sage">{s.type}</p>
                    <h3 className="mt-1 text-lg">{s.name}</h3>
                    <p className="mt-1 text-sm text-brand-charcoal/70 line-clamp-2">{s.desc}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-brand-charcoal/75">
                      <span className="inline-flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-brand-green" /> {s.guests}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4 text-brand-green" /> {s.beds} {s.beds === 1 ? "Bed" : "Beds"}
                        </span>
                      </span>
                      <span className="font-semibold text-brand-green">${s.price}/nt</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 sm:hidden">
          <Link to="/stays" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green">
            View all apartments <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Photo gallery strip */}
      <section className="bg-brand-sage/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center"><Eyebrow>Inside Our Apartments</Eyebrow></div>
            <h2 className="mt-3 text-3xl sm:text-4xl">A glimpse of your stay</h2>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {liveGallery.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={`overflow-hidden rounded-xl bg-brand-cream shadow-card ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square sm:col-span-1 sm:row-span-1 sm:aspect-[4/5] lg:col-span-2 lg:row-span-2 lg:aspect-square" : "aspect-square"
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    // Swap any late-breaking remote URL for a known local photo.
                    const fallback = galleryImages[i % galleryImages.length];
                    if (fallback && event.currentTarget.src !== fallback) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Taxi section */}
      <section className="relative overflow-hidden bg-brand-cream">
        <PalmWatermark className="left-0 bottom-0 h-56 w-56 -translate-x-10 translate-y-10 -rotate-12" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
          <div>
            <Eyebrow>Malfranza Taxi</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">Reliable rides when you need them</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-brand-sage/30 shadow-card">
              <img
                src={taxiVan}
                alt="Malfranza branded taxi van"
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
            <div className="mt-2"><OrangeArc /></div>
            <p className="mt-4 text-base leading-relaxed text-brand-charcoal/80 sm:text-lg">
              Airport pickups, return trips, daily rides, and group transport — on time, every time.
            </p>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {["Airport pickup & return", "Regular taxi bookings", "Group & custom trips", "Local errands"].map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-green" />
                  <span className="text-sm font-medium text-brand-charcoal">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-sage/40 bg-white p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
              <div>
                <p className="font-display font-semibold text-brand-green">On-time. Every time.</p>
                <p className="mt-1 text-sm text-brand-charcoal/75">
                  Local drivers. Clean vehicles. Trusted by travelers.
                </p>
              </div>
            </div>
          </div>

          {/* Book a Ride form */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-green p-5 shadow-card-hover sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-brand-orange/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-brand-sage/20 blur-3xl" aria-hidden="true" />

            <div className="relative">
              <h3 className="text-2xl text-white">Book a Ride</h3>
              <p className="mt-1 text-sm text-brand-sage">Choose your trip — we’ll finish details on the next step.</p>

              <div className="mt-5 space-y-3.5">
                <label className="block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 transition-colors hover:border-brand-orange/40">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Service Type</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Car className="h-4 w-4 shrink-0 text-brand-orange" />
                    <select
                      value={rideService}
                      onChange={(e) => setRideService(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-white outline-none"
                    >
                      <option className="text-brand-charcoal" value="Airport Pickup">Airport Pickup</option>
                      <option className="text-brand-charcoal" value="Airport Drop-off">Airport Drop-off</option>
                      <option className="text-brand-charcoal" value="Point to Point">Point to Point</option>
                      <option className="text-brand-charcoal" value="Hourly / Custom">Hourly / Custom</option>
                    </select>
                  </div>
                </label>
                <TextFormField icon={MapPin} label="Pickup Location" value={ridePickup} onChange={setRidePickup} placeholder="Type pickup location" variant="dark" />
                <TextFormField icon={MapPin} label="Drop-off Location" value={rideDropoff} onChange={setRideDropoff} placeholder="Type drop-off location" variant="dark" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 transition-colors hover:border-brand-orange/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Date</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-orange" />
                      <input
                        type="date"
                        value={rideDate}
                        min={todayISO(0)}
                        onChange={(e) => setRideDate(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-white outline-none [color-scheme:dark]"
                      />
                    </div>
                  </label>
                  <label className="block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 transition-colors hover:border-brand-orange/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Time</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-orange" />
                      <input
                        type="time"
                        value={rideTime}
                        onChange={(e) => setRideTime(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-white outline-none [color-scheme:dark]"
                      />
                    </div>
                  </label>
                </div>
                <label className="block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 transition-colors hover:border-brand-orange/40">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Passengers</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-brand-orange" />
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={ridePassengers}
                      onChange={(e) => setRidePassengers(Math.max(1, Math.min(14, parseInt(e.target.value || "1", 10))))}
                      className="w-full bg-transparent text-sm font-medium text-white outline-none"
                    />
                  </div>
                </label>
                {rideError ? (
                  <p className="text-sm text-brand-orange">{rideError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleBookRide}
                  className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-orange text-sm font-semibold text-white shadow-lg shadow-brand-orange/20 transition-all hover:-translate-y-0.5 hover:brightness-105"
                >
                  Continue to Book Ride
                </button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-white/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-sage" />
                  Free cancellation up to 12 hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us — 2x2 compact on mobile */}
      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <PalmWatermark className="left-0 top-0 h-40 w-40 -translate-x-4 -translate-y-4 -rotate-45" />

        <div className="text-center">
          <div className="flex justify-center"><Eyebrow>Why Malfranza</Eyebrow></div>
          <h2 className="mt-3 text-3xl sm:text-4xl">Why guests choose Malfranza</h2>
          <div className="mt-2 flex justify-center"><OrangeArc /></div>
          <p className="mx-auto mt-3 max-w-2xl text-base text-brand-charcoal/75 sm:text-lg">
            Warm, practical hospitality with the reliability travelers count on.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {whyReasons.map((r, i) => {
            const Icon = [MapPin, Sparkles, Home, Car][i];
            return (
              <div key={r.title} className="rounded-2xl border border-border bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-sage/25 sm:h-12 sm:w-12">
                  <Icon className="h-4 w-4 text-brand-green sm:h-5 sm:w-5" />
                </div>
                <h3 className="mt-3 text-sm sm:mt-5 sm:text-lg">{r.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-charcoal/70 sm:mt-2 sm:text-sm">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Location banner */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-20">
        <div className="relative overflow-hidden rounded-3xl">
          <img
            src={locationBanner}
            alt="Tropical Barbados landscape"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green/85 via-brand-green/60 to-brand-green/20" />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:p-12">
            <div className="rounded-2xl bg-white p-5 shadow-card sm:p-7">
              <Eyebrow>Location</Eyebrow>
              <h2 className="mt-3 text-2xl sm:text-3xl">Convenient. Well-connected. Great value.</h2>
              <div className="mt-2"><OrangeArc /></div>
              <p className="mt-3 text-brand-charcoal/75">
                Located in a busy, central area with easy access to the highway, beaches, restaurants,
                and essential services. Everything you need — close by.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["5 mins to Oistins", "10 mins to Airport", "Close to Beaches", "Shops & Services"].map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center rounded-full border border-brand-sage/50 bg-brand-cream px-3.5 py-1.5 text-xs font-medium text-brand-green"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>
    </div>
  );
}

function SearchInput({
  icon: Icon, label, type, value, onChange, min, max,
}: { icon: typeof Home; label: string; type: "date" | "number" | "text"; value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  return (
    <label className="block rounded-xl border border-border bg-white px-3 py-2.5 transition-colors hover:border-brand-sage focus-within:border-brand-green">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-charcoal/60">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand-green" />
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 w-full bg-transparent text-sm font-medium text-brand-charcoal outline-none"
        />
      </div>
    </label>
  );
}

function SearchSelect({
  icon: Icon, label, value, onChange, options,
}: { icon: typeof Home; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block rounded-xl border border-border bg-white px-3 py-2.5 transition-colors hover:border-brand-sage focus-within:border-brand-green">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-charcoal/60">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand-green" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 w-full bg-transparent text-sm font-medium text-brand-charcoal outline-none"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </label>
  );
}

function SearchText({
  icon: Icon, label, value, onChange, placeholder,
}: { icon: typeof Home; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block rounded-xl border border-border bg-white px-3 py-2.5 transition-colors hover:border-brand-sage focus-within:border-brand-green">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-charcoal/60">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand-green" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 w-full bg-transparent text-sm font-medium text-brand-charcoal outline-none placeholder:text-brand-charcoal/40"
        />
      </div>
    </label>
  );
}

function TextFormField({
  icon: Icon, label, value, onChange, placeholder, variant = "light",
}: { icon: typeof Home; label: string; value: string; onChange: (v: string) => void; placeholder?: string; variant?: "light" | "dark" }) {
  const isDark = variant === "dark";
  return (
    <label className={
      isDark
        ? "block rounded-xl border border-white/10 bg-brand-green-deep px-4 py-3 transition-colors hover:border-brand-orange/40"
        : "block rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:border-brand-sage"
    }>
      <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-brand-sage" : "text-brand-charcoal/60"}`}>{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${isDark ? "text-brand-orange" : "text-brand-green"}`} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            isDark
              ? "w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/40"
              : "w-full bg-transparent text-sm font-medium text-brand-charcoal outline-none placeholder:text-brand-charcoal/40"
          }
        />
      </div>
    </label>
  );
}
