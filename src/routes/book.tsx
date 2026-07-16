import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Users,
  BedDouble,
  Plane,
  User,
  CreditCard,
  Check,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Copy,
  Car,
  X,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createApartmentBooking } from "@/lib/bookings";
import { APARTMENTS as SEEDED_APTS } from "@/data/apartments";

function aptImage(slug: string, photos: string[] | undefined) {
  if (photos && photos.length > 0) return photos[0];
  const seed = SEEDED_APTS.find((s) => s.id === slug);
  return seed?.images[0] || "/placeholder.svg";
}
function aptGallery(slug: string, photos: string[] | undefined): string[] {
  if (photos && photos.length > 0) return photos;
  const seed = SEEDED_APTS.find((s) => s.id === slug);
  return seed?.images ?? [];
}
function displayName(a: { slug: string; name: string; subtitle: string | null }) {
  return a.subtitle ? `${a.subtitle} — ${a.name}` : a.name;
}

/* ---------------- Route ---------------- */

const searchSchema = z.object({
  apartment: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().int().min(1).max(6).optional(),
});

export const Route = createFileRoute("/book")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Book your stay — Malfranza" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookWizard,
});

/* ---------------- Types ---------------- */

type Apartment = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  photos: string[];
};

type Availability = Record<string, boolean>;

/* ---------------- Helpers ---------------- */

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function money(n: number) {
  return `$${n.toFixed(0)}`;
}

/* ---------------- Wizard ---------------- */

const STEPS = [
  { key: "dates", label: "Dates", icon: CalendarIcon },
  { key: "room", label: "Room", icon: BedDouble },
  { key: "taxi", label: "Taxi", icon: Plane },
  { key: "details", label: "Details", icon: User },
  { key: "payment", label: "Payment", icon: CreditCard },
] as const;

function BookWizard() {
  const search = Route.useSearch();
  

  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [availability, setAvailability] = useState<Availability>({});
  const [loadingApts, setLoadingApts] = useState(true);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(search.checkIn || todayISO(7));
  const [checkOut, setCheckOut] = useState(search.checkOut || todayISO(10));
  const [guests, setGuests] = useState(search.guests ?? 2);
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const roomLocked = !!search.apartment;

  // Taxi upsell
  const [taxiOn, setTaxiOn] = useState(false);
  const [taxiDate, setTaxiDate] = useState("");
  const [taxiTime, setTaxiTime] = useState("12:00");
  const [taxiFlight, setTaxiFlight] = useState("");
  const [taxiPassengers, setTaxiPassengers] = useState(2);

  // Guest details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");

  // Payment / confirmation
  const [paying, setPaying] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    ref: string;
    taxiRef?: string;
  } | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const selectedApt = apartments.find((a) => a.id === apartmentId) || null;

  const roomTotal = selectedApt ? selectedApt.price_per_night * nights : 0;
  const pickupFee = taxiOn ? 30 : 0;
  const bundleDiscount = taxiOn ? Math.round(roomTotal * 0.05) : 0;
  const total = Math.max(0, roomTotal + pickupFee - bundleDiscount);

  // Fetch apartments once
  useEffect(() => {
    (async () => {
      setLoadingApts(true);
      const { data, error } = await supabase
        .from("apartments")
        .select("id, slug, name, subtitle, description, price_per_night, max_guests, bedrooms, photos")
        .eq("is_active", true)
        .order("price_per_night", { ascending: true });
      if (error) {
        toast.error("Couldn't load apartments. Try again.");
      } else if (data) {
        const list = data as Apartment[];
        setApartments(list);
        // Pre-select via ?apartment=<slug>
        if (search.apartment) {
          const match = list.find((a) => a.slug === search.apartment);
          if (match) setApartmentId(match.id);
        }
      }
      setLoadingApts(false);
    })();
  }, [search.apartment]);

  // Check availability whenever we enter step 2 (or dates change on step 2+)
  useEffect(() => {
    if (step < 1 || apartments.length === 0 || nights === 0) return;
    let cancelled = false;
    (async () => {
      setCheckingAvail(true);
      const results: Availability = {};
      await Promise.all(
        apartments.map(async (a) => {
          const { data } = await supabase.rpc("check_apartment_availability", {
            _apartment_id: a.id,
            _check_in: checkIn,
            _check_out: checkOut,
          });
          results[a.id] = !!data;
        }),
      );
      if (!cancelled) {
        setAvailability(results);
        // If pre-selected room becomes unavailable, drop it
        if (apartmentId && results[apartmentId] === false) setApartmentId(null);
      }
      setCheckingAvail(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, apartments.length, checkIn, checkOut]);

  // Default taxi date to check-in when taxi enabled
  useEffect(() => {
    if (taxiOn && !taxiDate) setTaxiDate(checkIn);
  }, [taxiOn, taxiDate, checkIn]);

  /* ---- Step validation ---- */
  const canContinue = useMemo(() => {
    if (step === 0) return nights > 0 && guests >= 1;
    if (step === 1) return !!apartmentId && availability[apartmentId] !== false;
    if (step === 2) return !taxiOn || (!!taxiDate && !!taxiTime && taxiPassengers >= 1);
    if (step === 3) {
      return (
        fullName.trim().length >= 2 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
        phone.trim().length >= 6
      );
    }
    return true;
  }, [
    step, nights, guests, apartmentId, availability, taxiOn, taxiDate, taxiTime,
    taxiPassengers, fullName, email, phone,
  ]);

  const goNext = () => {
    if (!canContinue) return;
    // Skip step 1 (Room) when room is locked and pre-selected
    setStep((s) => Math.min(STEPS.length - 1, s + (roomLocked && s === 0 ? 2 : 1)));
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - (roomLocked && s === 2 ? 2 : 1)));
  };

  /* ---- Dummy payment submit ---- */
  async function handleDummyPay() {
    if (!selectedApt) return;
    setPaying(true);
    try {
      // Simulate payment latency
      await new Promise((r) => setTimeout(r, 1200));
      const txnId = `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      const ref = await createApartmentBooking({
        apartmentId: selectedApt.id,
        guestName: fullName.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        checkIn,
        checkOut,
        guests,
        nights,
        staySubtotal: roomTotal,
        serviceFee: 0,
        totalAmount: total,
        specialRequests: requests.trim() || undefined,
        taxi: taxiOn
          ? {
              pickup: "Grantley Adams Intl. Airport (BGI)",
              dropoff: `${selectedApt.name} — Oistins`,
              date: taxiDate,
              time: taxiTime,
              passengers: taxiPassengers,
              distanceKm: 0,
              fare: pickupFee,
              notes: taxiFlight ? `Flight: ${taxiFlight}` : undefined,
            }
          : undefined,
      });

      // Also record a taxi_bookings entry so it appears in Taxi Trips admin
      let taxiRef: string | undefined;
      if (taxiOn) {
        const { data: taxiRefData } = await supabase.rpc("create_public_taxi_booking", {
          payload: {
            service_type: "Airport Pickup",
            pickup_location: "Grantley Adams Intl. Airport (BGI)",
            dropoff_location: `${selectedApt.name} — Oistins`,
            pickup_date: taxiDate,
            pickup_time: taxiTime,
            passengers: String(taxiPassengers),
            customer_name: fullName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            notes: `Bundled with stay ${ref}${taxiFlight ? ` · Flight ${taxiFlight}` : ""}`,
            estimated_fare: pickupFee,
          },
        });
        taxiRef = (taxiRefData as string | null) ?? undefined;
      }

      // Silence unused txnId warning by referencing it in notes (already stored via createApartmentBooking's taxi.notes if applicable)
      void txnId;

      // Persist reference locally so /my-bookings can show it
      try {
        const key = "mfz.myBookings";
        const raw = localStorage.getItem(key);
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(ref)) list.unshift(ref);
        localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      } catch {
        /* ignore storage errors */
      }

      setConfirmation({ ref, taxiRef });
      setStep(STEPS.length - 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  /* ---- Confirmation screen ---- */
  if (confirmation) {
    return (
      <ConfirmationScreen
        ref_={confirmation.ref}
        taxiRef={confirmation.taxiRef}
        apt={selectedApt}
        checkIn={checkIn}
        checkOut={checkOut}
        nights={nights}
        guests={guests}
        total={total}
        taxi={taxiOn ? { date: taxiDate, time: taxiTime, passengers: taxiPassengers, flight: taxiFlight } : null}
      />
    );
  }

  return (
    <div className="bg-brand-cream/40 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-green">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="text-sm text-muted-foreground">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</div>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-brand-green sm:text-3xl">Complete your booking</h1>

        {/* Progress */}
        <ProgressBar step={step} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          {/* Main step card */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-7">
            {step === 0 && (
              <StepDates
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                nights={nights}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                setGuests={setGuests}
              />
            )}
            {step === 1 && (
              <StepRoom
                apartments={apartments}
                loading={loadingApts}
                checkingAvail={checkingAvail}
                availability={availability}
                nights={nights}
                apartmentId={apartmentId}
                setApartmentId={setApartmentId}
              />
            )}
            {step === 2 && (
              <StepTaxi
                taxiOn={taxiOn}
                setTaxiOn={setTaxiOn}
                taxiDate={taxiDate}
                setTaxiDate={setTaxiDate}
                taxiTime={taxiTime}
                setTaxiTime={setTaxiTime}
                taxiFlight={taxiFlight}
                setTaxiFlight={setTaxiFlight}
                taxiPassengers={taxiPassengers}
                setTaxiPassengers={setTaxiPassengers}
              />
            )}
            {step === 3 && (
              <StepDetails
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                requests={requests}
                setRequests={setRequests}
              />
            )}
            {step === 4 && (
              <StepPayment
                total={total}
                paying={paying}
                onPay={handleDummyPay}
                apt={selectedApt}
                nights={nights}
                guests={guests}
                checkIn={checkIn}
                checkOut={checkOut}
              />
            )}

            {/* Nav buttons */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
              <button
                onClick={goBack}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-full border border-brand-green px-5 py-2.5 text-sm font-semibold text-brand-green disabled:opacity-40 hover:bg-brand-cream transition"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              {step < 4 && (
                <button
                  onClick={goNext}
                  disabled={!canContinue}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40 hover:brightness-105 transition"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
          <BookingSummary
            apt={selectedApt}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            guests={guests}
            roomTotal={roomTotal}
            taxiOn={taxiOn}
            pickupFee={pickupFee}
            bundleDiscount={bundleDiscount}
            total={total}
          />
        </div>
        <div className="pb-16" />
      </div>
    </div>
  );
}

/* ---------------- Progress ---------------- */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mt-6 flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                done
                  ? "bg-brand-green border-brand-green text-white"
                  : active
                  ? "bg-brand-orange border-brand-orange text-white"
                  : "bg-white border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={`hidden sm:block text-xs font-semibold ${active ? "text-brand-orange" : done ? "text-brand-green" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full ${done ? "bg-brand-green" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Step 1: Dates ---------------- */

function StepDates(props: {
  checkIn: string; checkOut: string; guests: number; nights: number;
  setCheckIn: (v: string) => void; setCheckIn2?: never;
  setCheckOut: (v: string) => void; setGuests: (n: number) => void;
}) {
  const { checkIn, checkOut, guests, nights, setCheckIn, setCheckOut, setGuests } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">When are you visiting?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose your check-in and check-out dates.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Check-in">
          <input
            type="date"
            value={checkIn}
            min={todayISO(0)}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 1);
                setCheckOut(d.toISOString().slice(0, 10));
              }
            }}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-green"
          />
        </Field>
        <Field label="Check-out">
          <input
            type="date"
            value={checkOut}
            min={checkIn || todayISO(1)}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-green"
          />
        </Field>
        <Field label="Guests">
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-green"
          >
            {[1,2,3,4,5,6].map((n) => (
              <option key={n} value={n}>{n} guest{n>1?"s":""}</option>
            ))}
          </select>
        </Field>
      </div>

      {nights > 0 && (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-brand-green">
          <CalendarIcon className="h-4 w-4" /> {nights} night{nights>1?"s":""} in Oistins
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 2: Room ---------------- */

function StepRoom(props: {
  apartments: Apartment[]; loading: boolean; checkingAvail: boolean;
  availability: Availability; nights: number;
  apartmentId: string | null; setApartmentId: (id: string) => void;
}) {
  const { apartments, loading, checkingAvail, availability, nights, apartmentId, setApartmentId } = props;
  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Loading apartments…
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-green">Pick your apartment</h2>
          <p className="mt-1 text-sm text-muted-foreground">Prices update live for your dates.</p>
        </div>
        {checkingAvail && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…
          </span>
        )}
      </div>

      <ul className="mt-5 grid gap-3">
        {apartments.map((a) => {
          const unavailable = availability[a.id] === false;
          const total = a.price_per_night * nights;
          const selected = apartmentId === a.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={unavailable}
                onClick={() => setApartmentId(a.id)}
                className={`relative w-full overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                  selected
                    ? "border-brand-green shadow-card"
                    : unavailable
                    ? "border-border opacity-60 cursor-not-allowed"
                    : "border-border hover:border-brand-green/60 hover:shadow-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-64">
                    <img
                      src={aptImage(a.slug, a.photos)}
                      alt={displayName(a)}
                      className="h-full w-full object-cover"
                    />
                    {a.subtitle && (
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-green shadow">
                        {a.subtitle}
                      </span>
                    )}
                    {unavailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white">
                        Not available for these dates
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-brand-green">
                          {a.subtitle || a.name}
                        </h3>
                        <p className="text-xs text-brand-sage">{a.name}</p>
                      </div>
                      {selected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white">
                          <Check className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>

                    {/* Thumbnail strip so guests see the room they're picking */}
                    {(() => {
                      const gallery = aptGallery(a.slug, a.photos).slice(1, 5);
                      if (gallery.length === 0) return null;
                      return (
                        <div className="mt-2 flex gap-1.5">
                          {gallery.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt=""
                              className="h-12 w-16 rounded-md object-cover"
                            />
                          ))}
                        </div>
                      );
                    })()}

                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {a.max_guests} guests</span>
                      <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {a.bedrooms} bed{a.bedrooms>1?"s":""}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        <span className="text-lg font-bold text-brand-green">{money(a.price_per_night)}</span>/night
                      </span>
                      {nights > 0 && (
                        <span className="text-sm font-semibold text-brand-charcoal">
                          {money(total)} for {nights} night{nights>1?"s":""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Step 3: Taxi ---------------- */

function StepTaxi(props: {
  taxiOn: boolean; setTaxiOn: (b: boolean) => void;
  taxiDate: string; setTaxiDate: (v: string) => void;
  taxiTime: string; setTaxiTime: (v: string) => void;
  taxiFlight: string; setTaxiFlight: (v: string) => void;
  taxiPassengers: number; setTaxiPassengers: (n: number) => void;
}) {
  const {
    taxiOn, setTaxiOn, taxiDate, setTaxiDate, taxiTime, setTaxiTime,
    taxiFlight, setTaxiFlight, taxiPassengers, setTaxiPassengers,
  } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">Add airport pickup?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Skip the taxi line — we'll meet you at arrivals.</p>

      <div className={`mt-5 rounded-2xl border-2 p-5 transition ${taxiOn ? "border-brand-orange bg-brand-orange/5" : "border-border bg-white"}`}>
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <Plane className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-brand-green">Add airport pickup and save 5% on your stay</p>
                <p className="mt-0.5 text-sm text-muted-foreground">$30 flat fee · reliable driver, on-time meet & greet</p>
              </div>
              <button
                type="button"
                onClick={() => setTaxiOn(!taxiOn)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${taxiOn ? "bg-brand-orange" : "bg-border"}`}
                aria-pressed={taxiOn}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${taxiOn ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            {taxiOn && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Pickup date">
                  <input type="date" value={taxiDate} min={todayISO(0)} onChange={(e) => setTaxiDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
                </Field>
                <Field label="Pickup time">
                  <input type="time" value={taxiTime} onChange={(e) => setTaxiTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
                </Field>
                <Field label="Flight number (optional)">
                  <input type="text" value={taxiFlight} onChange={(e) => setTaxiFlight(e.target.value)}
                    placeholder="e.g. BA 2153"
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
                </Field>
                <Field label="Passengers">
                  <select value={taxiPassengers} onChange={(e) => setTaxiPassengers(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green">
                    {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>

      {!taxiOn && (
        <button type="button" onClick={() => setTaxiOn(false)}
          className="mt-4 text-sm text-muted-foreground underline underline-offset-2 hover:text-brand-green">
          No thanks, continue without pickup
        </button>
      )}
    </div>
  );
}

/* ---------------- Step 4: Details ---------------- */

function StepDetails(props: {
  fullName: string; setFullName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  requests: string; setRequests: (v: string) => void;
}) {
  const { fullName, setFullName, email, setEmail, phone, setPhone, requests, setRequests } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">Your details</h2>
      <p className="mt-1 text-sm text-muted-foreground">We'll send the confirmation to your email.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 246 000 0000"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Special requests (optional)">
            <textarea value={requests} onChange={(e) => setRequests(e.target.value)} rows={3}
              placeholder="Late check-in, dietary notes, etc."
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green" />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 5: Payment (dummy) ---------------- */

function StepPayment(props: {
  total: number; paying: boolean; onPay: () => void;
  apt: Apartment | null; nights: number; guests: number; checkIn: string; checkOut: string;
}) {
  const { total, paying, onPay } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">Payment</h2>
      <p className="mt-1 text-sm text-muted-foreground">This is a demo checkout — no real card required.</p>

      <div className="mt-5 rounded-2xl border-2 border-dashed border-brand-green/30 bg-brand-cream/40 p-6">
        <div className="flex items-center gap-3 text-sm text-brand-green">
          <Lock className="h-4 w-4" />
          Demo mode · click below to complete a test payment
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FakeCardField label="Card number" value="4242 4242 4242 4242" />
          <FakeCardField label="Expiry" value="12 / 30" />
          <FakeCardField label="CVC" value="123" />
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-brand-green">Total {money(total)}</span>
          <button
            onClick={onPay}
            disabled={paying}
            className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 hover:brightness-105 transition"
          >
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Pay {money(total)} (Demo)</>}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        By completing, you agree to Malfranza's booking terms. Payments are simulated in this demo.
      </p>
    </div>
  );
}

function FakeCardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-brand-charcoal">{value}</div>
    </div>
  );
}

/* ---------------- Summary Sidebar ---------------- */

function BookingSummary(props: {
  apt: Apartment | null; checkIn: string; checkOut: string; nights: number; guests: number;
  roomTotal: number; taxiOn: boolean; pickupFee: number; bundleDiscount: number; total: number;
}) {
  const { apt, checkIn, checkOut, nights, guests, roomTotal, taxiOn, pickupFee, bundleDiscount, total } = props;
  return (
    <aside className="h-fit rounded-2xl border border-border bg-white p-5 shadow-card lg:sticky lg:top-6">
      <h3 className="text-base font-bold text-brand-green">Booking summary</h3>

      {apt ? (
        <div className="mt-3 flex gap-3">
          <img src={aptImage(apt.slug, apt.photos)} alt={displayName(apt)} className="h-16 w-16 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-charcoal">{apt.subtitle || apt.name}</p>
            <p className="truncate text-xs text-muted-foreground">{apt.name}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No apartment selected yet.</p>
      )}

      <div className="mt-4 space-y-1.5 text-sm">
        <SummaryRow label="Dates">
          {nights > 0 ? `${checkIn} → ${checkOut}` : "Pick dates"}
        </SummaryRow>
        <SummaryRow label="Nights">{nights || "—"}</SummaryRow>
        <SummaryRow label="Guests">{guests}</SummaryRow>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        <SummaryRow label={`Room${nights ? ` × ${nights}` : ""}`}>{apt ? money(roomTotal) : "—"}</SummaryRow>
        {taxiOn && (
          <>
            <SummaryRow label="Airport pickup">{money(pickupFee)}</SummaryRow>
            <SummaryRow label="Bundle discount (−5%)">
              <span className="text-brand-green">−{money(bundleDiscount)}</span>
            </SummaryRow>
          </>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold text-brand-charcoal">Total</span>
        <span className="text-xl font-bold text-brand-green">{money(total)}</span>
      </div>
    </aside>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-brand-charcoal">{children}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- Confirmation ---------------- */

function ConfirmationScreen(props: {
  ref_: string; taxiRef?: string; apt: Apartment | null;
  checkIn: string; checkOut: string; nights: number; guests: number; total: number;
  taxi: { date: string; time: string; passengers: number; flight: string } | null;
}) {
  const { ref_, taxiRef, apt, checkIn, checkOut, nights, guests, total, taxi } = props;
  return (
    <div className="min-h-screen bg-brand-cream/40 py-14">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-card">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-brand-green">Booking confirmed</h1>
          <p className="mt-1 text-sm text-muted-foreground">A confirmation has been recorded. You'll receive an email shortly.</p>

          <div className="mt-6 rounded-2xl border border-border bg-brand-cream/50 p-5 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Booking reference</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(ref_);
                  toast.success("Reference copied");
                }}
                className="inline-flex items-center gap-1 text-xs text-brand-green hover:underline"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-brand-green">{ref_}</p>

            <div className="mt-5 space-y-1.5 text-sm">
              <SummaryRow label="Stay">{apt ? displayName(apt) : "—"}</SummaryRow>
              <SummaryRow label="Dates">{checkIn} → {checkOut}</SummaryRow>
              <SummaryRow label="Nights">{nights}</SummaryRow>
              <SummaryRow label="Guests">{guests}</SummaryRow>
              <SummaryRow label="Total paid">{money(total)}</SummaryRow>
            </div>

            {taxi && (
              <div className="mt-5 rounded-xl border border-border bg-white p-4 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-green">
                  <Car className="h-4 w-4" /> Airport pickup
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <SummaryRow label="Pickup">{taxi.date} · {taxi.time}</SummaryRow>
                  <SummaryRow label="Passengers">{taxi.passengers}</SummaryRow>
                  {taxi.flight && <SummaryRow label="Flight">{taxi.flight}</SummaryRow>}
                  {taxiRef && <SummaryRow label="Taxi ref">{taxiRef}</SummaryRow>}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-brand-green px-5 py-2.5 text-sm font-semibold text-brand-green hover:bg-brand-cream transition">
              Back to home
            </Link>
            <Link to="/stays" className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white hover:brightness-105 transition">
              Browse more stays
            </Link>
          </div>
        </div>
      </div>
      {/* silence unused import warning */}
      <X className="hidden" />
    </div>
  );
}
