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
import { apiRequest, setUserToken, clearAdminToken, clearDriverToken, clearAgencyToken, getAgencyToken, getCurrentAgency } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { useUserAuth } from "@/context/UserAuthContext";
import {
  checkApartmentAvailability,
  createApartmentBooking,
  createTaxiBooking,
  fetchTaxiFareSettings,
  fetchTaxiVehicles,
  type PublicTaxiVehicle,
  type PublicTaxiVehiclesResult,
} from "@/lib/bookings";
import { VehicleOfferCard } from "@/components/taxi/VehicleOfferCard";
import { fetchAgencyCommissionRate } from "@/lib/agency";
import { registerAtCheckout } from "@/lib/user";
import { capturePayPalOrder, createPayPalOrder } from "@/lib/paypal";
import { isValidTestCouponFormat, previewCheckoutCoupon } from "@/lib/coupon";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { APARTMENTS as SEEDED_APTS } from "@/data/apartments";
import {
  averageNightly,
  catalogFromRate,
  RATE_TABLE,
  roomTypeFromBedrooms,
  staySubtotal,
} from "@/lib/pricing";
import { MALFRANZA_PROPERTY_ADDRESS } from "@/lib/googleMaps";

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
  return a.subtitle ? `${a.name} (${a.subtitle})` : a.name;
}

/* ---------------- Route ---------------- */

const searchSchema = z.object({
  apartment: z.string().optional(),
  unit: z.string().optional(),
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
  unitsExclusive: boolean;
  units: Array<{
    id: string;
    name: string;
    description: string;
    price_per_night: number;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
  }>;
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

/** ISO date one calendar day after the given YYYY-MM-DD string. */
function dayAfterISO(iso: string) {
  if (!iso) return todayISO(1);
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const MIN_NIGHTS = 1;
const MIN_NIGHTS_MESSAGE = "Minimum stay is 1 night. Choose a check-out date at least one day after check-in.";


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
  const { user, refreshSession, openAuthModal } = useUserAuth();

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
  // Multiple units can be booked together in a single booking.
  const [unitIds, setUnitIds] = useState<string[]>(
    search.unit ? search.unit.split(",").filter(Boolean) : [],
  );
  const roomLocked = !!search.apartment;

  // Taxi upsell
  const [taxiOn, setTaxiOn] = useState(false);
  const [taxiDate, setTaxiDate] = useState("");
  const [taxiTime, setTaxiTime] = useState("12:00");
  const [taxiFlight, setTaxiFlight] = useState("");
  const [taxiPassengers, setTaxiPassengers] = useState(2);
  const [airportPickupFare, setAirportPickupFare] = useState(30);
  const [taxiVehicles, setTaxiVehicles] = useState<PublicTaxiVehiclesResult | null>(null);
  const [taxiSearching, setTaxiSearching] = useState(false);
  const [selectedTaxiVehicle, setSelectedTaxiVehicle] = useState<PublicTaxiVehicle | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTaxiFareSettings()
      .then((settings) => {
        if (!cancelled) {
          setAirportPickupFare(settings.minimumFareUsd);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!taxiOn || !taxiDate || !taxiTime) {
      setTaxiVehicles(null);
      setSelectedTaxiVehicle(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setTaxiSearching(true);
      fetchTaxiVehicles({
        passengers: taxiPassengers,
        pickupDate: taxiDate,
        pickupTime: taxiTime,
        pickupLocation: "Grantley Adams International Airport (BGI), Barbados",
        dropoffLocation: MALFRANZA_PROPERTY_ADDRESS,
      })
        .then((result) => {
          if (cancelled) return;
          setTaxiVehicles(result);
          setSelectedTaxiVehicle((current) => {
            if (!current) return null;
            const next = result.vehicles.find((v) => v.id === current.id);
            return next?.isAvailable && next.fitsParty ? next : null;
          });
        })
        .catch(() => {
          if (!cancelled) setTaxiVehicles(null);
        })
        .finally(() => {
          if (!cancelled) setTaxiSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [taxiOn, taxiDate, taxiTime, taxiPassengers]);

  // Guest details + checkout path (guest | create account)
  const [checkoutPath, setCheckoutPath] = useState<"guest" | "account">("guest");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [agencyCode, setAgencyCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("mfz.agencyBookingCode") ?? "";
  });
  const [agencyCommissionPercent, setAgencyCommissionPercent] = useState(10);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  /** User chose Create account and completed password setup before pay */
  const [createdAccountAtCheckout, setCreatedAccountAtCheckout] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.name);
    setEmail(user.email);
    if (user.phone) setPhone(user.phone);
    setCheckoutPath("account");
    setPassword("");
    setConfirmPassword("");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchAgencyCommissionRate()
      .then((s) => {
        if (!cancelled) setAgencyCommissionPercent(s.defaultCommissionPercent);
      })
      .catch(() => {
        /* keep 10% fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill agency code from signed-in travel agent or last-used local code.
  useEffect(() => {
    if (!getAgencyToken()) return;
    getCurrentAgency()
      .then((a) => {
        setAgencyCode(a.agencyCode);
        localStorage.setItem("mfz.agencyBookingCode", a.agencyCode);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (agencyCode.trim()) {
      localStorage.setItem("mfz.agencyBookingCode", agencyCode.trim().toUpperCase());
    }
  }, [agencyCode]);

  // Payment / confirmation
  const [paying, setPaying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    ref: string;
    taxiRef?: string;
    taxiDriverName?: string;
    taxiVehicle?: string | null;
    taxiEtaMins?: number | null;
    accountCreated?: boolean;
    guestEmail?: string;
    createdAccountAtCheckout?: boolean;
  } | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const selectedApt = apartments.find((a) => a.id === apartmentId) || null;
  const selectedUnits = selectedApt
    ? selectedApt.units.filter((unit) => unitIds.includes(unit.id))
    : [];
  const pricedType =
    selectedUnits.length > 0
      ? roomTypeFromBedrooms(selectedUnits[0]!.bedrooms)
      : selectedApt
        ? roomTypeFromBedrooms(selectedApt.bedrooms)
        : "one-bedroom";
  const roomTotal =
    selectedApt && nights > 0 && checkIn && checkOut
      ? staySubtotal(pricedType, checkIn, checkOut)
      : 0;
  const selectedRate =
    checkIn && checkOut && nights > 0
      ? averageNightly(pricedType, checkIn, checkOut)
      : catalogFromRate(pricedType);

  const pickupFee = taxiOn
    ? Number(selectedTaxiVehicle?.fare ?? taxiVehicles?.fare ?? airportPickupFare)
    : 0;
  const bundleDiscount = taxiOn ? Math.round(roomTotal * 0.05) : 0;
  const total = Math.max(0, roomTotal + pickupFee - bundleDiscount);

  // Fetch apartments once
  useEffect(() => {
    (async () => {
      setLoadingApts(true);
      try {
        const data = await apiRequest<any[]>("/apartments?sort=price-asc");
        const list: Apartment[] = data.map((apartment) => {
          const units = (apartment.units ?? [])
            .filter((unit: any) => unit.isActive !== false)
            .map((unit: any) => {
              const bedrooms = Number(unit.bedrooms) || 1;
              return {
                id: String(unit._id),
                name: unit.name,
                description: "",
                price_per_night: catalogFromRate(roomTypeFromBedrooms(bedrooms)),
                max_guests: unit.maxGuests,
                bedrooms,
                bathrooms: unit.bathrooms,
              };
            });
          const typeRate = catalogFromRate(
            roomTypeFromBedrooms(Number(apartment.bedrooms) || 1),
          );
          return {
            id: apartment._id,
            slug: apartment.slug,
            name: apartment.name,
            subtitle: null,
            description: null,
            price_per_night:
              units.length > 0
                ? Math.min(...units.map((unit: Apartment["units"][number]) => unit.price_per_night))
                : typeRate,
            max_guests: apartment.maxGuests,
            bedrooms: apartment.bedrooms,
            photos: apartment.photos ?? [],
            unitsExclusive: Boolean(apartment.unitsExclusive),
            units,
          };
        });
        setApartments(list);
        if (search.apartment) {
          const match = list.find((a) => a.slug === search.apartment);
          if (match) setApartmentId(match.id);
        }
      } catch {
        toast.error("Couldn't load apartments. Try again.");
      }
      setLoadingApts(false);
    })();
  }, [search.apartment]);

  // Check availability whenever dates are set (needed for locked-room path too)
  useEffect(() => {
    if (apartments.length === 0 || nights === 0) return;
    if (step < 1 && !roomLocked) return;
    let cancelled = false;
    (async () => {
      setCheckingAvail(true);
      const results: Availability = {};
      await Promise.all(
        apartments.map(async (a) => {
          try {
            if (a.units.length > 0) {
              const unitResults = await Promise.all(
                a.units.map(async (unit) => {
                  const available = await checkApartmentAvailability(
                    a.id,
                    checkIn,
                    checkOut,
                    unit.id,
                  );
                  results[`${a.id}:${unit.id}`] = available;
                  return available;
                }),
              );
              results[a.id] = unitResults.some(Boolean);
            } else {
              results[a.id] = await checkApartmentAvailability(a.id, checkIn, checkOut);
            }
          } catch {
            results[a.id] = false;
          }
        }),
      );
      if (!cancelled) {
        setAvailability(results);
        // If pre-selected room becomes unavailable, clear it (unless room is locked — keep selection and block continue)
        if (!roomLocked && apartmentId && results[apartmentId] === false) {
          setApartmentId(null);
          setUnitIds([]);
        }
      }
      setCheckingAvail(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, apartments.length, checkIn, checkOut, roomLocked]);

  // Default taxi date to check-in when taxi enabled
  useEffect(() => {
    if (taxiOn && !taxiDate) setTaxiDate(checkIn);
  }, [taxiOn, taxiDate, checkIn]);

  /* ---- Step validation ---- */
  // false when any part of the current selection is booked for the chosen dates
  const selectionUnavailable = (() => {
    if (!selectedApt) return false;
    if (selectedApt.units.length > 0) {
      if (selectedUnits.length === 0) return availability[selectedApt.id] === false;
      return selectedUnits.some(
        (unit) => availability[`${selectedApt.id}:${unit.id}`] === false,
      );
    }
    return availability[selectedApt.id] === false;
  })();
  const lockedUnavailable = roomLocked && !!selectedApt && selectionUnavailable;

  const canContinue = useMemo(() => {
    if (step === 0) {
      if (!(nights >= 1 && guests >= 1)) return false;
      if (roomLocked && apartmentId) {
        if (checkingAvail) return false;
        if (selectionUnavailable) return false;
      }
      return true;
    }
    if (step === 1) {
      if (!selectedApt) return false;
      if (selectedApt.units.length > 0 && selectedUnits.length === 0) return false;
      return !selectionUnavailable;
    }
    // Room selection was confirmed earlier — do not re-block later steps on availability
    // (pay still rechecks occupancy on submit).
    if (step === 2) {
      if (!apartmentId || !selectedApt) return false;
      if (selectedApt.units.length > 0 && selectedUnits.length === 0) return false;
      return !taxiOn || (!!taxiDate && !!taxiTime && taxiPassengers >= 1 && !!selectedTaxiVehicle);
    }
    if (step === 3) {
      const basics =
        fullName.trim().length >= 2 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
        phone.trim().length >= 6;
      if (!basics) return false;
      // Already signed in — ready for payment
      if (user) return true;
      if (checkoutPath === "account") {
        return password.length >= 8 && password === confirmPassword;
      }
      return true;
    }
    // Payment step: never greyed out for details/availability — only Wait while paying
    if (step === 4) return true;
    return true;
  }, [
    step, nights, guests, apartmentId, selectedUnits, selectedApt, selectionUnavailable,
    checkingAvail, roomLocked,
    taxiOn, taxiDate, taxiTime, taxiPassengers, selectedTaxiVehicle, fullName, email, phone,
    user, checkoutPath, password, confirmPassword,
  ]);

  const goNext = async () => {
    if (!canContinue) return;

    if (step === 2 && taxiOn && !selectedTaxiVehicle) {
      toastError("Select an available van, or continue without pickup.");
      return;
    }

    if (step === 3 && checkoutPath === "account" && !user) {
      if (password.length < 8) {
        toastError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        toastError("Passwords do not match");
        return;
      }
      setAccountBusy(true);
      try {
        await registerAtCheckout({
          name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
        await refreshSession();
        setCreatedAccountAtCheckout(true);
        toastSuccess("Account created", "You're signed in. Continue to payment.");
        setPassword("");
        setConfirmPassword("");
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
      } catch (e: unknown) {
        toastError(e instanceof Error ? e.message : "Could not create account");
      } finally {
        setAccountBusy(false);
      }
      return;
    }

    if (roomLocked && step === 0 && selectedApt?.units.length === 0) {
      if (!apartmentId || availability[apartmentId] === false) {
        toast.error("This apartment is already booked for those dates. Pick different dates.");
        return;
      }
      setStep(2);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - (roomLocked && s === 2 ? 2 : 1)));
  };

  /* ---- After successful PayPal capture ---- */
  async function completeBookingAfterPayment(paymentReference: string) {
    if (!selectedApt) return;
    if (!termsAccepted) {
      toastError("Please accept the booking terms to continue.");
      return;
    }
    if (selectionUnavailable) {
      toast.error("This unit is already booked for those dates. Choose different dates.");
      setStep(0);
      return;
    }
    setPaying(true);
    try {
      const booking = await createApartmentBooking({
        apartmentId: selectedApt.id,
        unitIds: selectedUnits.length > 0 ? selectedUnits.map((unit) => unit.id) : undefined,
        guestName: fullName.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        checkIn,
        checkOut,
        guests,
        specialRequests: requests.trim() || undefined,
        agencyCode: agencyCode.trim() ? agencyCode.trim().toUpperCase() : undefined,
        paymentStatus: "paid",
        paymentReference,
        taxi: taxiOn
          ? {
              pickup: "Grantley Adams Intl. Airport (BGI)",
              dropoff: MALFRANZA_PROPERTY_ADDRESS,
              date: taxiDate,
              time: taxiTime,
              passengers: taxiPassengers,
              distanceKm: 0,
              fare: pickupFee,
              notes: taxiFlight ? `Flight: ${taxiFlight}` : undefined,
            }
          : undefined,
      });

      const ref = booking.bookingReference;

      // Auto-sign-in guest after booking so My Bookings works immediately
      if (booking.token) {
        clearAdminToken();
        clearDriverToken();
        clearAgencyToken();
        setUserToken(booking.token);
        await refreshSession().catch(() => undefined);
      }

      // Also record a taxi_bookings entry so it appears in Taxi Trips admin
      let taxiRef: string | undefined;
      let taxiDriverName: string | undefined;
      let taxiVehicle: string | null | undefined;
      let taxiEtaMins: number | null | undefined;
      if (taxiOn) {
        try {
          const taxi = await createTaxiBooking({
            serviceType: "Airport Pickup",
            pickupLocation: "Grantley Adams Intl. Airport (BGI)",
            dropoffLocation: MALFRANZA_PROPERTY_ADDRESS,
            pickupDate: taxiDate,
            pickupTime: taxiTime,
            passengers: taxiPassengers,
            customerName: fullName.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            notes: `Bundled with stay ${ref}${taxiFlight ? ` · Flight ${taxiFlight}` : ""}`,
            driverId: selectedTaxiVehicle?.id,
            paymentStatus: "paid",
            paymentReference,
            paymentMethod: "PayPal",
          });
          taxiRef = taxi.bookingReference;
          taxiDriverName = taxi.driver?.name;
          taxiVehicle = taxi.driver?.vehicleLabel ?? null;
          taxiEtaMins = taxi.durationMinutes;
          if (taxi.token) {
            clearAdminToken();
            clearDriverToken();
            setUserToken(taxi.token);
            await refreshSession().catch(() => undefined);
          }
        } catch {
          toast.warning("Your stay was booked, but the taxi request needs manual confirmation.");
        }
      }

      // Persist reference locally so /my-bookings can show it
      try {
        const key = "mfz.myBookings";
        const raw = localStorage.getItem(key);
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(ref)) list.unshift(ref);
        localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
        const emailKey = "mfz.bookingEmails";
        const emailMap = JSON.parse(localStorage.getItem(emailKey) || "{}") as Record<string, string>;
        emailMap[ref] = email.trim().toLowerCase();
        localStorage.setItem(emailKey, JSON.stringify(emailMap));
      } catch {
        /* ignore storage errors */
      }

      setConfirmation({
        ref,
        taxiRef,
        taxiDriverName,
        taxiVehicle,
        taxiEtaMins,
        accountCreated: booking.accountCreated,
        guestEmail: email.trim().toLowerCase(),
        createdAccountAtCheckout,
      });
      setStep(STEPS.length - 1);

      const guestEmail = email.trim().toLowerCase();
      if (createdAccountAtCheckout) {
        toastSuccess(
          "Booking confirmed",
          `You're signed in with the password you chose. Confirmation sent to ${guestEmail}.`,
        );
      } else if (booking.accountCreated) {
        toastSuccess(
          "Account details emailed",
          `We sent login details to ${guestEmail}. Check your inbox (and spam folder).`,
        );
      } else {
        toastSuccess(
          "Booking confirmed",
          `A confirmation was sent to ${guestEmail}. Open My Bookings anytime while signed in.`,
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      toastError(msg);
      if (/unavailable|already booked|409/i.test(msg)) {
        setStep(0);
      }
    } finally {
      setPaying(false);
    }
  }

  const paypalClientId = ((import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) || "").trim();

  /* ---- Confirmation screen ---- */
  if (confirmation) {
    return (
      <ConfirmationScreen
        ref_={confirmation.ref}
        taxiRef={confirmation.taxiRef}
        taxiDriverName={confirmation.taxiDriverName}
        taxiVehicle={confirmation.taxiVehicle}
        taxiEtaMins={confirmation.taxiEtaMins}
        accountCreated={confirmation.accountCreated}
        guestEmail={confirmation.guestEmail}
        createdAccountAtCheckout={confirmation.createdAccountAtCheckout}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-green">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="text-sm text-muted-foreground">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</div>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-brand-green sm:text-3xl">Complete your booking</h1>

        {/* Progress */}
        <ProgressBar step={step} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          {/* Summary — shown first on mobile */}
          <BookingSummary
            apt={selectedApt}
            unitNames={selectedUnits.map((unit) => unit.name)}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            guests={guests}
            roomTotal={roomTotal}
            nightlyRate={selectedRate}
            taxiOn={taxiOn}
            pickupFee={pickupFee}
            bundleDiscount={bundleDiscount}
            total={total}
            step={step}
            canContinue={canContinue}
            accountBusy={accountBusy}
            onContinue={() => void goNext()}
            className="order-first lg:order-last"
          />

          {/* Main step card */}
          <div className="order-last rounded-2xl border border-border bg-white p-5 shadow-card sm:p-7 lg:order-first">
            {lockedUnavailable && (
              <div className="mb-5 rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-sm text-brand-charcoal">
                This apartment is already booked for these dates. Change check-in / check-out to continue, or choose another stay.
              </div>
            )}

            {/* Actions at top of form — always visible without scrolling the full step */}
            <div className="sticky top-0 z-10 -mx-5 mb-6 border-b border-border bg-white/95 px-5 pb-4 backdrop-blur sm:-mx-7 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green transition hover:bg-brand-cream disabled:opacity-40 sm:px-5"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={!canContinue || accountBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-40 sm:px-6"
                  >
                    {accountBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {step === 3 ? "Continue to payment" : "Continue"}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
                {step === 4 && (
                  <p className="text-xs text-muted-foreground sm:text-right">
                    Use PayPal below to complete your booking.
                  </p>
                )}
              </div>
            </div>

            {step === 0 && (
              <StepDates
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                nights={nights}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                setGuests={setGuests}
                checkingAvail={roomLocked && checkingAvail}
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
                unitIds={unitIds}
                selectApartment={(nextApartmentId) => {
                  setApartmentId(nextApartmentId);
                  setUnitIds([]);
                }}
                toggleUnit={(nextApartmentId, toggledUnitId) => {
                  const apt = apartments.find((a) => a.id === nextApartmentId);
                  if (apt?.unitsExclusive) {
                    setApartmentId(nextApartmentId);
                    setUnitIds([toggledUnitId]);
                    return;
                  }
                  if (apartmentId !== nextApartmentId) {
                    setApartmentId(nextApartmentId);
                    setUnitIds([toggledUnitId]);
                    return;
                  }
                  setUnitIds((current) =>
                    current.includes(toggledUnitId)
                      ? current.filter((id) => id !== toggledUnitId)
                      : [...current, toggledUnitId],
                  );
                }}
                setUnits={(nextApartmentId, nextUnitIds) => {
                  const apt = apartments.find((a) => a.id === nextApartmentId);
                  if (apt?.unitsExclusive) {
                    setApartmentId(nextApartmentId);
                    setUnitIds(nextUnitIds.slice(0, 1));
                    return;
                  }
                  setApartmentId(nextApartmentId);
                  setUnitIds(nextUnitIds);
                }}
              />
            )}
            {step === 2 && (
              <StepTaxi
                taxiOn={taxiOn}
                setTaxiOn={(on) => {
                  setTaxiOn(on);
                  if (!on) setSelectedTaxiVehicle(null);
                }}
                taxiDate={taxiDate}
                setTaxiDate={setTaxiDate}
                taxiTime={taxiTime}
                setTaxiTime={setTaxiTime}
                taxiFlight={taxiFlight}
                setTaxiFlight={setTaxiFlight}
                taxiPassengers={taxiPassengers}
                setTaxiPassengers={setTaxiPassengers}
                pickupFee={pickupFee}
                vehicles={taxiVehicles}
                searching={taxiSearching}
                selectedVehicle={selectedTaxiVehicle}
                onSelectVehicle={setSelectedTaxiVehicle}
                onSkipPickup={() => {
                  setTaxiOn(false);
                  setSelectedTaxiVehicle(null);
                  setStep((s) => Math.min(STEPS.length - 1, s + 1));
                }}
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
                agencyCode={agencyCode}
                setAgencyCode={setAgencyCode}
                agencyCommissionPercent={agencyCommissionPercent}
                emailLocked={!!user}
                signedIn={!!user}
                signedInEmail={user?.email}
                checkoutPath={checkoutPath}
                setCheckoutPath={setCheckoutPath}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onSignIn={() =>
                  openAuthModal({ mode: "signin", reason: "Sign in to book with your account" })
                }
              />
            )}
            {step === 4 && (
              <StepPayment
                total={total}
                paying={paying}
                setPaying={setPaying}
                onPaid={completeBookingAfterPayment}
                guestName={fullName}
                termsAccepted={termsAccepted}
                setTermsAccepted={setTermsAccepted}
                apt={selectedApt}
                nights={nights}
                guests={guests}
                checkIn={checkIn}
                checkOut={checkOut}
                paypalClientId={paypalClientId}
              />
            )}
          </div>
        </div>

        {/* Mobile total bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-brand-green">{money(total)}</p>
            </div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={!canContinue || accountBusy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {accountBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    {step === 3 ? "To payment" : "Continue"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            ) : (
              <p className="max-w-[55%] text-right text-xs text-muted-foreground">
                {termsAccepted
                  ? "Use PayPal above to pay safely"
                  : "Accept terms, then pay with PayPal above"}
              </p>
            )}
          </div>
        </div>
        <div className="pb-20 lg:pb-0" />
      </div>
    </div>
  );
}

/* ---------------- Progress ---------------- */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-brand-green lg:hidden">
        Step {step + 1} of {STEPS.length}: {STEPS[step].label}
      </p>
      <div className="mt-2 flex items-center gap-1 sm:gap-2 lg:mt-0 lg:gap-3">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 lg:gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition sm:h-9 sm:w-9 ${
                done
                  ? "bg-brand-green border-brand-green text-white"
                  : active
                  ? "bg-brand-orange border-brand-orange text-white"
                  : "bg-white border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </div>
            <span className={`hidden lg:block min-w-0 truncate text-xs font-semibold ${active ? "text-brand-orange" : done ? "text-brand-green" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 min-w-[8px] flex-1 rounded-full ${done ? "bg-brand-green" : "bg-border"}`} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ---------------- Step 1: Dates ---------------- */

function StepDates(props: {
  checkIn: string; checkOut: string; guests: number; nights: number;
  setCheckIn: (v: string) => void; setCheckIn2?: never;
  setCheckOut: (v: string) => void; setGuests: (n: number) => void;
  checkingAvail?: boolean;
}) {
  const { checkIn, checkOut, guests, nights, setCheckIn, setCheckOut, setGuests, checkingAvail } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">When are you visiting?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose your check-in and check-out dates.</p>
      {checkingAvail && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking if this apartment is free…
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Check-in">
          <input
            type="date"
            value={checkIn}
            min={todayISO(0)}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                setCheckOut(dayAfterISO(e.target.value));
              }
            }}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-green"
          />
        </Field>
        <Field label="Check-out">
          <input
            type="date"
            value={checkOut}
            min={checkIn ? dayAfterISO(checkIn) : todayISO(1)}
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
          {nights < MIN_NIGHTS && checkIn && checkOut && (
            <p className="mt-2 text-sm text-brand-orange" role="alert">
              {MIN_NIGHTS_MESSAGE}
            </p>
          )}
          {nights < MIN_NIGHTS && checkIn && !checkOut && (
            <p className="mt-2 text-sm text-muted-foreground">
              Minimum stay is 1 night.
            </p>
          )}
        </Field>
      </div>

      {nights >= MIN_NIGHTS && (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-brand-green">
          <CalendarIcon className="h-4 w-4" /> {nights} night{nights>1?"s":""} in Haggatt Hall
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 2: Room ---------------- */

function StepRoom(props: {
  apartments: Apartment[]; loading: boolean; checkingAvail: boolean;
  availability: Availability; nights: number;
  apartmentId: string | null;
  unitIds: string[];
  selectApartment: (apartmentId: string) => void;
  toggleUnit: (apartmentId: string, unitId: string) => void;
  setUnits: (apartmentId: string, unitIds: string[]) => void;
}) {
  const {
    apartments,
    loading,
    checkingAvail,
    availability,
    nights,
    apartmentId,
    unitIds,
    selectApartment,
    toggleUnit,
    setUnits,
  } = props;
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
          <p className="mt-1 text-sm text-muted-foreground">
            Room rates: 1-BR ${RATE_TABLE["one-bedroom"]} · 2-BR ${RATE_TABLE["two-bedroom"]}.
            All-in — PayPal fee included.
          </p>
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
          const aptSelectedUnits = apartmentId === a.id
            ? a.units.filter((unit) => unitIds.includes(unit.id))
            : [];
          const selected = apartmentId === a.id && (a.units.length === 0 || aptSelectedUnits.length > 0);
          const availableUnits = a.units.filter(
            (unit) => availability[`${a.id}:${unit.id}`] !== false,
          );
          const allUnitsSelected =
            !a.unitsExclusive &&
            a.units.length > 0 &&
            availableUnits.length === a.units.length &&
            aptSelectedUnits.length === a.units.length;
          const pricedType =
            aptSelectedUnits.length > 0
              ? roomTypeFromBedrooms(aptSelectedUnits[0]!.bedrooms)
              : roomTypeFromBedrooms(a.bedrooms);
          const nightly = catalogFromRate(pricedType);
          const total = nightly * nights;
          return (
            <li key={a.id}>
              <div
                role={a.units.length === 0 ? "button" : undefined}
                tabIndex={a.units.length === 0 && !unavailable ? 0 : undefined}
                aria-disabled={unavailable}
                onClick={() => {
                  if (!unavailable && a.units.length === 0) selectApartment(a.id);
                }}
                onKeyDown={(event) => {
                  if (
                    !unavailable &&
                    a.units.length === 0 &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    selectApartment(a.id);
                  }
                }}
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
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
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
                          {a.name}
                        </h3>
                      </div>
                      {selected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-bold text-white">
                          <Check className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </div>
                    {a.units.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-charcoal">
                            {a.unitsExclusive
                              ? "Choose configuration"
                              : "Choose units (select one or more)"}
                          </p>
                          {!a.unitsExclusive && availableUnits.length > 1 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setUnits(
                                  a.id,
                                  allUnitsSelected ? [] : availableUnits.map((unit) => unit.id),
                                );
                              }}
                              className="text-xs font-semibold text-brand-orange hover:underline"
                            >
                              {allUnitsSelected ? "Clear selection" : "Book entire apartment"}
                            </button>
                          )}
                        </div>
                        {a.units.map((unit) => {
                          const unitUnavailable = availability[`${a.id}:${unit.id}`] === false;
                          const unitSelected = apartmentId === a.id && unitIds.includes(unit.id);
                          const unitRate = catalogFromRate(roomTypeFromBedrooms(unit.bedrooms));
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              disabled={unitUnavailable}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleUnit(a.id, unit.id);
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${
                                unitSelected
                                  ? "border-brand-green bg-brand-sage/15"
                                  : unitUnavailable
                                    ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                                    : "border-slate-200 hover:border-brand-green/50"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                                    unitSelected
                                      ? "border-brand-green bg-brand-green text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {unitSelected && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <span>
                                  <span className="block text-sm font-semibold text-brand-charcoal">
                                    {unit.name}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {unit.bedrooms} bedroom{unit.bedrooms > 1 ? "s" : ""} · up to{" "}
                                    {unit.max_guests} guests · from ${unitRate}/night
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-sm font-bold text-brand-green">
                                  {money(unitRate * Math.max(nights, 1))}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {unitUnavailable ? "Booked" : "Available"}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        {a.unitsExclusive && (
                          <p className="text-xs text-muted-foreground">
                            One- and two-bedroom share inventory — booking either blocks the other.
                          </p>
                        )}
                      </div>
                    )}

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
                        From <span className="text-lg font-bold text-brand-green">{money(nightly)}</span>/night
                      </span>
                      {nights > 0 && (
                        <span className="text-sm font-semibold text-brand-charcoal">
                          ~{money(total)} for {nights} night{nights>1?"s":""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
  pickupFee: number;
  vehicles: PublicTaxiVehiclesResult | null;
  searching: boolean;
  selectedVehicle: PublicTaxiVehicle | null;
  onSelectVehicle: (vehicle: PublicTaxiVehicle) => void;
  onSkipPickup: () => void;
}) {
  const {
    taxiOn, setTaxiOn, taxiDate, setTaxiDate, taxiTime, setTaxiTime,
    taxiFlight, setTaxiFlight, taxiPassengers, setTaxiPassengers, pickupFee,
    vehicles, searching, selectedVehicle, onSelectVehicle, onSkipPickup,
  } = props;
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">Add airport pickup?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Skip the taxi line — we'll meet you at arrivals.</p>

      <div className={`mt-5 rounded-2xl border-2 p-4 transition sm:p-5 ${taxiOn ? "border-brand-orange bg-brand-orange/5" : "border-border bg-white"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <Plane className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-brand-green">Add airport pickup and save 5% on your stay</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {money(pickupFee)} for {taxiPassengers} guest{taxiPassengers > 1 ? "s" : ""} · reliable driver, on-time meet & greet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaxiOn(!taxiOn)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${taxiOn ? "bg-brand-orange" : "bg-border"}`}
                aria-pressed={taxiOn}
                aria-label={taxiOn ? "Remove airport pickup" : "Add airport pickup"}
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
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>

      {taxiOn && taxiDate && taxiTime && (
        <div className="mt-5 space-y-3">
          <div>
            <h3 className="text-base font-bold text-brand-charcoal">Choose a vehicle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Same as Taxi Service — a booked van is held for 1 hour, then it can be booked again.
            </p>
          </div>
          {searching && (
            <p className="text-sm text-muted-foreground">Loading available vans…</p>
          )}
          {!searching && vehicles && vehicles.vehicles.length === 0 && (
            <p className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
              No vehicles fit this party size. Try fewer passengers, or continue without pickup.
            </p>
          )}
          {!searching && vehicles && vehicles.vehicles.length > 0 && (
            <div className="space-y-3">
              {vehicles.vehicles.map((vehicle) => (
                <VehicleOfferCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  currency={vehicles.currency}
                  passengers={taxiPassengers}
                  selected={selectedVehicle?.id === vehicle.id}
                  onSelect={() => {
                    if (vehicle.isAvailable && vehicle.fitsParty) onSelectVehicle(vehicle);
                  }}
                />
              ))}
            </div>
          )}
          {taxiOn && !selectedVehicle && !searching && vehicles && vehicles.vehicles.some((v) => v.isAvailable) && (
            <p className="text-sm text-brand-orange">Select an available van to continue.</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSkipPickup}
        className="mt-4 cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-brand-green"
      >
        No thanks, continue without pickup
      </button>
    </div>
  );
}

/* ---------------- Step 4: Details ---------------- */

function StepDetails(props: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  requests: string;
  setRequests: (v: string) => void;
  agencyCode: string;
  setAgencyCode: (v: string) => void;
  agencyCommissionPercent?: number;
  emailLocked?: boolean;
  signedIn?: boolean;
  signedInEmail?: string;
  checkoutPath: "guest" | "account";
  setCheckoutPath: (v: "guest" | "account") => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onSignIn: () => void;
}) {
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    requests,
    setRequests,
    agencyCode,
    setAgencyCode,
    agencyCommissionPercent = 10,
    emailLocked,
    signedIn,
    signedInEmail,
    checkoutPath,
    setCheckoutPath,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    onSignIn,
  } = props;

  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">How would you like to check out?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Continue as a guest or create an account.
      </p>

      {signedIn ? (
        <div className="mt-5 rounded-xl border border-brand-green/25 bg-brand-green/5 px-4 py-3 text-sm text-brand-charcoal">
          <p className="font-semibold text-brand-green">Signed in as {signedInEmail}</p>
          <p className="mt-1 text-muted-foreground">
            This stay will be saved to your account. Confirmation goes to your email.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setCheckoutPath("guest")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              checkoutPath === "guest"
                ? "border-brand-green bg-brand-green/5 ring-2 ring-brand-green/20"
                : "border-border bg-white hover:border-brand-sage"
            }`}
          >
            <p className="text-sm font-bold text-brand-green">Continue as guest</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Book now, no password needed. We&apos;ll email your confirmation and a secure link so
              you can view your booking anytime.
            </p>
            {checkoutPath === "guest" && (
              <span className="mt-3 inline-block text-xs font-semibold text-brand-green">
                Selected · Continue as guest →
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCheckoutPath("account")}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              checkoutPath === "account"
                ? "border-brand-green bg-brand-green/5 ring-2 ring-brand-green/20"
                : "border-border bg-white hover:border-brand-sage"
            }`}
          >
            <p className="text-sm font-bold text-brand-green">Create an account</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Save your details for faster booking next time, and manage all your stays and rides in
              one place.
            </p>
            {checkoutPath === "account" && (
              <span className="mt-3 inline-block text-xs font-semibold text-brand-green">
                Selected · Create account →
              </span>
            )}
          </button>
        </div>
      )}

      {!signedIn && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="font-semibold text-brand-green underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={emailLocked}
            placeholder="you@email.com"
            className={`mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand-green ${emailLocked ? "bg-brand-cream/50 text-muted-foreground" : "bg-white"}`}
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 246 000 0000"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          />
        </Field>
        {!signedIn && checkoutPath === "account" && (
          <>
            <Field label="Password">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
              />
            </Field>
          </>
        )}
        <div className="sm:col-span-2">
          <Field label="Travel agency code (optional)">
            <input
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
              placeholder="AG-XXXXXXXX"
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-green"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Travel agents: enter the code issued by Malfranza admin to attribute this booking
              and earn {agencyCommissionPercent}% commission.
            </p>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Special requests (optional)">
            <textarea
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              rows={3}
              placeholder="Late check-in, dietary notes, etc."
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-green"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 5: Payment (PayPal Sandbox / Live) ---------------- */

function StepPayment(props: {
  total: number;
  paying: boolean;
  setPaying: (v: boolean) => void;
  onPaid: (paymentReference: string) => void | Promise<void>;
  guestName: string;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  apt: Apartment | null;
  nights: number;
  guests: number;
  checkIn: string;
  checkOut: string;
  paypalClientId: string;
}) {
  const {
    total,
    paying,
    setPaying,
    onPaid,
    termsAccepted,
    setTermsAccepted,
    apt,
    paypalClientId,
  } = props;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const priced = previewCheckoutCoupon(total, appliedCoupon);
  const amountDue = priced.amount;

  function applyCoupon() {
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
    toastSuccess("Coupon applied — 99% off for this test checkout");
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-brand-green">Payment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pay securely with PayPal or debit/credit card.
      </p>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-3.5 py-3.5 text-sm text-brand-charcoal">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-green accent-brand-green focus:ring-brand-green/30"
        />
        <span className="leading-relaxed text-muted-foreground">
          By completing, I agree to Malfranza&apos;s{" "}
          <Link
            to="/booking-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-green underline underline-offset-2 hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            booking terms
          </Link>
          .
        </span>
      </label>

      <div className="mt-4 rounded-2xl border border-border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            disabled={!!appliedCoupon || paying}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15 disabled:opacity-70"
          />
          {appliedCoupon ? (
            <button
              type="button"
              onClick={clearCoupon}
              disabled={paying}
              className="h-11 shrink-0 rounded-xl border border-border px-4 text-sm font-semibold text-brand-charcoal hover:bg-slate-50 disabled:opacity-60"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={applyCoupon}
              disabled={paying || !couponInput.trim()}
              className="h-11 shrink-0 rounded-xl bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              Apply
            </button>
          )}
        </div>
        {couponError && <p className="mt-2 text-sm text-rose-700">{couponError}</p>}
        {priced.couponApplied && (
          <p className="mt-2 text-sm font-medium text-brand-green">
            {priced.discountPercent}% off applied ({priced.code})
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-brand-green/20 bg-brand-cream/50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount due
            </p>
            {priced.couponApplied ? (
              <div className="mt-0.5">
                <p className="text-sm text-muted-foreground line-through">{money(priced.originalAmount)}</p>
                <p className="text-2xl font-bold text-brand-green">{money(amountDue)}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-brand-green">{money(amountDue)}</p>
            )}
          </div>
          {paying && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming payment…
            </span>
          )}
        </div>

        {!paypalClientId ? (
          <p className="text-sm text-red-700">
            Missing <code className="text-xs">VITE_PAYPAL_CLIENT_ID</code> in frontend{" "}
            <code className="text-xs">.env</code> — add the Sandbox Client ID and restart Vite.
          </p>
        ) : !termsAccepted ? (
          <p className="text-sm text-muted-foreground">
            Accept the booking terms above to enable PayPal.
          </p>
        ) : (
          <div className={paying ? "pointer-events-none opacity-60" : undefined}>
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
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal", tagline: false }}
                disabled={paying || amountDue < 0.5}
                forceReRender={[amountDue, termsAccepted, appliedCoupon]}
                createOrder={async () => {
                  try {
                    const order = await createPayPalOrder({
                      amount: total,
                      currency: "USD",
                      description: apt
                        ? `Malfranza stay — ${apt.name}`
                        : "Malfranza apartment booking",
                      couponCode: appliedCoupon || undefined,
                    });
                    return order.orderId;
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error
                        ? e.message
                        : "Could not start PayPal checkout";
                    toastError(msg);
                    throw e;
                  }
                }}
                onApprove={async (data) => {
                  try {
                    setPaying(true);
                    const capture = await capturePayPalOrder(data.orderID);
                    await onPaid(capture.captureId || capture.orderId);
                  } catch (e: unknown) {
                    setPaying(false);
                    toastError(e instanceof Error ? e.message : "PayPal capture failed");
                  }
                }}
                onError={(err) => {
                  console.error("[paypal]", err);
                  toastError("PayPal cancelled or failed. Please try again.");
                  setPaying(false);
                }}
                onCancel={() => {
                  toastError("Payment cancelled");
                  setPaying(false);
                }}
              />
            </PayPalScriptProvider>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Secure checkout — PayPal wallet or debit/credit card
        </p>
      </div>
    </div>
  );
}

/* ---------------- Summary Sidebar ---------------- */

function BookingSummary(props: {
  apt: Apartment | null; unitNames?: string[]; checkIn: string; checkOut: string; nights: number; guests: number;
  roomTotal: number; nightlyRate: number;
  taxiOn: boolean; pickupFee: number; bundleDiscount: number; total: number;
  step: number;
  canContinue: boolean;
  accountBusy: boolean;
  onContinue: () => void;
  className?: string;
}) {
  const {
    apt, unitNames, checkIn, checkOut, nights, guests, roomTotal, nightlyRate,
    taxiOn, pickupFee, bundleDiscount, total,
    step, canContinue, accountBusy, onContinue, className,
  } = props;
  const continueLabel = step === 3 ? "Continue to payment" : "Continue";

  return (
    <aside className={`h-fit rounded-2xl border border-border bg-white p-5 shadow-card lg:sticky lg:top-6 ${className ?? ""}`}>
      <h3 className="text-base font-bold text-brand-green">Booking summary</h3>

      {apt ? (
        <div className="mt-3 flex gap-3">
          <img src={aptImage(apt.slug, apt.photos)} alt={displayName(apt)} className="h-16 w-16 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-charcoal">{apt.name}</p>
            {apt.subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{apt.subtitle}</p>
            ) : null}
            {unitNames && unitNames.length > 0 && (
              <p className="mt-0.5 text-xs font-medium text-brand-green">
                {unitNames.join(" + ")}
              </p>
            )}
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
        <SummaryRow
          label={
            nights > 0
              ? `${nights} night${nights > 1 ? "s" : ""} × ${money(nightlyRate)}/night`
              : "Room"
          }
        >
          {apt ? money(roomTotal) : "—"}
        </SummaryRow>
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

      {step < 4 && (
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || accountBusy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {accountBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {continueLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}
      {step === 4 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Complete payment with PayPal in the form.
        </p>
      )}
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
  ref_: string;
  taxiRef?: string;
  taxiDriverName?: string;
  taxiVehicle?: string | null;
  taxiEtaMins?: number | null;
  accountCreated?: boolean;
  guestEmail?: string;
  createdAccountAtCheckout?: boolean;
  apt: Apartment | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  taxi: { date: string; time: string; passengers: number; flight: string } | null;
}) {
  const {
    ref_,
    taxiRef,
    taxiDriverName,
    taxiVehicle,
    taxiEtaMins,
    accountCreated,
    guestEmail,
    createdAccountAtCheckout,
    apt,
    checkIn,
    checkOut,
    nights,
    guests,
    total,
    taxi,
  } = props;
  const eta = taxiEtaMins ?? 25;

  const confirmCopy = createdAccountAtCheckout
    ? `You're booked! Your confirmation is on its way to ${guestEmail || "your email"}. You can view and manage this booking anytime under My Bookings.`
    : accountCreated
      ? `You're booked! Your confirmation is on its way to ${guestEmail || "your email"}. Check your inbox for a link to view or manage this booking under My Bookings.`
      : `You're booked! Your confirmation is on its way to ${guestEmail || "your email"}. You can view and manage this booking anytime under My Bookings.`;

  return (
    <div className="min-h-screen bg-brand-cream/40 py-14">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-card">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-brand-green">You&apos;re booked!</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{confirmCopy}</p>

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
                  {taxiDriverName ? (
                    <>
                      <SummaryRow label="Driver">{taxiDriverName}</SummaryRow>
                      <SummaryRow label="Vehicle">{taxiVehicle || "Malfranza taxi"}</SummaryRow>
                      <SummaryRow label="Approx. trip time">~{eta} min</SummaryRow>
                    </>
                  ) : (
                    <SummaryRow label="Driver">Matching a free driver…</SummaryRow>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/my-bookings/$reference"
              params={{ reference: ref_ }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white hover:brightness-105 transition"
            >
              View booking details
            </Link>
            <Link to="/my-bookings" className="inline-flex items-center gap-2 rounded-full border border-brand-green px-5 py-2.5 text-sm font-semibold text-brand-green hover:bg-brand-cream transition">
              My Bookings
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-brand-charcoal hover:bg-brand-cream transition">
              Back to home
            </Link>
          </div>
        </div>
      </div>
      {/* silence unused import warning */}
      <X className="hidden" />
    </div>
  );
}
