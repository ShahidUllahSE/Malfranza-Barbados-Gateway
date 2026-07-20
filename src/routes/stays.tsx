import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Wifi, Snowflake, ChefHat, Tv, Car, Briefcase, Users, BedDouble,
  ChevronDown, SlidersHorizontal, CheckSquare, Square,
} from "lucide-react";
import { fetchApartments, type Apartment } from "@/data/apartments";
import { fetchApartmentOccupancy, type ApartmentOccupancy } from "@/lib/bookings";
import { useUserAuth } from "@/context/UserAuthContext";
import heroImg from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_34 PM.png";

function buildBookRedirect(input: {
  apartment: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}) {
  const params = new URLSearchParams();
  params.set("apartment", input.apartment);
  if (input.checkIn) params.set("checkIn", input.checkIn);
  if (input.checkOut) params.set("checkOut", input.checkOut);
  if (input.guests != null) params.set("guests", String(input.guests));
  return `/book?${params.toString()}`;
}

const staysSearchSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
  type: z.enum(["any", "one-bedroom", "two-bedroom"]).optional(),
  taxiPickup: z.string().optional(),
});

export const Route = createFileRoute("/stays")({
  validateSearch: (search) => staysSearchSchema.parse(search),
  loader: () => fetchApartments(),
  head: () => ({
    meta: [
      { title: "Stays in Barbados — One & Two-Bedroom Apartments | Malfranza" },
      { name: "description", content: "Browse comfortable, well-located one- and two-bedroom apartments in Oistins, Barbados. Clean, quiet, and close to the airport." },
      { property: "og:title", content: "Stays in Barbados — Malfranza Apartments" },
      { property: "og:description", content: "Comfortable one- and two-bedroom apartments in Oistins, Barbados." },
    ],
  }),
  component: StaysPage,
});

const APT_TYPES = [
  { key: "one-bedroom", label: "One-Bedroom Apartment" },
  { key: "two-bedroom", label: "Two-Bedroom Apartment" },
] as const;

const GUEST_RANGES = [
  { key: "1-2", label: "1–2 Guests", test: (n: number) => n <= 2 },
  { key: "3-4", label: "3–4 Guests", test: (n: number) => n >= 3 && n <= 4 },
  { key: "5+", label: "5+ Guests", test: (n: number) => n >= 5 },
] as const;

const AMENITY_OPTIONS = [
  { key: "Wi-Fi", icon: Wifi },
  { key: "Air Conditioning", icon: Snowflake },
  { key: "Kitchen", icon: ChefHat },
  { key: "Smart TV", icon: Tv },
  { key: "Parking", icon: Car },
  { key: "Workspace", icon: Briefcase },
] as const;

const AMENITY_ICON: Record<string, typeof Wifi> = {
  "Wi-Fi": Wifi, "Air Conditioning": Snowflake, Kitchen: ChefHat, "Smart TV": Tv,
  Parking: Car, Workspace: Briefcase,
};

type Filters = {
  types: string[];
  guests: string[];
  amenities: string[];
  stayLength: string;
};

const EMPTY: Filters = { types: [], guests: [], amenities: [], stayLength: "any" };

function StaysPage() {
  const search = Route.useSearch();
  const apartments = Route.useLoaderData();
  const initial: Filters = {
    ...EMPTY,
    types: search.type && search.type !== "any" ? [search.type] : [],
    guests: search.guests
      ? [search.guests <= 2 ? "1-2" : search.guests <= 4 ? "3-4" : "5+"]
      : [],
  };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [sort, setSort] = useState<"recommended" | "price-asc" | "price-desc">("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [occupancyBySlug, setOccupancyBySlug] = useState<Record<string, ApartmentOccupancy>>({});

  // Re-apply filters when the search params change (e.g. from the home hero search)
  useEffect(() => {
    const next: Filters = {
      ...EMPTY,
      types: search.type && search.type !== "any" ? [search.type] : [],
      guests: search.guests
        ? [search.guests <= 2 ? "1-2" : search.guests <= 4 ? "3-4" : "5+"]
        : [],
    };
    setDraft(next);
    setApplied(next);
  }, [search.type, search.guests]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchApartmentOccupancy({
          checkIn: search.checkIn,
          checkOut: search.checkOut,
        });
        if (cancelled) return;
        const map: Record<string, ApartmentOccupancy> = {};
        for (const item of items) map[item.slug] = item;
        setOccupancyBySlug(map);
      } catch {
        if (!cancelled) setOccupancyBySlug({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search.checkIn, search.checkOut]);

  const toggle = (group: keyof Filters, value: string) => {
    setDraft((d) => {
      if (group === "stayLength") return { ...d, stayLength: value };
      const arr = d[group] as string[];
      return { ...d, [group]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const filtered = useMemo(() => {
    const list = apartments.filter((a) => {
      if (applied.types.length && !applied.types.includes(a.type)) return false;
      if (applied.guests.length) {
        const match = applied.guests.some((k) => GUEST_RANGES.find((g) => g.key === k)?.test(a.guests));
        if (!match) return false;
      }
      if (applied.amenities.length && !applied.amenities.every((am) => a.amenities.includes(am))) return false;
      return true;
    });
    if (sort === "price-asc") list.sort((a, b) => a.pricePerNight - b.pricePerNight);
    if (sort === "price-desc") list.sort((a, b) => b.pricePerNight - a.pricePerNight);
    return list;
  }, [apartments, applied, sort]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    apartments.forEach((a) => { c[a.type] = (c[a.type] ?? 0) + 1; });
    return c;
  }, [apartments]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-cream/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8">
          <div>
            <h1 className="text-3xl leading-[1.05] sm:text-4xl md:text-5xl">
              Find the stay<br />that fits your trip.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-charcoal/80">
              Comfortable, well-located apartments in Barbados with reliable taxi service for
              airport transfers, daily rides, and more.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-sage/40 bg-white px-4 py-2 text-sm font-medium text-brand-green shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-orange" />
              Clean · Comfortable · Convenient
            </span>
          </div>
          <div className="aspect-[5/4] overflow-hidden rounded-3xl shadow-card">
            <img src={heroImg} alt="Bright bedroom" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Results layout */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-brand-green shadow-card lg:hidden"
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {(applied.types.length + applied.guests.length + applied.amenities.length) > 0 && (
                  <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white">
                    {applied.types.length + applied.guests.length + applied.amenities.length}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>

            <div className={`rounded-2xl border border-border bg-white p-5 shadow-card ${filtersOpen ? "block" : "hidden"} lg:block`}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-green" />
                <h2 className="text-base font-display font-bold text-brand-green">Filter your stay</h2>
              </div>

              <FilterGroup title="Apartment Type">
                {APT_TYPES.map((t) => (
                  <CheckRow
                    key={t.key}
                    label={`${t.label} (${typeCounts[t.key] ?? 0})`}
                    checked={draft.types.includes(t.key)}
                    onChange={() => toggle("types", t.key)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Guests" icon={<Users className="h-3.5 w-3.5 text-brand-green" />}>
                {GUEST_RANGES.map((g) => (
                  <CheckRow
                    key={g.key}
                    label={g.label}
                    checked={draft.guests.includes(g.key)}
                    onChange={() => toggle("guests", g.key)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Amenities">
                {AMENITY_OPTIONS.map((a) => (
                  <CheckRow
                    key={a.key}
                    label={a.key}
                    checked={draft.amenities.includes(a.key)}
                    onChange={() => toggle("amenities", a.key)}
                  />
                ))}
              </FilterGroup>

              <div className="mt-5 border-t border-border pt-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
                  Stay Length
                </label>
                <div className="relative">
                  <select
                    value={draft.stayLength}
                    onChange={(e) => setDraft((d) => ({ ...d, stayLength: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-border bg-white px-3 py-2.5 pr-9 text-sm text-brand-charcoal outline-none focus:border-brand-sage"
                  >
                    <option value="any">Any length</option>
                    <option value="short">1–3 nights</option>
                    <option value="week">Weekly stays</option>
                    <option value="month">Monthly stays</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-charcoal/60" />
                </div>
              </div>

              <button
                onClick={() => { setApplied(draft); setFiltersOpen(false); }}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-green text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              >
                Apply Filters
              </button>
              <button
                onClick={() => { setDraft(EMPTY); setApplied(EMPTY); }}
                className="mt-2 w-full text-center text-sm font-medium text-brand-charcoal/70 hover:text-brand-green"
              >
                Clear all
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-lg font-display font-bold text-brand-green">
                {filtered.length} {filtered.length === 1 ? "apartment" : "apartments"} found
              </p>
              <div className="relative w-full sm:w-auto sm:shrink-0">
                <label className="sr-only" htmlFor="sort">Sort</label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pl-3 pr-9 text-sm text-brand-charcoal outline-none focus:border-brand-sage sm:w-auto"
                >
                  <option value="recommended">Sort by: Recommended</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-charcoal/60" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-brand-cream p-10 text-center">
                <p className="font-display text-lg font-bold text-brand-green">No apartments match those filters — try clearing a few.</p>
                <p className="mt-2 text-sm text-brand-charcoal/70">You can widen your search or start over.</p>
                <button
                  onClick={() => { setDraft(EMPTY); setApplied(EMPTY); }}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand-orange px-6 text-sm font-semibold text-white shadow-sm hover:brightness-105"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((a) => (
                  <ApartmentCard
                    key={a.id}
                    apt={a}
                    occupancy={occupancyBySlug[a.id]}
                    searchDates={
                      search.checkIn && search.checkOut
                        ? { checkIn: search.checkIn, checkOut: search.checkOut, guests: search.guests }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ApartmentCard({
  apt,
  occupancy,
  searchDates,
}: {
  apt: Apartment;
  occupancy?: ApartmentOccupancy;
  searchDates?: { checkIn: string; checkOut: string; guests?: number };
}) {
  const navigate = useNavigate();
  const { user, openAuthModal } = useUserAuth();
  const displayed = apt.amenities.slice(0, 4);
  const ranges = occupancy?.blockedRanges ?? [];
  const unavailableForSearch = searchDates ? occupancy?.available === false : false;
  const occupiedNow = occupancy?.occupiedNow === true;
  const bookDisabled = unavailableForSearch;

  function handleBookNow() {
    const bookSearch = {
      apartment: apt.id,
      checkIn: searchDates?.checkIn,
      checkOut: searchDates?.checkOut,
      guests: searchDates?.guests,
    };
    if (user) {
      navigate({ to: "/book", search: bookSearch });
      return;
    }
    openAuthModal({
      mode: "signin",
      reason: "Sign in to book this stay. Your booking will appear under My Bookings.",
      redirectTo: buildBookRedirect({
        apartment: apt.id,
        checkIn: searchDates?.checkIn,
        checkOut: searchDates?.checkOut,
        guests: searchDates?.guests,
      }),
    });
  }

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-cream">
        <img
          src={apt.images[0]}
          alt={`${apt.name} — ${apt.subtitle}`}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 hover:scale-105 ${bookDisabled ? "grayscale-[25%]" : ""}`}
        />
        {unavailableForSearch && (
          <div className="absolute left-3 top-3 rounded-full bg-brand-charcoal/90 px-3 py-1 text-xs font-semibold text-white">
            Unavailable for your dates
          </div>
        )}
        {!unavailableForSearch && occupiedNow && (
          <div className="absolute left-3 top-3 rounded-full bg-brand-orange px-3 py-1 text-xs font-semibold text-white">
            Occupied now
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-snug">
          {apt.name}<br />
          <span className="text-brand-charcoal">{apt.subtitle}</span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-brand-charcoal/70">{apt.description}</p>

        {ranges.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Booked dates
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ranges.slice(0, 4).map((range) => (
                <span
                  key={`${range.checkIn}-${range.checkOut}`}
                  className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
                >
                  {fmtShortDate(range.checkIn)} – {fmtShortDate(range.checkOut)}
                </span>
              ))}
              {ranges.length > 4 && (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  +{ranges.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-charcoal/75">
          {displayed.map((am) => {
            const Icon = AMENITY_ICON[am];
            return (
              <span key={am} className="inline-flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5 text-brand-green" />} {am}
              </span>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-brand-charcoal/75">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-brand-green" /> {apt.guests} Guests
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-4 w-4 text-brand-green" /> {apt.beds} {apt.beds === 1 ? "Bed" : "Beds"}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:grid sm:grid-cols-2">
          <Link
            to="/stays/$id"
            params={{ id: apt.id }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-green text-sm font-semibold text-brand-green transition-all hover:bg-brand-cream"
          >
            View Details
          </Link>
          {bookDisabled ? (
            <span className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-600">
              Booked
            </span>
          ) : (
            <button
              type="button"
              onClick={handleBookNow}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-orange text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function fmtShortDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function FilterGroup({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-brand-charcoal">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-brand-charcoal hover:text-brand-green">
      {checked ? (
        <CheckSquare className="h-4 w-4 shrink-0 text-brand-green" />
      ) : (
        <Square className="h-4 w-4 shrink-0 text-brand-charcoal/40" />
      )}
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="min-w-0">{label}</span>
    </label>
  );
}
