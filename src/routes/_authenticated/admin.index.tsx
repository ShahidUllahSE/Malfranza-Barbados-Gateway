import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Home,
  Percent,
  Car,
  DollarSign,
  Clock3,
  MessageSquare,
  ArrowRight,
  BedDouble,
  Plane,
  AlertCircle,
  Users,
  Ban,
  CircleDollarSign,
} from "lucide-react";
import {
  listApartmentBookings,
  listTaxiBookings,
  listAllApartments,
  listEnquiries,
} from "@/lib/admin";
import { syncBeds24OtaBookings } from "@/lib/beds24";
import { calcRollingOccupancy } from "@/lib/occupancy";
import {
  StatusPill,
  StatCard,
  BookingsCalendar,
  AdminPanel,
  Shimmer,
  TableShimmer,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function isChannelBooking(
  booking: { source?: string; external_channel?: string | null },
  channel: "expedia" | "booking",
) {
  if (booking.source !== "beds24") return false;
  const value = String(booking.external_channel ?? "").toLowerCase();
  if (channel === "expedia") {
    return value === "expedia" || value.includes("expedia");
  }
  return value === "booking" || value.includes("booking");
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const bookingsQ = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const taxiQ = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const aptsQ = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const enquiriesQ = useQuery({ queryKey: ["admin", "enquiries"], queryFn: listEnquiries });

  // Keep Expedia + Booking.com in local DB so dashboard/calendar stay current.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await syncBeds24OtaBookings();
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: ["admin", "apt-bookings"] });
        }
      } catch {
        // Cron still syncs every 15 minutes; dashboard can show last synced data.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const loading =
    bookingsQ.isLoading || taxiQ.isLoading || aptsQ.isLoading || enquiriesQ.isLoading;

  const today = new Date().toISOString().slice(0, 10);
  const bookings = bookingsQ.data ?? [];
  const taxis = taxiQ.data ?? [];
  const apts = aptsQ.data ?? [];
  const enquiries = enquiriesQ.data ?? [];

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.status !== "cancelled");
    const todaysCheckIns = bookings.filter(
      (b) => b.check_in === today && (b.status === "confirmed" || b.status === "pending" || b.status === "checked_in"),
    );
    const todaysCheckOuts = bookings.filter(
      (b) => b.check_out === today && (b.status === "checked_in" || b.status === "confirmed"),
    );
    const upcoming = bookings.filter(
      (b) => b.check_in >= today && (b.status === "confirmed" || b.status === "pending"),
    );
    const pending = bookings.filter((b) => b.status === "pending");
    const taxisToday = taxis.filter((t) => t.pickup_date === today && t.status !== "cancelled");
    const pendingTaxis = taxis.filter((t) => t.status === "pending" || t.status === "confirmed");
    const newEnquiries = enquiries.filter((e) => e.status === "new");
    const cancelledStays = bookings.filter((b) => b.status === "cancelled");
    const cancelledTaxis = taxis.filter((t) => t.status === "cancelled");
    const cancellations = cancelledStays.length + cancelledTaxis.length;
    const refundOpen = [
      ...bookings.filter((b) =>
        ["eligible", "requested", "reviewing"].includes(String((b as any).refund_status ?? "")),
      ),
      ...taxis.filter((t) =>
        ["eligible", "requested", "reviewing"].includes(String((t as any).refund_status ?? "")),
      ),
    ];
    const refundRequested = refundOpen.filter((item) =>
      ["requested", "reviewing"].includes(String((item as any).refund_status ?? "")),
    );

    const paidRevenue = activeBookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + Number(b.total_amount), 0);
    const monthStart = today.slice(0, 7);
    const monthRevenue = activeBookings
      .filter((b) => String(b.created_at ?? b.check_in).startsWith(monthStart) && b.payment_status === "paid")
      .reduce((sum, b) => sum + Number(b.total_amount), 0);

    const horizon = 30;
    const occ = calcRollingOccupancy(bookings, apts, horizon);

    const recent = [...bookings]
      .sort((a, b) => String(b.created_at ?? b.check_in).localeCompare(String(a.created_at ?? a.check_in)))
      .slice(0, 8);

    const sortChannel = (a: (typeof bookings)[number], b: (typeof bookings)[number]) =>
      String(a.check_in).localeCompare(String(b.check_in)) ||
      String(a.guest_name).localeCompare(String(b.guest_name));

    const expediaBookings = bookings
      .filter((b) => b.status !== "cancelled" && isChannelBooking(b, "expedia"))
      .sort(sortChannel)
      .slice(0, 8);

    const bookingComBookings = bookings
      .filter((b) => b.status !== "cancelled" && isChannelBooking(b, "booking"))
      .sort(sortChannel)
      .slice(0, 8);

    return {
      todaysCheckIns,
      todaysCheckOuts,
      upcoming,
      pending,
      taxisToday,
      pendingTaxis,
      newEnquiries,
      cancellations,
      cancelledStays: cancelledStays.length,
      cancelledTaxis: cancelledTaxis.length,
      refundOpen: refundOpen.length,
      refundRequested: refundRequested.length,
      paidRevenue,
      monthRevenue,
      occupancy: occ.occupancy,
      activeApts: occ.inventory,
      bookedNights: occ.bookedNights,
      availableNights: occ.availableNights,
      recent,
      expediaBookings,
      bookingComBookings,
      inHouse: bookings.filter((b) => b.status === "checked_in"),
    };
  }, [bookings, taxis, apts, enquiries, today]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="overflow-hidden rounded-xl border border-brand-green/15 bg-gradient-to-r from-brand-green to-brand-green-deep text-white shadow-sm">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/65">{dateLabel}</p>
            <h1 className="mt-0.5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {greeting}
            </h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <QuickLink to="/admin/bookings" label="Bookings" />
            <QuickLink to="/admin/refunds" label="Refunds" />
            <QuickLink to="/admin/taxi" label="Taxi" />
            <QuickLink to="/admin/calendar" label="Calendar" />
            <QuickLink to="/admin/enquiries" label="Enquiries" />
          </div>
        </div>
      </div>

      {/* Dense KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          dense
          loading={loading}
          icon={CalendarCheck}
          label="Today's arrivals"
          value={stats.todaysCheckIns.length}
          hint={`${stats.todaysCheckOuts.length} check-outs`}
          tone="orange"
          to="/admin/insights/arrivals"
        />
        <StatCard
          dense
          loading={loading}
          icon={Home}
          label="Upcoming stays"
          value={stats.upcoming.length}
          hint={`${stats.pending.length} pending`}
          to="/admin/insights/upcoming"
        />
        <StatCard
          dense
          loading={loading}
          icon={Percent}
          label="Occupancy (30d)"
          value={`${stats.occupancy}%`}
          hint={`${stats.bookedNights}/${stats.availableNights} nights`}
          tone="sage"
          to="/admin/insights/occupancy"
        />
        <StatCard
          dense
          loading={loading}
          icon={Car}
          label="Taxi today"
          value={stats.taxisToday.length}
          hint={`${stats.pendingTaxis.length} need attention`}
          tone="amber"
          to="/admin/insights/taxi-today"
        />
        <StatCard
          dense
          loading={loading}
          icon={DollarSign}
          label="Paid revenue"
          value={money(stats.paidRevenue)}
          hint={`${money(stats.monthRevenue)} this month`}
          to="/admin/insights/revenue"
        />
        <StatCard
          dense
          loading={loading}
          icon={Users}
          label="In-house"
          value={stats.inHouse.length}
          hint="Checked in now"
          to="/admin/insights/in-house"
        />
        <StatCard
          dense
          loading={loading}
          icon={AlertCircle}
          label="Pending"
          value={stats.pending.length}
          hint="Awaiting confirmation"
          tone="amber"
          to="/admin/insights/pending"
        />
        <StatCard
          dense
          loading={loading}
          icon={MessageSquare}
          label="Enquiries"
          value={stats.newEnquiries.length}
          hint="Needs a reply"
          tone="orange"
          to="/admin/insights/enquiries"
        />
        <StatCard
          dense
          loading={loading}
          icon={Ban}
          label="Cancellations"
          value={stats.cancellations}
          hint={`${stats.cancelledStays} stay · ${stats.cancelledTaxis} taxi`}
          tone="orange"
          to="/admin/bookings"
        />
        <StatCard
          dense
          loading={loading}
          icon={CircleDollarSign}
          label="Refunds"
          value={stats.refundOpen}
          hint={`${stats.refundRequested} awaiting action`}
          tone="amber"
          to="/admin/refunds"
        />
      </div>

      {/* Occupancy + today */}
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel
          dense
          title="Occupancy outlook"
          description="Next 30 days capacity"
          action={
            <Link
              to="/admin/calendar"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green hover:underline"
            >
              Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-2 w-full rounded-full" />
              <Shimmer className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-bold leading-none text-brand-green">
                    {stats.occupancy}%
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {stats.bookedNights} booked of {stats.availableNights} room-nights
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-cream">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-sage to-brand-green transition-all duration-700"
                  style={{ width: `${stats.occupancy}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <MiniStat label="Units" value={stats.activeApts} icon={BedDouble} />
                <MiniStat label="Upcoming" value={stats.upcoming.length} icon={Home} />
                <MiniStat label="In house" value={stats.inHouse.length} icon={Users} />
                <MiniStat label="Taxi" value={stats.taxisToday.length} icon={Plane} />
              </div>
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          dense
          title="Today at a glance"
          description="Arrivals, departures, rides"
          action={
            <Link to="/admin/bookings" className="text-xs font-semibold text-brand-green hover:underline">
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Shimmer key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <TodayGroup
                title="Check-ins"
                empty="No arrivals today"
                items={stats.todaysCheckIns.map((b) => ({
                  id: b.id,
                  title: b.guest_name,
                  meta: `${(b as { apartments?: { name?: string } }).apartments?.name ?? "Stay"} · ${b.booking_reference}`,
                  status: b.status,
                }))}
              />
              <TodayGroup
                title="Check-outs"
                empty="No departures today"
                items={stats.todaysCheckOuts.map((b) => ({
                  id: b.id,
                  title: b.guest_name,
                  meta: `${(b as { apartments?: { name?: string } }).apartments?.name ?? "Stay"} · ${b.booking_reference}`,
                  status: b.status,
                }))}
              />
              <TodayGroup
                title="Taxi"
                empty="No taxi trips today"
                items={stats.taxisToday.map((t) => ({
                  id: t.id,
                  title: t.customer_name,
                  meta: `${t.pickup_time} · ${t.service_type}`,
                  status: t.status,
                }))}
              />
            </div>
          )}
        </AdminPanel>
      </div>

      {/* Calendar */}
      <AdminPanel
        dense
        title="Bookings calendar"
        description="Website + Expedia + Booking.com"
        action={
          <Link
            to="/admin/calendar"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green hover:underline"
          >
            Full calendar <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <BookingsCalendar apartments={apts} bookings={bookings} loading={loading} />
      </AdminPanel>

      {/* Channel reservations */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChannelBookingsPanel
          title="Expedia"
          description="Synced from Beds24"
          empty="No Expedia stays synced yet."
          manageTo="/admin/channels/expedia"
          loading={loading}
          bookings={stats.expediaBookings}
        />
        <ChannelBookingsPanel
          title="Booking.com"
          description="Synced from Beds24"
          empty="No Booking.com stays synced yet."
          manageTo="/admin/channels/booking"
          loading={loading}
          bookings={stats.bookingComBookings}
        />
      </div>

      {/* Recent bookings + enquiries */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <AdminPanel
          dense
          title="Recent bookings"
          description="Latest stays"
          action={
            <Link to="/admin/bookings" className="text-xs font-semibold text-brand-green hover:underline">
              Manage
            </Link>
          }
          className="overflow-hidden p-0 [&>div:last-child]:p-0"
        >
          {loading ? (
            <div className="p-3">
              <TableShimmer rows={4} cols={5} />
            </div>
          ) : stats.recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">No bookings yet.</p>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {stats.recent.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-charcoal">{b.guest_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {(b as { apartments?: { name?: string } }).apartments?.name ?? "Apartment"} ·{" "}
                        {b.check_in} → {b.check_out}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill status={b.status} />
                      <span className="text-[11px] font-semibold text-brand-green">
                        ${Number(b.total_amount).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 text-left">
                    <tr>
                      <th className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Guest
                      </th>
                      <th className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Stay
                      </th>
                      <th className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Dates
                      </th>
                      <th className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Total
                      </th>
                      <th className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100 hover:bg-brand-cream/40">
                        <td className="px-3.5 py-2">
                          <div className="text-sm font-medium text-brand-charcoal">{b.guest_name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {b.booking_reference}
                          </div>
                        </td>
                        <td className="px-3.5 py-2 text-xs text-muted-foreground">
                          {(b as { apartments?: { name?: string } }).apartments?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2 text-xs text-muted-foreground">
                          {b.check_in} → {b.check_out}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2 text-sm font-semibold text-brand-green">
                          ${Number(b.total_amount).toFixed(0)}
                        </td>
                        <td className="px-3.5 py-2">
                          <StatusPill status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          dense
          title="Latest enquiries"
          description="Contact form"
          action={
            <Link to="/admin/enquiries" className="text-xs font-semibold text-brand-green hover:underline">
              Inbox
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Shimmer key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : enquiries.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No enquiries yet.</p>
          ) : (
            <div className="space-y-1.5">
              {enquiries.slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-border/60 bg-brand-cream/25 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-charcoal">{e.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {e.interested_in}
                        {e.preferred_dates ? ` · ${e.preferred_dates}` : ""}
                      </p>
                    </div>
                    <StatusPill status={e.status} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-brand-charcoal/75">{e.message}</p>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>

      {/* Quick actions */}
      <AdminPanel dense title="Quick actions" description="Common tasks">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            to="/admin/bookings"
            icon={CalendarCheck}
            title="Review bookings"
            body="Confirm or check in"
          />
          <ActionCard to="/admin/taxi" icon={Car} title="Taxi board" body="Assign drivers" />
          <ActionCard
            to="/admin/apartments"
            icon={BedDouble}
            title="Apartments"
            body="Rates and photos"
          />
          <ActionCard
            to="/admin/enquiries"
            icon={MessageSquare}
            title="Reply to guests"
            body={`${stats.newEnquiries.length} new`}
          />
        </div>
      </AdminPanel>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
    >
      {label}
    </Link>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Home;
}) {
  return (
    <div className="rounded-lg bg-brand-cream/70 px-2 py-2">
      <div className="flex items-center gap-1 text-brand-green">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-0.5 font-display text-base font-bold text-brand-charcoal">{value}</p>
    </div>
  );
}

function TodayGroup({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; status: string }>;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Clock3 className="h-3 w-3 text-brand-green" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-brand-charcoal">
          {title}
        </h3>
        <span className="rounded-full bg-brand-cream px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-2.5 py-2 text-[11px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-brand-charcoal">{item.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{item.meta}</p>
              </div>
              <StatusPill status={item.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Home;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-brand-cream/30 px-3 py-2.5 transition hover:border-brand-sage/50 hover:bg-white hover:shadow-sm"
    >
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-green/10 text-brand-green transition group-hover:bg-brand-green group-hover:text-white">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-brand-charcoal">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{body}</p>
      </div>
    </Link>
  );
}

function ChannelBookingsPanel({
  title,
  description,
  empty,
  manageTo,
  loading,
  bookings,
}: {
  title: string;
  description: string;
  empty: string;
  manageTo: string;
  loading: boolean;
  bookings: Array<{
    id: string;
    guest_name: string;
    booking_reference: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    status: string;
    apartments?: { name?: string };
  }>;
}) {
  return (
    <AdminPanel
      dense
      title={title}
      description={description}
      action={
        <Link to={manageTo} className="text-xs font-semibold text-brand-green hover:underline">
          Channel
        </Link>
      }
      className="overflow-hidden p-0 [&>div:last-child]:p-0"
    >
      {loading ? (
        <div className="p-3">
          <TableShimmer rows={3} cols={3} />
        </div>
      ) : bookings.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-charcoal">{b.guest_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {b.apartments?.name ?? "Stay"} · {b.check_in} → {b.check_out}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {b.booking_reference}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusPill status={b.status} />
                <span className="text-[11px] font-semibold text-brand-green">
                  ${Number(b.total_amount).toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
