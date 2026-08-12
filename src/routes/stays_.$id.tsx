import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Users, BedDouble, Bath, Ruler, Shield, ChevronRight, ChevronLeft,
  Wind, Wifi, Tv, ChefHat, Refrigerator, Microwave, Flame, Coffee,
  ShowerHead, Droplets, Sparkles, Shirt, BellRing, Car, Brush, Headphones,
  Images, BadgeCheck, HeartHandshake, CalendarCheck, Snowflake, Briefcase,
  X,
  type LucideIcon,
} from "lucide-react";
import { fetchApartment } from "@/data/apartments";
import { uniquePhotoUrls } from "@/lib/photos";
import {
  checkApartmentAvailability,
  fetchApartmentOccupancy,
  type ApartmentOccupancy,
} from "@/lib/bookings";
import {
  averageNightly,
  catalogFromRate,
  roomTypeFromApartmentType,
  roomTypeFromBedrooms,
} from "@/lib/pricing";
import { AreaMap } from "@/components/maps/AreaMap";
import { OISTINS_CENTER } from "@/lib/googleMaps";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/stays_/$id")({
  loader: async ({ params }) => {
    const apt = await fetchApartment(params.id);
    if (!apt) throw notFound();
    return { apt };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Apartment not found — Malfranza" }, { name: "robots", content: "noindex" }] };
    }
    const { apt } = loaderData;
    const title = `${apt.name} — Malfranza`;
    return {
      meta: [
        { title },
        { name: "description", content: `${apt.name} in Oistins, Barbados. From $${apt.pricePerNight}/night.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `${apt.name} · From $${apt.pricePerNight}/night` },
        { property: "og:image", content: apt.images[0] },
      ],
    };
  },
  notFoundComponent: NotFound,
  component: ApartmentDetailPage,
});

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold">Apartment not found</h1>
      <p className="mt-3 text-muted-foreground">We couldn't find that apartment in our listings.</p>
      <Link to="/stays" className="mt-6 inline-flex rounded-full bg-brand-green px-6 py-3 text-white">
        Back to Stays
      </Link>
    </div>
  );
}

const AMENITY_ICONS: Record<string, LucideIcon> = {
  "Wi-Fi": Wifi,
  Wifi: Wifi,
  "Free Wi-Fi": Wifi,
  "Air Conditioning": Snowflake,
  "Smart TV": Tv,
  TV: Tv,
  Kitchen: ChefHat,
  "Fully Equipped Kitchen": ChefHat,
  Refrigerator: Refrigerator,
  Microwave: Microwave,
  "Stove & Oven": Flame,
  "Coffee Maker": Coffee,
  "Private Bathroom": Bath,
  Bathroom: Bath,
  "Walk-in Shower": ShowerHead,
  "Hot Water": Droplets,
  "Fresh Towels": Sparkles,
  "Linens Provided": BedDouble,
  "Iron & Ironing Board": Shirt,
  "Hair Dryer": Wind,
  "Smoke Detector": BellRing,
  Parking: Car,
  "Free Parking": Car,
  "Daily Housekeeping": Brush,
  "24/7 Support": Headphones,
  Workspace: Briefcase,
  Kettle: Coffee,
  "Washer/Dryer": Shirt,
};

function amenityIcon(label: string): LucideIcon {
  return AMENITY_ICONS[label] ?? Sparkles;
}

function ApartmentDetailPage() {
  const { apt } = Route.useLoaderData();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, apt.guests));
  // Unit selection: exclusive configs are single-choice (1-BR vs full 2-BR).
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(
    apt.units.length === 1 ? [apt.units[0].id] : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [occupancy, setOccupancy] = useState<ApartmentOccupancy | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    setViewerIndex(0);
  }, [apt.id]);

  useEffect(() => {
    let cancelled = false;
    fetchApartmentOccupancy()
      .then((items) => {
        if (cancelled) return;
        setOccupancy(items.find((item) => item.slug === apt.id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setOccupancy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apt.id]);

  /** Strict unique list — one image once for this apartment. */
  const photos = useMemo(
    () => uniquePhotoUrls(apt.images.length > 0 ? apt.images : ["/placeholder.svg"]),
    [apt.images],
  );

  /** Rest of the grid after the hero — never re-shows photos[0]. */
  const sidePhotos = useMemo(() => photos.slice(1, 5), [photos]);

  const openViewer = (index: number) => {
    if (photos.length === 0) return;
    const next = ((index % photos.length) + photos.length) % photos.length;
    setViewerIndex(next);
    setViewerOpen(true);
  };

  const stepViewer = (delta: number) => {
    setViewerIndex((current) => (current + delta + photos.length) % photos.length);
  };

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepViewer(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepViewer(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, photos.length]);

  const blockedRanges = occupancy?.blockedRanges ?? [];
  const selectedUnits = apt.units.filter((unit) => selectedUnitIds.includes(unit.id));
  const pricedType =
    selectedUnits.length > 0
      ? roomTypeFromBedrooms(selectedUnits[0]!.bedrooms)
      : roomTypeFromApartmentType(apt.type);
  const combinedPrice =
    checkIn && checkOut
      ? averageNightly(pricedType, checkIn, checkOut)
      : catalogFromRate(pricedType);
  const combinedMaxGuests =
    selectedUnits.length > 0
      ? apt.unitsExclusive
        ? selectedUnits[0]!.maxGuests
        : selectedUnits.reduce((sum, unit) => sum + unit.maxGuests, 0)
      : apt.guests;

  useEffect(() => {
    setGuests((current) => Math.min(current, combinedMaxGuests));
  }, [combinedMaxGuests]);
  const amenities = apt.amenities.length > 0
    ? apt.amenities
    : ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV"];

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      setError("Please choose check-in and check-out dates.");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Minimum stay is 1 night. Choose a check-out date at least one day after check-in.");
      return;
    }
    if (!apt.mongoId) {
      setError("This apartment is not available right now.");
      return;
    }
    if (apt.units.length > 0 && selectedUnitIds.length === 0) {
      setError(
        apt.unitsExclusive
          ? "Please choose the one-bedroom or two-bedroom option."
          : "Please choose which unit(s) you want to book.",
      );
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const available = await checkApartmentAvailability(
        apt.mongoId,
        checkIn,
        checkOut,
        selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
      );
      if (!available) {
        setError("Not available for these dates — try adjusting your stay.");
        return;
      }
      navigate({
        to: "/book",
        search: {
          apartment: apt.id,
          unit: selectedUnitIds.length > 0 ? selectedUnitIds.join(",") : undefined,
          checkIn,
          checkOut,
          guests,
        },
      });
    } catch {
      setError("Couldn't check availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-white pb-8 lg:pb-0">
      <nav className="mx-auto max-w-7xl px-4 pt-6 text-sm text-muted-foreground sm:px-6 sm:pt-8 lg:px-8">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-brand-green">Home</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5 shrink-0" /></li>
          <li><Link to="/stays" className="hover:text-brand-green">Stays</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5 shrink-0" /></li>
          <li className="min-w-0 truncate font-medium text-brand-green">
            {apt.name}{apt.subtitle ? ` · ${apt.subtitle}` : ""}
          </li>
        </ol>
      </nav>

      {/* Gallery — click any photo to open the full viewer */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-2xl sm:rounded-3xl md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-[420px] lg:h-[520px]">
            <button
              type="button"
              onClick={() => openViewer(0)}
              className="h-full w-full cursor-zoom-in"
              aria-label={`View ${apt.name} photos`}
            >
              <img
                src={photos[0]}
                alt={`${apt.name} main view`}
                className="h-full w-full object-cover transition duration-300 hover:brightness-95"
              />
            </button>
            <button
              type="button"
              onClick={() => openViewer(0)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium text-brand-green shadow-card hover:bg-white sm:hidden"
            >
              <Images className="h-4 w-4" /> {photos.length} photo{photos.length === 1 ? "" : "s"}
            </button>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid md:h-[420px] lg:h-[520px]">
            {sidePhotos.map((src, i) => {
              const photoIndex = i + 1;
              const isLastSlot = i === sidePhotos.length - 1;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => openViewer(photoIndex)}
                  className="relative cursor-zoom-in overflow-hidden"
                  aria-label={`View photo ${photoIndex + 1}`}
                >
                  <img
                    src={src}
                    alt={`${apt.name} photo ${photoIndex + 1}`}
                    className="aspect-square h-full w-full object-cover transition duration-300 hover:brightness-95 md:aspect-auto"
                  />
                  {isLastSlot && photos.length > sidePhotos.length + 1 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium text-brand-green shadow-card sm:px-4 sm:text-sm">
                      <Images className="h-4 w-4" /> {photos.length} photos
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className="max-h-[100dvh] w-[100vw] max-w-[100vw] gap-0 overflow-hidden border-0 bg-black p-0 text-white shadow-none sm:max-h-[96dvh] sm:w-[min(96vw,1100px)] sm:max-w-[1100px] sm:rounded-2xl [&>button]:hidden"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{apt.name} photo gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Photo {viewerIndex + 1} of {photos.length}. Use arrow keys to navigate.
          </DialogDescription>

          <div className="relative flex h-[100dvh] flex-col sm:h-[min(92dvh,860px)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <p className="truncate text-sm font-medium text-white/90">
                {apt.name}
                <span className="ml-2 font-normal text-white/60">
                  {viewerIndex + 1} / {photos.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close photo viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-14">
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepViewer(-1)}
                    className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 sm:left-4"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepViewer(1)}
                    className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 sm:right-4"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <img
                src={photos[viewerIndex]}
                alt={`${apt.name} photo ${viewerIndex + 1}`}
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-5">
                {photos.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setViewerIndex(i)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                      i === viewerIndex
                        ? "ring-brand-orange opacity-100"
                        : "ring-transparent opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === viewerIndex}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <section className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-8 px-4 sm:mt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-green sm:text-3xl md:text-4xl">
            {apt.name}
          </h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-brand-orange" /> Oistins, Christ Church, Barbados
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={checking}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
            >
              <CalendarCheck className="h-4 w-4" />
              {checking ? "Checking…" : "Book this stay"}
            </button>
            <a
              href="#book-mobile"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-green px-6 py-3 font-semibold text-brand-green transition hover:bg-brand-cream sm:w-auto lg:hidden"
            >
              Pick dates first
            </a>
            <a
              href="#book"
              className="hidden items-center justify-center gap-2 rounded-full border border-brand-green px-6 py-3 font-semibold text-brand-green transition hover:bg-brand-cream lg:inline-flex"
            >
              Pick dates first
            </a>
            <span className="text-center text-sm text-muted-foreground sm:text-left">
              From <span className="font-semibold text-brand-green">${catalogFromRate(pricedType)}</span> / night
              <span className="block text-xs sm:inline sm:before:content-['·_']">
                Peak up to ${pricedType === "two-bedroom" ? 110 : 95}
              </span>
            </span>
          </div>
          {error && !checkIn && (
            <p className="mt-2 text-sm text-brand-orange">{error}</p>
          )}

          {blockedRanges.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-semibold text-amber-950">Existing bookings</p>
              <p className="mt-1 text-xs text-amber-900/80">
                {apt.unitsExclusive
                  ? "This apartment’s one- and two-bedroom options share inventory — booking either blocks both for those dates."
                  : apt.units.length > 0
                    ? "A unit can still be available when another unit is booked."
                    : "These nights are taken. Choose different dates to book this apartment."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {blockedRanges.map((range) => (
                  <span
                    key={`${range.checkIn}-${range.checkOut}`}
                    className="inline-flex rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950"
                  >
                    {range.unitName ? `${range.unitName}: ` : ""}
                    {fmtRangeDate(range.checkIn)} – {fmtRangeDate(range.checkOut)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {apt.units.length > 0 && (
            <div className="mt-8">
              <div>
                <h2 className="text-2xl font-bold text-brand-charcoal">
                  {apt.unitsExclusive ? "Choose configuration" : "Choose your unit(s)"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {apt.unitsExclusive
                    ? "Book as a one-bedroom or as the full two-bedroom — not both on the same dates."
                    : "These units are inside the same apartment. Book one, or select several to book them together."}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {apt.units.map((unit) => {
                  const selected = selectedUnitIds.includes(unit.id);
                  const occupancyUnit = occupancy?.units?.find((item) => item.id === unit.id);
                  const unitRate = catalogFromRate(roomTypeFromBedrooms(unit.bedrooms));
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        if (apt.unitsExclusive) {
                          setSelectedUnitIds([unit.id]);
                        } else {
                          setSelectedUnitIds((current) =>
                            current.includes(unit.id)
                              ? current.filter((id) => id !== unit.id)
                              : [...current, unit.id],
                          );
                        }
                        setError(null);
                      }}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        selected
                          ? "border-brand-green bg-brand-sage/10"
                          : "border-border hover:border-brand-green/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-brand-green">{unit.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {unit.bedrooms} bedroom{unit.bedrooms > 1 ? "s" : ""} ·{" "}
                            {unit.bathrooms} bathroom{unit.bathrooms > 1 ? "s" : ""} · up to{" "}
                            {unit.maxGuests} guests
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-brand-charcoal">
                          from ${unitRate}/night
                        </span>
                      </div>
                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          occupancyUnit?.occupiedNow
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {occupancyUnit?.occupiedNow ? "Booked now" : "Available now"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!apt.unitsExclusive && selectedUnits.length > 1 && (
                <div className="mt-3 rounded-xl bg-brand-cream px-4 py-3 text-sm font-semibold text-brand-green">
                  {selectedUnits.length} units selected · up to {combinedMaxGuests} guests
                </div>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-border p-5 sm:grid-cols-4">
            <Fact icon={Users} label={`${apt.guests} Guests`} />
            <Fact icon={BedDouble} label={`${apt.beds} Bedroom${apt.beds > 1 ? "s" : ""}`} />
            <Fact icon={Bath} label={`${apt.baths} Bathroom${apt.baths > 1 ? "s" : ""}`} />
            {apt.sizeSqM > 0 ? (
              <Fact icon={Ruler} label={`${apt.sizeSqM} m²`} />
            ) : (
              <Fact icon={Sparkles} label={apt.type === "two-bedroom" ? "Two-Bedroom" : "One-Bedroom"} />
            )}
          </div>

          <h2 className="mt-10 text-2xl font-bold">Amenities</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {amenities.map((label) => {
              const Icon = amenityIcon(label);
              return (
                <li
                  key={label}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border px-3.5 py-3 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-brand-green" />
                  <span className="min-w-0 leading-snug">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <aside id="book" className="hidden h-fit scroll-mt-24 lg:sticky lg:top-24 lg:block">
          <BookingCard
            price={combinedPrice}
            maxGuests={combinedMaxGuests}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            error={error}
            checking={checking}
            setCheckIn={setCheckIn}
            setCheckOut={setCheckOut}
            setGuests={setGuests}
            onCheck={handleCheckAvailability}
          />
        </aside>

        <div id="book-mobile" className="scroll-mt-24 lg:hidden">
          <BookingCard
            price={combinedPrice}
            maxGuests={combinedMaxGuests}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            error={error}
            checking={checking}
            setCheckIn={setCheckIn}
            setCheckOut={setCheckOut}
            setGuests={setGuests}
            onCheck={handleCheckAvailability}
            compact
          />
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Location</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-brand-green" />
              Oistins, Christ Church, Barbados
            </p>
          </div>
        </div>
        <div className="relative mt-5 h-[260px] overflow-hidden rounded-2xl border border-border bg-brand-cream shadow-card sm:h-[320px]">
          <AreaMap center={OISTINS_CENTER} zoom={14} radius={550} className="absolute inset-0 h-full w-full" />
          <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 px-4 py-3 shadow-card backdrop-blur sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm">
            <p className="text-sm font-semibold text-brand-green">Exact address provided after booking.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Central Oistins — minutes from the highway and the airport.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-8 mt-12 max-w-7xl px-4 sm:mb-12 sm:mt-16 sm:px-6 lg:mb-20 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TrustCard icon={BadgeCheck} title="Best Price Guarantee" body="Get the best rates when you book direct." />
          <TrustCard icon={Sparkles} title="Clean & Comfortable" body="Well-maintained apartments with everything you need." />
          <TrustCard icon={HeartHandshake} title="Local Support" body="We're here to help before, during, and after your stay." />
          <TrustCard icon={CalendarCheck} title="Flexible Booking" body="Easy changes and cancellation options." />
        </div>
      </section>
    </div>
  );
}

function BookingCard({
  price,
  maxGuests,
  checkIn,
  checkOut,
  guests,
  error,
  checking,
  setCheckIn,
  setCheckOut,
  setGuests,
  onCheck,
  compact,
}: {
  price: number;
  maxGuests: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  error: string | null;
  checking: boolean;
  setCheckIn: (v: string) => void;
  setCheckOut: (v: string) => void;
  setGuests: (n: number) => void;
  onCheck: () => void;
  compact?: boolean;
}) {
  const stayNights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(`${checkOut}T12:00:00`).getTime() -
              new Date(`${checkIn}T12:00:00`).getTime()) /
              86400000,
          ),
        )
      : 0;
  const belowMinNights = Boolean(checkIn && checkOut && stayNights < 1);

  const onCheckInChange = (value: string) => {
    setCheckIn(value);
    if (value && checkOut) {
      const nextMin = dayAfterISO(value);
      if (checkOut <= value) setCheckOut(nextMin);
    }
  };

  return (
    <div className={`rounded-2xl border border-border bg-white shadow-card ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-baseline gap-2">
        <span className={`font-bold text-brand-green ${compact ? "text-2xl" : "text-3xl"}`}>${price}</span>
        <span className="text-sm text-muted-foreground">/ night</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">From ${price} · taxes not included</p>

      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <div className={`grid ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
          <DateField label="Check-in" value={checkIn} onChange={onCheckInChange} />
          <DateField
            label="Check-out"
            value={checkOut}
            onChange={setCheckOut}
            min={checkIn ? dayAfterISO(checkIn) : undefined}
            borderLeft
          />
        </div>
        <label className="block border-t border-border px-4 py-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">Guests</span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
            ))}
          </select>
          {belowMinNights && (
            <p className="mt-2 text-sm text-brand-orange" role="alert">
              Minimum stay is 1 night. Choose a check-out date at least one day after check-in.
            </p>
          )}
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={onCheck}
        disabled={checking || belowMinNights}
        className="mt-4 w-full rounded-full bg-brand-orange px-6 py-3.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
      >
        {checking ? "Checking availability…" : "Check Availability"}
      </button>

      {!compact && (
        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
      )}

      <Link
        to="/contact"
        className={`${compact ? "mt-3" : ""} block w-full rounded-full border border-brand-green px-6 py-3.5 text-center font-semibold text-brand-green transition hover:bg-brand-cream`}
      >
        Send Enquiry
      </Link>

      {!compact && (
        <div className="mt-5 flex gap-3 rounded-xl bg-brand-cream p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
          <div className="text-sm">
            <p className="font-semibold text-brand-green">Secure booking. Local service.</p>
            <p className="text-muted-foreground">Clean, comfortable, and trusted by travelers.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function dayAfterISO(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function Fact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-brand-green" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  borderLeft,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  borderLeft?: boolean;
  min?: string;
}) {
  return (
    <label className={`block px-4 py-3 ${borderLeft ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-green">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full min-w-0 bg-transparent text-sm outline-none"
      />
    </label>
  );
}

function TrustCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream">
        <Icon className="h-5 w-5 text-brand-green" />
      </div>
      <h3 className="mt-3 font-bold text-brand-green">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function fmtRangeDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
