import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, ChevronRight } from "lucide-react";
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
  payment_status?: string;
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
    payment_status: booking.paymentStatus,
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
    return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === "cancelled"
      ? "bg-red-50 text-red-700 ring-red-100"
      : s === "pending"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : s === "checked_out"
          ? "bg-slate-100 text-slate-700 ring-slate-200"
          : "bg-brand-green/10 text-brand-green ring-brand-green/15";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${tone}`}
    >
      {statusLabel(status)}
    </span>
  );
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New booking
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-charcoal/70">
            Stays
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-card">
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
                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                <Plus className="h-4 w-4" /> Start a booking
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              {/* Mobile: stacked rows (still tabular structure) */}
              <div className="divide-y divide-slate-100 md:hidden">
                {bookings.map((b) => (
                  <Link
                    key={b.booking_reference}
                    to="/my-bookings/$reference"
                    params={{ reference: b.booking_reference }}
                    className="block cursor-pointer p-4 transition hover:bg-brand-cream/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-brand-green">
                          {b.apartment_name ?? "Stay"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {b.booking_reference}
                        </p>
                      </div>
                      <StatusBadge status={b.status || "confirmed"} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Check-in</dt>
                        <dd className="font-medium text-brand-charcoal">{fmtDate(b.check_in)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Check-out</dt>
                        <dd className="font-medium text-brand-charcoal">{fmtDate(b.check_out)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Guests / nights</dt>
                        <dd className="font-medium text-brand-charcoal">
                          {b.guests} · {b.nights}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Total</dt>
                        <dd className="font-bold text-brand-green">
                          ${Number(b.total_amount).toFixed(0)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Taxi</dt>
                        <dd className="font-medium text-brand-charcoal">
                          {b.taxi_addon ? "Transfer added" : "No taxi"}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-orange">
                      View details <ChevronRight className="h-3.5 w-3.5" />
                    </p>
                  </Link>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F7F8F6]">
                      <Th>Reference</Th>
                      <Th>Apartment</Th>
                      <Th>Check-in</Th>
                      <Th>Check-out</Th>
                      <Th>Guests</Th>
                      <Th>Nights</Th>
                      <Th>Taxi</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Total</Th>
                      <Th className="text-right"> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b.booking_reference}
                        className="border-b border-slate-100 transition hover:bg-brand-cream/35"
                      >
                        <Td>
                          <span className="font-mono text-xs font-semibold text-brand-charcoal">
                            {b.booking_reference}
                          </span>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Booked {fmtDate(b.created_at)}
                          </div>
                        </Td>
                        <Td>
                          <span className="font-semibold text-brand-green">
                            {b.apartment_name ?? "Stay"}
                          </span>
                        </Td>
                        <Td nowrap>{fmtDate(b.check_in)}</Td>
                        <Td nowrap>{fmtDate(b.check_out)}</Td>
                        <Td nowrap>{b.guests}</Td>
                        <Td nowrap>{b.nights}</Td>
                        <Td nowrap>{b.taxi_addon ? "Yes" : "No"}</Td>
                        <Td>
                          <StatusBadge status={b.status || "confirmed"} />
                        </Td>
                        <Td nowrap className="text-right font-bold text-brand-green">
                          ${Number(b.total_amount).toFixed(0)}
                        </Td>
                        <Td className="text-right">
                          <Link
                            to="/my-bookings/$reference"
                            params={{ reference: b.booking_reference }}
                            className="inline-flex cursor-pointer items-center gap-0.5 text-xs font-semibold text-brand-orange hover:underline"
                          >
                            Details <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {taxiTrips.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-charcoal/70">
              Taxi trips
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              <div className="divide-y divide-slate-100 md:hidden">
                {taxiTrips.map((trip) => {
                  const showDriver =
                    trip.status === "assigned" ||
                    trip.status === "en_route" ||
                    trip.status === "completed";
                  const driver =
                    showDriver && trip.driverId && typeof trip.driverId === "object"
                      ? trip.driverId
                      : null;
                  return (
                    <div key={trip.bookingReference} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-brand-charcoal">{trip.serviceType}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {trip.bookingReference}
                          </p>
                        </div>
                        <StatusBadge status={String(trip.status)} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {String(trip.pickupDate).slice(0, 10)} · {trip.pickupTime}
                      </p>
                      <p className="mt-1 text-sm">
                        {trip.pickupLocation} → {trip.dropoffLocation}
                      </p>
                      <p className="mt-2 text-sm font-bold text-brand-green">
                        ${Number(trip.estimatedFare).toFixed(0)}
                      </p>
                      {driver && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Driver: {driver.name}
                          {driver.vehicleLabel ? ` · ${driver.vehicleLabel}` : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F7F8F6]">
                      <Th>Reference</Th>
                      <Th>Service</Th>
                      <Th>When</Th>
                      <Th>Route</Th>
                      <Th>Driver</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Fare</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxiTrips.map((trip) => {
                      const showDriver =
                        trip.status === "assigned" ||
                        trip.status === "en_route" ||
                        trip.status === "completed";
                      const driver =
                        showDriver && trip.driverId && typeof trip.driverId === "object"
                          ? trip.driverId
                          : null;
                      return (
                        <tr
                          key={trip.bookingReference}
                          className="border-b border-slate-100"
                        >
                          <Td>
                            <span className="font-mono text-xs font-semibold">
                              {trip.bookingReference}
                            </span>
                          </Td>
                          <Td>
                            <span className="font-medium">{trip.serviceType}</span>
                          </Td>
                          <Td nowrap>
                            {String(trip.pickupDate).slice(0, 10)} · {trip.pickupTime}
                          </Td>
                          <Td>
                            <span className="line-clamp-2 text-xs text-brand-charcoal">
                              {trip.pickupLocation} → {trip.dropoffLocation}
                            </span>
                          </Td>
                          <Td>
                            {driver ? (
                              <span className="text-xs">
                                {driver.name}
                                {driver.vehicleLabel ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {driver.vehicleLabel}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Matching…</span>
                            )}
                          </Td>
                          <Td>
                            <StatusBadge status={String(trip.status)} />
                          </Td>
                          <Td nowrap className="text-right font-bold text-brand-green">
                            ${Number(trip.estimatedFare).toFixed(0)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Bookings are linked to your Malfranza account email.
        </p>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-charcoal/55 first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  nowrap = false,
}: {
  children?: React.ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3.5 align-middle text-brand-charcoal first:pl-5 last:pr-5 ${
        nowrap ? "whitespace-nowrap" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}
