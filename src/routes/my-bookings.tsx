import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Car,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { listMyBookings, listMyTaxiBookings } from "@/lib/user";
import { useUserAuth } from "@/context/UserAuthContext";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Malfranza" },
      {
        name: "description",
        content:
          "View your Malfranza booking references, stay dates, and any added taxi transfers.",
      },
      { property: "og:title", content: "My Bookings — Malfranza" },
      {
        property: "og:description",
        content:
          "View your Malfranza booking references, stay dates, and any added taxi transfers.",
      },
    ],
  }),
  component: MyBookingsPage,
});

type PublicBooking = {
  booking_reference: string;
  apartment_name: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_amount: number;
  status: string;
  taxi_addon: boolean;
  taxi_date: string | null;
  taxi_time: string | null;
  taxi_pickup: string | null;
  taxi_dropoff: string | null;
  created_at: string;
};

function mapAccountBooking(booking: any): PublicBooking {
  return {
    booking_reference: booking.bookingReference,
    apartment_name: booking.unitName
      ? `${booking.apartmentName ?? "Stay"} · ${booking.unitName}`
      : (booking.apartmentName ?? null),
    check_in: toDateOnly(booking.checkIn),
    check_out: toDateOnly(booking.checkOut),
    nights: booking.nights,
    guests: booking.guests,
    total_amount: booking.totalAmount,
    status: booking.status,
    taxi_addon: !!booking.taxi,
    taxi_date: booking.taxi?.date ? toDateOnly(booking.taxi.date) : null,
    taxi_time: booking.taxi?.time ?? null,
    taxi_pickup: booking.taxi?.pickup ?? null,
    taxi_dropoff: booking.taxi?.dropoff ?? null,
    created_at: booking.createdAt,
  };
}

function toDateOnly(value: string | Date): string {
  return String(value).slice(0, 10);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function MyBookingsPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useUserAuth();
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [taxiTrips, setTaxiTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) return;
    openAuthModal({
      mode: "signin",
      reason: "Sign in to see your stays and taxi bookings.",
      redirectTo: "/my-bookings",
    });
    navigate({ to: "/" });
  }, [user, openAuthModal, navigate]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [stayItems, taxiItems] = await Promise.all([
          listMyBookings(),
          listMyTaxiBookings(),
        ]);
        if (!cancelled) {
          setBookings(stayItems.map(mapAccountBooking));
          setTaxiTrips(taxiItems);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't load your bookings. Please try again.");
          setBookings([]);
          setTaxiTrips([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-cream/40">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-green sm:text-3xl lg:text-4xl">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stays and taxi trips linked to {user.email}
            </p>
          </div>
          <Link
            to="/book"
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New booking
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-brand-green/30 bg-white p-10 text-center">
              <p className="text-base font-semibold text-brand-green">No stays yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you finish a booking while signed in, it will show up here.
              </p>
              <Link
                to="/book"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                <Plus className="h-4 w-4" /> Start a booking
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4">
              {bookings.map((b) => (
                <li key={b.booking_reference}>
                  <Link
                    to="/my-bookings/$reference"
                    params={{ reference: b.booking_reference }}
                    className="block rounded-2xl border border-border bg-white p-5 shadow-card transition hover:border-brand-green/40 hover:shadow-card-hover sm:p-6"
                  >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {b.status || "confirmed"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Booked {fmtDate(b.created_at)}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-brand-green">
                        {b.apartment_name ?? "Stay"}
                      </h2>
                      <p className="mt-0.5 text-xs font-mono text-brand-charcoal/80">
                        {b.booking_reference}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total paid
                      </div>
                      <div className="text-xl font-bold text-brand-green">
                        ${Number(b.total_amount).toFixed(0)}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-brand-orange">View details →</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Check-in"
                      value={fmtDate(b.check_in)}
                    />
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Check-out"
                      value={fmtDate(b.check_out)}
                    />
                    <InfoRow
                      icon={<Users className="h-4 w-4" />}
                      label="Guests · Nights"
                      value={`${b.guests} · ${b.nights}`}
                    />
                  </div>

                  <div className="mt-4">
                    {b.taxi_addon ? (
                      <div className="flex items-start gap-2 rounded-xl bg-brand-cream/60 px-3 py-2 text-sm text-brand-charcoal">
                        <Car className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                        <div>
                          <div className="font-semibold text-brand-green">Taxi transfer added</div>
                          <div className="text-xs text-muted-foreground">
                            {b.taxi_pickup ?? "Airport pickup"}
                            {b.taxi_date ? ` · ${fmtDate(b.taxi_date)}` : ""}
                            {b.taxi_time ? ` at ${b.taxi_time.slice(0, 5)}` : ""}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="h-4 w-4" />
                        No taxi added
                      </div>
                    )}
                  </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {taxiTrips.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-brand-green">Taxi trips</h2>
            <ul className="mt-4 grid gap-4">
              {taxiTrips.map((trip) => {
                const driver =
                  trip.driverId && typeof trip.driverId === "object" ? trip.driverId : null;
                const eta = trip.durationMinutes ?? 25;
                return (
                  <li key={trip.bookingReference} className="rounded-2xl border border-border bg-white p-5 shadow-card">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">{trip.bookingReference}</p>
                        <h3 className="text-lg font-semibold text-brand-charcoal">{trip.serviceType}</h3>
                        <p className="text-sm text-muted-foreground">
                          {String(trip.pickupDate).slice(0, 10)} at {trip.pickupTime}
                        </p>
                        <p className="mt-1 break-words text-sm">
                          {trip.pickupLocation} → {trip.dropoffLocation}
                        </p>
                        <p className="mt-2 text-xs capitalize text-muted-foreground">
                          Status: {String(trip.status).replaceAll("_", " ")}
                        </p>
                        {driver ? (
                          <div className="mt-3 rounded-xl bg-brand-cream/60 px-3 py-2 text-sm">
                            <p className="font-semibold text-brand-green">
                              Driver: {driver.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {driver.vehicleLabel || "Malfranza taxi"}
                              {driver.phone ? ` · ${driver.phone}` : ""}
                              {" · "}~{eta} min trip
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Driver matching in progress…
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-brand-green">
                        ${Number(trip.estimatedFare).toFixed(0)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Bookings are linked to your Malfranza account email.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-brand-green">{icon}</div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium text-brand-charcoal">{value}</div>
      </div>
    </div>
  );
}
