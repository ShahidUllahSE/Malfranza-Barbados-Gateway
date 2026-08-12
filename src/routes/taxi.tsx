import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Clock, Sparkles, ShieldCheck, Plane, Car, Users, MapPin, Compass,
  Calendar, Watch, User, ArrowRight, CheckCircle2, HeartHandshake, DollarSign,
} from "lucide-react";
import taxiHero from "@/assets/ChatGPT Image Jul 2, 2026, 10_48_48 PM.png";
import { PlacesAutocompleteInput, TaxiRouteMap, type LatLng } from "@/components/maps/PlacesAutocompleteInput";
import {
  createTaxiBooking,
  fetchTaxiFareSettings,
  fetchTaxiVehicles,
  type PublicTaxiVehicle,
  type PublicTaxiVehiclesResult,
  type TaxiBookingResult,
  type TaxiFareSettings,
} from "@/lib/bookings";
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
  const [searching, setSearching] = useState(false);
  const [confirmation, setConfirmation] = useState<TaxiBookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fareSettings, setFareSettings] = useState<TaxiFareSettings | null>(null);
  const [vehicleResult, setVehicleResult] = useState<PublicTaxiVehiclesResult | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<PublicTaxiVehicle | null>(null);
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLng | null>(null);
  /** Which location field the map click fills — set when user focuses pickup / drop-off. */
  const [mapTarget, setMapTarget] = useState<"pickup" | "dropoff">("pickup");
  /** Map expands under the location fields (not off-screen above the form). */
  const [showLocationMap, setShowLocationMap] = useState(true);

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

  useEffect(() => {
    const pickup = (search.pickup ?? "").trim();
    const dropoff = (search.dropoff ?? "").trim();
    if (!pickup || !dropoff || !search.date || !search.time) return;
    let cancelled = false;
    setSearching(true);
    fetchTaxiVehicles({
      passengers: search.passengers ?? 1,
      pickupDate: search.date,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
    })
      .then((result) => {
        if (!cancelled) setVehicleResult(result);
      })
      .catch(() => {
        if (!cancelled) setVehicleResult(null);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search.pickup, search.dropoff, search.date, search.time, search.passengers]);

  const handleFindVehicles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup.trim() || !form.dropoff.trim() || !form.date || !form.time) {
      setError("Please fill in pickup, drop-off, date and time.");
      return;
    }
    setError(null);
    setSearching(true);
    setSelectedVehicle(null);
    try {
      const result = await fetchTaxiVehicles({
        passengers: form.passengers,
        pickupDate: form.date,
        pickupLocation: form.pickup.trim(),
        dropoffLocation: form.dropoff.trim(),
      });
      setVehicleResult(result);
      window.requestAnimationFrame(() => {
        document.getElementById("available-vehicles")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      setVehicleResult(null);
      setError(err instanceof Error ? err.message : "Couldn't load available vehicles.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setError("Please choose a vehicle first.");
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
        driverId: selectedVehicle.id,
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
              <SummaryItem
                label="Vehicle"
                value={
                  driver.vehicleLabel
                    ? `${driver.vehicleLabel}${driver.passengerCapacity ? ` · ${driver.passengerCapacity} seats` : ""}`
                    : "Malfranza taxi"
                }
              />
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
              setVehicleResult(null);
              setSelectedVehicle(null);
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
        <div className="relative overflow-visible rounded-3xl border border-white/10 bg-brand-green p-4 sm:p-6 md:p-8 shadow-card-hover">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-brand-sage/20 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Search available rides</h2>
                <p className="text-sm text-brand-sage mt-1">
                  Enter your trip — we’ll show every van with the regulated fare and how many guests it seats.
                </p>
              </div>
            </div>

            {!user && (
              <div className="relative mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                No account needed — fill in your details below and we’ll email you a temporary password to track your ride.
              </div>
            )}

            <form onSubmit={handleFindVehicles} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RideField label="Service Type" icon={Car} className="sm:col-span-2">
                <select
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value as (typeof SERVICE_TYPES)[number] })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {SERVICE_TYPES.map((s) => <option key={s} className="bg-brand-green-deep text-white">{s}</option>)}
                </select>
              </RideField>

              <RideField
                label="Pickup Location"
                icon={MapPin}
                className={mapTarget === "pickup" ? "ring-1 ring-brand-orange/70 border-brand-orange/50" : ""}
              >
                <PlacesAutocompleteInput
                  value={form.pickup}
                  onChange={(pickup) => {
                    setForm((f) => ({ ...f, pickup }));
                    setPickupCoords(null);
                  }}
                  onPlace={(place) => {
                    setForm((f) => ({ ...f, pickup: place.address }));
                    setPickupCoords(place.location ?? null);
                  }}
                  onFocus={() => {
                    setMapTarget("pickup");
                    setShowLocationMap(true);
                    window.requestAnimationFrame(() => {
                      document.getElementById("ride-location-map")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    });
                  }}
                  placeholder="Type address, or use map below"
                  ariaLabel="Pickup location"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </RideField>

              <RideField
                label="Drop-off Location"
                icon={MapPin}
                className={mapTarget === "dropoff" ? "ring-1 ring-brand-orange/70 border-brand-orange/50" : ""}
              >
                <PlacesAutocompleteInput
                  value={form.dropoff}
                  onChange={(dropoff) => {
                    setForm((f) => ({ ...f, dropoff }));
                    setDropoffCoords(null);
                  }}
                  onPlace={(place) => {
                    setForm((f) => ({ ...f, dropoff: place.address }));
                    setDropoffCoords(place.location ?? null);
                  }}
                  onFocus={() => {
                    setMapTarget("dropoff");
                    setShowLocationMap(true);
                    window.requestAnimationFrame(() => {
                      document.getElementById("ride-location-map")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    });
                  }}
                  placeholder="Type address, or use map below"
                  ariaLabel="Drop-off location"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </RideField>

              {/* Map sits under the location fields so focusing them always reveals it */}
              <div id="ride-location-map" className="sm:col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-sage">
                    {mapTarget === "dropoff"
                      ? "Map · click to set drop-off"
                      : "Map · click to set pickup"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMapTarget("pickup");
                        setShowLocationMap(true);
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        mapTarget === "pickup"
                          ? "bg-brand-orange text-white"
                          : "bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      Pickup pin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapTarget("dropoff");
                        setShowLocationMap(true);
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        mapTarget === "dropoff"
                          ? "bg-brand-orange text-white"
                          : "bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      Drop-off pin
                    </button>
                  </div>
                </div>
                {(showLocationMap || pickupCoords || dropoffCoords || form.pickup || form.dropoff) && (
                  <TaxiRouteMap
                    pickup={pickupCoords}
                    dropoff={dropoffCoords}
                    activeField={mapTarget}
                    onMapPick={(role, place) => {
                      if (role === "pickup") {
                        setForm((f) => ({ ...f, pickup: place.address }));
                        setPickupCoords(place.location ?? null);
                      } else {
                        setForm((f) => ({ ...f, dropoff: place.address }));
                        setDropoffCoords(place.location ?? null);
                      }
                    }}
                    className="h-64 border border-white/20 sm:h-72 md:h-80"
                  />
                )}
                {!showLocationMap && !pickupCoords && !dropoffCoords && !form.pickup && !form.dropoff && (
                  <button
                    type="button"
                    onClick={() => setShowLocationMap(true)}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-brand-green-deep/80 text-sm text-white/90 transition hover:border-brand-orange/50 hover:bg-brand-green-deep"
                  >
                    <MapPin className="h-6 w-6 text-brand-orange" />
                    <span className="font-semibold">Open map to pick locations</span>
                    <span className="text-xs text-white/60">or type an address in the fields above</span>
                  </button>
                )}
              </div>

              <RideField label="Date" icon={Calendar}>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]" />
              </RideField>
              <RideField label="Time" icon={Watch}>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]" />
              </RideField>
              <RideField label="Passengers" icon={User}>
                <select
                  value={form.passengers}
                  onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-brand-green-deep text-white">{n} passenger{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </RideField>

              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-sm text-white/70 font-medium">
                  Fixed Malfranza fares on every van — same price, pick the size you need.
                </p>
                <button type="submit" disabled={searching} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-orange/20 hover:-translate-y-0.5 hover:brightness-105 transition disabled:opacity-60">
                  {searching ? "Finding vehicles…" : <>Find available vehicles <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>

              {error && !vehicleResult && <p className="sm:col-span-2 text-sm text-red-200">{error}</p>}
            </form>
          </div>
        </div>
      </section>

      {vehicleResult && (
        <section id="available-vehicles" className="mx-auto mt-8 max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-brand-charcoal sm:text-2xl">Available vehicles</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {form.pickup} → {form.dropoff}
                {vehicleResult.distanceKm != null ? ` · ~${vehicleResult.distanceKm} km` : ""}
                {vehicleResult.durationMinutes != null ? ` · ~${vehicleResult.durationMinutes} min` : ""}
                {" · "}
                {form.passengers} passenger{form.passengers > 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-brand-green">
              Regulated fare ${Number(vehicleResult.fare).toFixed(0)} {vehicleResult.currency}
            </div>
          </div>

          {vehicleResult.vehicles.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-card">
              No vehicles are listed yet. Please check back shortly.
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleResult.vehicles.map((vehicle) => (
                <VehicleOfferCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  currency={vehicleResult.currency}
                  selected={selectedVehicle?.id === vehicle.id}
                  onSelect={() => {
                    if (vehicle.isAvailable && vehicle.fitsParty) {
                      setSelectedVehicle(vehicle);
                      setError(null);
                      window.requestAnimationFrame(() => {
                        document.getElementById("confirm-ride")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}

          {selectedVehicle && (
            <form
              id="confirm-ride"
              onSubmit={handleSubmit}
              className="mt-6 scroll-mt-24 rounded-3xl border border-border bg-white p-5 shadow-card sm:p-6"
            >
              <h3 className="text-lg font-bold text-brand-charcoal">Confirm your ride</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedVehicle.vehicleLabel} · up to {selectedVehicle.passengerCapacity} guests · $
                {Number(selectedVehicle.fare).toFixed(0)} {vehicleResult.currency}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    placeholder="Jane Doe"
                    className="mt-1 w-full bg-transparent text-sm text-brand-charcoal outline-none"
                  />
                </label>
                <label className="block rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    readOnly={!!user}
                    maxLength={255}
                    placeholder="you@example.com"
                    className="mt-1 w-full bg-transparent text-sm text-brand-charcoal outline-none read-only:opacity-80"
                  />
                </label>
                <label className="block rounded-xl border border-border bg-slate-50 px-4 py-3 sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</span>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={40}
                    placeholder="+1 246 000 0000"
                    className="mt-1 w-full bg-transparent text-sm text-brand-charcoal outline-none"
                  />
                </label>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Free cancellation up to 12 hours before pickup.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-orange/20 transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60"
                >
                  {submitting ? "Booking…" : <>Book {selectedVehicle.vehicleLabel} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

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

function VehicleOfferCard({
  vehicle,
  currency,
  selected,
  onSelect,
}: {
  vehicle: PublicTaxiVehicle;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const selectable = vehicle.isAvailable && vehicle.fitsParty;
  const status = !vehicle.fitsParty
    ? "Too small for your party"
    : !vehicle.isAvailable
      ? "Booked for this date"
      : "Available now";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!selectable}
      className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-card transition sm:p-5 ${
        selected
          ? "border-brand-orange ring-2 ring-brand-orange/30"
          : selectable
            ? "border-border hover:border-brand-green/40 hover:shadow-[var(--shadow-card-hover)]"
            : "cursor-not-allowed border-border opacity-55"
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-cream text-brand-green sm:h-16 sm:w-16">
        <Car className="h-7 w-7 sm:h-8 sm:w-8" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-brand-charcoal">{vehicle.vehicleLabel}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              selectable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Up to {vehicle.passengerCapacity} passengers
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{vehicle.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xl font-bold text-brand-green sm:text-2xl">
          ${Number(vehicle.fare).toFixed(0)}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {currency} · fixed
        </p>
      </div>
    </button>
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
