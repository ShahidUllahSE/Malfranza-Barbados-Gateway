import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Clock, Sparkles, ShieldCheck, Plane, Car, Users, MapPin, Compass, Map,
  Calendar, Watch, User, ArrowRight, CheckCircle2, HeartHandshake, DollarSign, Lock,
} from "lucide-react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import taxiHero from "@/assets/update images/Vehicle Photo (1).jpg";
import { PlacesAutocompleteInput, TaxiRouteMap, type LatLng } from "@/components/maps/PlacesAutocompleteInput";
import { VehicleOfferCard } from "@/components/taxi/VehicleOfferCard";
import {
  calculateVehicleTaxiFare,
  createTaxiBooking,
  fetchTaxiFareSettings,
  fetchTaxiVehicles,
  type PublicTaxiVehicle,
  type PublicTaxiVehiclesResult,
  type TaxiBookingResult,
  type TaxiFareSettings,
} from "@/lib/bookings";
import { capturePayPalOrder, createPayPalOrder } from "@/lib/paypal";
import { isValidTestCouponFormat, previewCheckoutCoupon } from "@/lib/coupon";
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

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function openMapFor(
  role: "pickup" | "dropoff",
  setMapTarget: (role: "pickup" | "dropoff") => void,
  setShowLocationMap: (open: boolean) => void,
) {
  setMapTarget(role);
  setShowLocationMap(true);
  window.requestAnimationFrame(() => {
    document.getElementById("ride-location-map")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });
}

function TaxiPage() {
  const search = Route.useSearch();
  const { user, refreshSession } = useUserAuth();
  const [form, setForm] = useState({
    serviceType: search.serviceType ?? SERVICE_TYPES[0],
    pickup: search.pickup ?? "",
    dropoff: search.dropoff ?? "",
    date: search.date ?? todayLocal(),
    time: search.time ?? "",
    passengers: search.passengers ?? 1,
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
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
  /** Map opens when the user taps Choose from map (inDrive-style). */
  const [showLocationMap, setShowLocationMap] = useState(false);

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
    const pickup = form.pickup.trim();
    const dropoff = form.dropoff.trim();
    if (pickup.length < 2 || dropoff.length < 2 || !form.date || !form.time) {
      setVehicleResult(null);
      setSelectedVehicle(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetchTaxiVehicles({
        passengers: form.passengers,
        pickupDate: form.date || undefined,
        pickupTime: form.time || undefined,
        pickupLocation: form.pickup.trim() || undefined,
        dropoffLocation: form.dropoff.trim() || undefined,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
      })
        .then((result) => {
          if (cancelled) return;
          setVehicleResult(result);
          setSelectedVehicle(null);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setVehicleResult(null);
          const message = err instanceof Error ? err.message : "Couldn't load available vehicles.";
          if (/route|location/i.test(message)) {
            setError(null);
            return;
          }
          setError(message);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.pickup, form.dropoff, form.passengers, form.date, form.time, pickupCoords, dropoffCoords]);

  const handleFindVehicles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup.trim() || !form.dropoff.trim()) {
      setError("Enter a pickup and drop-off — type an address or choose from the map.");
      return;
    }
    if (!form.date || !form.time) {
      setError("Choose a pickup date and time to see which vans are free.");
      return;
    }
    window.requestAnimationFrame(() => {
      document.getElementById("available-vehicles")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const rideFare = selectedVehicle
    ? Number(
        fareSettings
          ? calculateVehicleTaxiFare(
              fareSettings,
              selectedVehicle.passengerCapacity,
              vehicleResult?.distanceKm ?? 0,
            )
          : selectedVehicle.fare,
      )
    : 0;
  const ridePriced = previewCheckoutCoupon(rideFare, appliedCoupon);
  const rideAmountDue = ridePriced.amount;
  const paypalClientId = ((import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) || "").trim();

  function applyTaxiCoupon() {
    setCouponError(null);
    const raw = couponInput.trim();
    if (!raw) {
      setCouponError("Enter a coupon code");
      return;
    }
    if (!isValidTestCouponFormat(raw)) {
      setCouponError("Invalid coupon code");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(raw.toUpperCase());
    toast.success("Coupon applied — 99% off for this test checkout");
  }

  function clearTaxiCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  const handleSubmit = async (paymentReference: string) => {
    if (!selectedVehicle) {
      setError("Please choose a vehicle first.");
      return;
    }
    if (!form.date || !form.time) {
      setError("Please add pickup date and time before booking.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please add your name, email and phone so we can confirm the ride.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the booking terms to pay.");
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
        paymentStatus: "paid",
        paymentReference,
        paymentMethod: "PayPal",
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
      });
      setConfirmation(result);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      if (result.token) {
        clearAdminToken();
        clearDriverToken();
        setUserToken(result.token);
        void refreshSession().catch(() => undefined);
      }
      if (result.accountCreated) {
        toast.success("Account created — check your email for login details.");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Couldn't submit your ride request. Please try again.";
      if (/unable to calculate a route|those locations/i.test(message)) {
        setError("Couldn't complete booking. Please try again.");
        return;
      }
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream">
          <CheckCircle2 className="h-7 w-7 text-brand-green" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Ride request received</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks, {form.name} — payment received. Your taxi booking is pending confirmation. We’ll email you when it’s confirmed.
        </p>
        <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-brand-cream px-4 py-3 sm:px-5">
          <span className="text-sm text-muted-foreground">Booking reference</span>
          <span className="break-all font-mono text-sm font-bold text-brand-green sm:text-base">
            {confirmation.bookingReference}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-border p-6 text-left shadow-card">
          <h2 className="text-lg font-bold text-brand-green">Awaiting confirmation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Malfranza will confirm your booking shortly. You’ll get an email and a notification when it’s confirmed.
            Driver details are shared only after a driver is assigned.
          </p>
          <p className="mt-3 text-sm text-brand-charcoal">
            Pickup is scheduled for <strong>{form.time}</strong> on <strong>{form.date}</strong>.
          </p>
        </div>

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
              value={`$${Number(confirmation.estimatedFare).toFixed(2)} ${confirmation.currency}`}
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
                <h2 className="text-2xl font-bold text-white">Enter your route</h2>
                <p className="text-sm text-brand-sage mt-1">
                  Type an address or choose from the map. Fare is based on how many guests you enter.
                </p>
              </div>
            </div>

            <form onSubmit={handleFindVehicles} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RideField
                label="From"
                icon={MapPin}
                className={`sm:col-span-2 ${mapTarget === "pickup" && showLocationMap ? "ring-1 ring-brand-orange/70 border-brand-orange/50" : ""}`}
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
                    setMapTarget("dropoff");
                  }}
                  onFocus={() => setMapTarget("pickup")}
                  placeholder="Type pickup address"
                  ariaLabel="From"
                  className="bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  trailing={
                    <ChooseFromMapButton
                      active={mapTarget === "pickup" && showLocationMap}
                      onClick={() => openMapFor("pickup", setMapTarget, setShowLocationMap)}
                    />
                  }
                />
              </RideField>

              <RideField
                label="To"
                icon={MapPin}
                className={`sm:col-span-2 ${mapTarget === "dropoff" && showLocationMap ? "ring-1 ring-brand-orange/70 border-brand-orange/50" : ""}`}
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
                  onFocus={() => setMapTarget("dropoff")}
                  placeholder="Type drop-off address"
                  ariaLabel="To"
                  className="bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  trailing={
                    <ChooseFromMapButton
                      active={mapTarget === "dropoff" && showLocationMap}
                      onClick={() => openMapFor("dropoff", setMapTarget, setShowLocationMap)}
                    />
                  }
                />
              </RideField>

              <div className="sm:col-span-2 rounded-2xl border border-white/15 bg-white/5 p-3 sm:p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-sage">
                  Schedule your ride
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <RideField label="Pickup date" icon={Calendar}>
                    <input
                      type="date"
                      required
                      min={todayLocal()}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                    />
                  </RideField>
                  <RideField label="Pickup time" icon={Watch}>
                    <input
                      type="time"
                      required
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                    />
                  </RideField>
                  <RideField label="Passengers" icon={User}>
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
                </div>
              </div>

              {showLocationMap && (
                <div id="ride-location-map" className="sm:col-span-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-sage">
                      {mapTarget === "dropoff"
                        ? "Tap the map to set drop-off"
                        : "Tap the map to set pickup"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLocationMap(false)}
                      className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/15"
                    >
                      Hide map
                    </button>
                  </div>
                  <TaxiRouteMap
                    pickup={pickupCoords}
                    dropoff={dropoffCoords}
                    activeField={mapTarget}
                    onMapPick={(role, place) => {
                      if (role === "pickup") {
                        setForm((f) => ({ ...f, pickup: place.address }));
                        setPickupCoords(place.location ?? null);
                        setMapTarget("dropoff");
                      } else {
                        setForm((f) => ({ ...f, dropoff: place.address }));
                        setDropoffCoords(place.location ?? null);
                      }
                    }}
                    className="h-64 border border-white/20 sm:h-72 md:h-80"
                  />
                </div>
              )}

              <RideField label="Service Type" icon={Car} className="sm:col-span-2">
                <select
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value as (typeof SERVICE_TYPES)[number] })}
                  className="w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                >
                  {SERVICE_TYPES.map((s) => <option key={s} className="bg-brand-green-deep text-white">{s}</option>)}
                </select>
              </RideField>

              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                {searching && (
                  <p className="text-sm text-white/70 font-medium sm:mr-auto">Loading our vans…</p>
                )}
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-orange/20 hover:-translate-y-0.5 hover:brightness-105 transition">
                  See available vehicles <ArrowRight className="h-4 w-4" />
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
                {form.date ? ` · ${fmtRideDate(form.date)}` : ""}
                {form.time ? ` · ${form.time}` : ""}
                {vehicleResult.distanceKm != null ? ` · ~${vehicleResult.distanceKm} km` : ""}
                {vehicleResult.durationMinutes != null ? ` · ~${vehicleResult.durationMinutes} min` : ""}
                {" · "}
                {form.passengers} passenger{form.passengers > 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-brand-green">
              From $
              {Number(
                fareSettings && vehicleResult.distanceKm != null
                  ? Math.min(
                      ...vehicleResult.vehicles.map((v) =>
                        calculateVehicleTaxiFare(
                          fareSettings,
                          v.passengerCapacity,
                          vehicleResult.distanceKm,
                        ),
                      ),
                    )
                  : vehicleResult.fare,
              ).toFixed(2)}{" "}
              {vehicleResult.currency}
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
                  vehicle={{
                    ...vehicle,
                    fare:
                      fareSettings && vehicleResult.distanceKm != null
                        ? calculateVehicleTaxiFare(
                            fareSettings,
                            vehicle.passengerCapacity,
                            vehicleResult.distanceKm,
                          )
                        : vehicle.fare,
                  }}
                  currency={vehicleResult.currency}
                  passengers={form.passengers}
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
            <div
              id="confirm-ride"
              className="mt-6 scroll-mt-24 rounded-3xl border border-border bg-white p-5 shadow-card sm:p-6"
            >
              <h3 className="text-lg font-bold text-brand-charcoal">Confirm & pay</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedVehicle.vehicleLabel} · up to {selectedVehicle.passengerCapacity} guests · $
                {rideFare.toFixed(2)}{" "}
                {vehicleResult?.currency ?? "USD"}
                {` · ${form.passengers} guest${form.passengers === 1 ? "" : "s"}`}
                {form.date && form.time ? ` · ${fmtRideDate(form.date)} at ${form.time}` : ""}
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

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-brand-charcoal">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I accept the{" "}
                  <Link to="/booking-policy" className="font-semibold text-brand-green underline">
                    booking terms
                  </Link>{" "}
                  and will pay ${rideAmountDue.toFixed(2)} USD for this ride.
                </span>
              </label>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <div className="mt-4 rounded-xl border border-border bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coupon code
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    placeholder="Enter coupon"
                    disabled={!!appliedCoupon || submitting}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-green disabled:opacity-70"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={clearTaxiCoupon}
                      disabled={submitting}
                      className="h-11 shrink-0 rounded-xl border border-border px-4 text-sm font-semibold text-brand-charcoal hover:bg-white disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyTaxiCoupon}
                      disabled={submitting || !couponInput.trim()}
                      className="h-11 shrink-0 rounded-xl bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {couponError && <p className="mt-2 text-sm text-rose-700">{couponError}</p>}
                {ridePriced.couponApplied && (
                  <p className="mt-2 text-sm font-medium text-brand-green">
                    {ridePriced.discountPercent}% off · was ${ridePriced.originalAmount.toFixed(2)} · now $
                    {rideAmountDue.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center">
                <p className="max-w-md text-center text-sm text-muted-foreground">
                  Cancel 7+ days before pickup for a 50% refund; within 7 days there is no refund. Pay with PayPal to request this ride —
                  no direct booking without payment.
                </p>

                {!paypalClientId ? (
                  <p className="mt-3 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                    PayPal is not configured. Set VITE_PAYPAL_CLIENT_ID and rebuild.
                  </p>
                ) : !termsAccepted ||
                  !form.name.trim() ||
                  !form.email.trim() ||
                  !form.phone.trim() ||
                  !form.date ||
                  !form.time ? (
                  <p className="mt-3 w-full max-w-sm rounded-xl border border-border bg-slate-50 px-4 py-3 text-center text-sm text-muted-foreground">
                    Complete your details and accept the terms to enable PayPal.
                  </p>
                ) : (
                  <div
                    className={`mt-4 w-full max-w-sm ${submitting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {ridePriced.couponApplied && (
                      <p className="mb-3 text-center text-sm font-semibold text-brand-green">
                        Paying ${rideAmountDue.toFixed(2)} (99% off)
                      </p>
                    )}
                    <PayPalScriptProvider
                      options={{
                        clientId: paypalClientId,
                        currency: "USD",
                        intent: "capture",
                        components: "buttons",
                        disableFunding: "paylater",
                      }}
                    >
                      <PayPalButtons
                        style={{
                          layout: "vertical",
                          color: "gold",
                          shape: "rect",
                          label: "paypal",
                          tagline: false,
                        }}
                        disabled={submitting || rideAmountDue < 0.5}
                        forceReRender={[rideAmountDue, termsAccepted, form.passengers, appliedCoupon]}
                        createOrder={async () => {
                          try {
                            const order = await createPayPalOrder({
                              amount: rideFare,
                              currency: "USD",
                              description: "Malfranza taxi booking",
                              couponCode: appliedCoupon || undefined,
                            });
                            return order.orderId;
                          } catch (e) {
                            const message =
                              e instanceof Error ? e.message : "Could not start PayPal checkout";
                            setError(message);
                            toast.error(message);
                            throw e;
                          }
                        }}
                        onApprove={async (data) => {
                          try {
                            const capture = await capturePayPalOrder(data.orderID);
                            await handleSubmit(capture.captureId || capture.orderId);
                          } catch (e) {
                            const message =
                              e instanceof Error ? e.message : "PayPal capture failed";
                            setError(message);
                            toast.error(message);
                          }
                        }}
                        onError={(err) => {
                          console.error("[paypal]", err);
                          toast.error("PayPal cancelled or failed. Please try again.");
                        }}
                      />
                    </PayPalScriptProvider>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Secure checkout — PayPal wallet or debit/credit card. Ride is requested only after payment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {fareSettings && (
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-bold text-brand-green sm:text-xl">Rates by vehicle (USD / km)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Regulated Malfranza rates — total fare is driving distance × the rate for the van you
              choose (minimum ${Number(fareSettings.minimumFareUsd).toFixed(2)}).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  label: "XL · 7 seats",
                  value: fareSettings.fareFor5to7 ?? fareSettings.fareFor3Guests ?? 2.4,
                  active: (selectedVehicle?.passengerCapacity ?? 0) > 0 && (selectedVehicle?.passengerCapacity ?? 0) <= 7,
                },
                {
                  label: "12-seater",
                  value: fareSettings.fareFor8to10 ?? fareSettings.fareFor4PlusGuests ?? 4,
                  active: (selectedVehicle?.passengerCapacity ?? 0) > 7,
                },
              ].map((tier) => (
                <div
                  key={tier.label}
                  className={`rounded-xl px-3 py-3 text-center ${
                    tier.active ? "bg-brand-green text-white" : "bg-brand-cream/80"
                  }`}
                >
                  <div className={`text-xs font-medium uppercase tracking-wide ${tier.active ? "text-white/80" : "text-muted-foreground"}`}>
                    {tier.label}
                  </div>
                  <div className={`mt-1 text-xl font-bold ${tier.active ? "text-white" : "text-brand-green"}`}>
                    ${Number(tier.value).toFixed(2)}
                    <span className={`ml-1 text-sm font-semibold ${tier.active ? "text-white/80" : "text-muted-foreground"}`}>
                      /km
                    </span>
                  </div>
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

function fmtRideDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ChooseFromMapButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Choose from map"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
        active
          ? "bg-brand-orange text-white"
          : "bg-white/10 text-white/85 hover:bg-white/15"
      }`}
    >
      <Map className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Map</span>
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
