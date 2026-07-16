import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Home, Percent, Car } from "lucide-react";
import { listApartmentBookings, listTaxiBookings, listAllApartments } from "@/lib/admin";
import { StatusPill, StatCard, BookingsCalendar } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const bookingsQ = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const taxiQ = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const aptsQ = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });

  const today = new Date().toISOString().slice(0, 10);
  const bookings = bookingsQ.data ?? [];
  const taxis = taxiQ.data ?? [];
  const apts = aptsQ.data ?? [];

  const todaysBookings = bookings.filter(
    (b) => b.check_in === today || b.check_out === today,
  ).length;
  const upcoming = bookings.filter(
    (b) => b.check_in >= today && (b.status === "confirmed" || b.status === "pending"),
  ).length;
  const taxisToday = taxis.filter((t) => t.pickup_date === today).length;

  // occupancy = booked-nights / (active_apts * 30) over next 30 days
  const horizon = 30;
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + horizon);
  let bookedNights = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const ci = new Date(b.check_in);
    const co = new Date(b.check_out);
    const s = ci < start ? start : ci;
    const e = co > end ? end : co;
    const n = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
    bookedNights += n;
  }
  const activeApts = apts.filter((a) => a.is_active).length || 1;
  const occupancy = Math.min(100, Math.round((bookedNights / (activeApts * horizon)) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of bookings and activity.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Today's Bookings" value={todaysBookings} />
        <StatCard icon={Home} label="Upcoming Stays" value={upcoming} />
        <StatCard icon={Percent} label="Occupancy Rate" value={`${occupancy}%`} />
        <StatCard icon={Car} label="Taxi Trips Today" value={taxisToday} />
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-brand-charcoal">Bookings Calendar</h2>
        </div>
        <BookingsCalendar apartments={apts} bookings={bookings} />
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 sm:p-6">
        <h2 className="font-display font-bold text-lg text-brand-charcoal mb-3">Recent Bookings</h2>
        <div className="divide-y">
          {bookings.slice(0, 8).map((b) => (
            <div key={b.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium text-brand-charcoal truncate">
                  {b.guest_name} · {(b as any).apartments?.name ?? "Apartment"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.check_in} → {b.check_out} · {b.booking_reference}
                </div>
              </div>
              <StatusPill status={b.status} />
            </div>
          ))}
          {bookings.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground text-center">No bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
