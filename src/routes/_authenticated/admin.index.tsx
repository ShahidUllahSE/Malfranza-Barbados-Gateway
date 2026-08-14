import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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

function AdminDashboard() {
  const bookingsQ = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const taxiQ = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const aptsQ = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const enquiriesQ = useQuery({ queryKey: ["admin", "enquiries"], queryFn: listEnquiries });

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
    <div className="space-y-6">
      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl border border-brand-green/10 bg-gradient-to-br from-brand-green to-brand-green-deep text-white shadow-card">
        <div className="relative px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-brand-sage/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-white/70">{dateLabel}</p>
              <h1 className="mt-1 text-2xl font-display font-bold text-white sm:text-3xl">
                {greeting}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Here&apos;s what&apos;s happening across stays, taxi trips, and guest enquiries.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink to="/admin/bookings" label="Bookings" />
              <QuickLink to="/admin/refunds" label="Refunds" />
              <QuickLink to="/admin/taxi" label="Taxi" />
              <QuickLink to="/admin/enquiries" label="Enquiries" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          icon={CalendarCheck}
          label="Today's arrivals"
          value={stats.todaysCheckIns.length}
          hint={`${stats.todaysCheckOuts.length} check-out${stats.todaysCheckOuts.length === 1 ? "" : "s"} today`}
          tone="orange"
          to="/admin/insights/arrivals"
        />
        <StatCard
          loading={loading}
          icon={Home}
          label="Upcoming stays"
          value={stats.upcoming.length}
          hint={`${stats.pending.length} pending confirmation`}
          to="/admin/insights/upcoming"
        />
        <StatCard
          loading={loading}
          icon={Percent}
          label="Occupancy (30d)"
          value={`${stats.occupancy}%`}
          hint={`${stats.bookedNights}/${stats.availableNights} room-nights · ${stats.activeApts} unit${stats.activeApts === 1 ? "" : "s"}`}
          tone="sage"
          to="/admin/insights/occupancy"
        />
        <StatCard
          loading={loading}
          icon={Car}
          label="Taxi trips today"
          value={stats.taxisToday.length}
          hint={`${stats.pendingTaxis.length} need attention`}
          tone="amber"
          to="/admin/insights/taxi-today"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          icon={DollarSign}
          label="Paid revenue"
          value={money(stats.paidRevenue)}
          hint={`${money(stats.monthRevenue)} this month`}
          to="/admin/insights/revenue"
        />
        <StatCard
          loading={loading}
          icon={Users}
          label="Guests in-house"
          value={stats.inHouse.length}
          hint="Currently checked in"
          to="/admin/insights/in-house"
        />
        <StatCard
          loading={loading}
          icon={AlertCircle}
          label="Pending bookings"
          value={stats.pending.length}
          hint="Awaiting confirmation"
          tone="amber"
          to="/admin/insights/pending"
        />
        <StatCard
          loading={loading}
          icon={MessageSquare}
          label="New enquiries"
          value={stats.newEnquiries.length}
          hint="Needs a reply"
          tone="orange"
          to="/admin/insights/enquiries"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          icon={Ban}
          label="Cancellations"
          value={stats.cancellations}
          hint={`${stats.cancelledStays} stay · ${stats.cancelledTaxis} taxi`}
          tone="orange"
          to="/admin/bookings"
        />
        <StatCard
          loading={loading}
          icon={CircleDollarSign}
          label="Refund requests"
          value={stats.refundOpen}
          hint={`${stats.refundRequested} awaiting payout action`}
          tone="amber"
          to="/admin/refunds"
        />
      </div>

      {/* Occupancy meter + today's activity */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AdminPanel
          title="Occupancy outlook"
          description="Booked nights vs capacity over the next 30 days"
        >
          {loading ? (
            <div className="space-y-3">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-3 w-full rounded-full" />
              <Shimmer className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-display font-bold text-brand-green">{stats.occupancy}%</p>
                  <p className="text-sm text-muted-foreground">
                    Next 30 days · {stats.bookedNights} booked of {stats.availableNights} available
                    room-nights
                  </p>
                </div>
                <Link
                  to="/admin/calendar"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
                >
                  Open calendar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-cream">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-sage to-brand-green transition-all duration-700"
                  style={{ width: `${stats.occupancy}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Active units" value={stats.activeApts} icon={BedDouble} />
                <MiniStat label="Upcoming" value={stats.upcoming.length} icon={Home} />
                <MiniStat label="In house" value={stats.inHouse.length} icon={Users} />
                <MiniStat label="Taxi today" value={stats.taxisToday.length} icon={Plane} />
              </div>
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title="Today at a glance"
          description="Arrivals, departures, and rides"
          action={
            <Link to="/admin/bookings" className="text-sm font-semibold text-brand-green hover:underline">
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Shimmer key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <TodayGroup
                title="Check-ins"
                empty="No arrivals scheduled"
                items={stats.todaysCheckIns.map((b) => ({
                  id: b.id,
                  title: b.guest_name,
                  meta: `${(b as { apartments?: { name?: string } }).apartments?.name ?? "Stay"} · ${b.booking_reference}`,
                  status: b.status,
                }))}
              />
              <TodayGroup
                title="Check-outs"
                empty="No departures scheduled"
                items={stats.todaysCheckOuts.map((b) => ({
                  id: b.id,
                  title: b.guest_name,
                  meta: `${(b as { apartments?: { name?: string } }).apartments?.name ?? "Stay"} · ${b.booking_reference}`,
                  status: b.status,
                }))}
              />
              <TodayGroup
                title="Taxi rides"
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
        title="Bookings calendar"
        description="Month view of apartment availability"
        action={
          <Link
            to="/admin/calendar"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
          >
            Full calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <BookingsCalendar apartments={apts} bookings={bookings} loading={loading} />
      </AdminPanel>

      {/* Recent bookings + enquiries */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <AdminPanel
          title="Recent bookings"
          description="Latest stay reservations"
          action={
            <Link to="/admin/bookings" className="text-sm font-semibold text-brand-green hover:underline">
              Manage
            </Link>
          }
          className="overflow-hidden p-0 [&>div:last-child]:p-0"
        >
          {loading ? (
            <div className="p-4">
              <TableShimmer rows={5} cols={5} />
            </div>
          ) : stats.recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {stats.recent.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-charcoal">{b.guest_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {(b as { apartments?: { name?: string } }).apartments?.name ?? "Apartment"} · {b.check_in} → {b.check_out}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{b.booking_reference}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill status={b.status} />
                      <span className="text-xs font-semibold text-brand-green">
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
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stay</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dates</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100 hover:bg-brand-cream/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-brand-charcoal">{b.guest_name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{b.booking_reference}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {(b as { apartments?: { name?: string } }).apartments?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {b.check_in} → {b.check_out}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-green">
                          ${Number(b.total_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
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
          title="Latest enquiries"
          description="Contact form activity"
          action={
            <Link to="/admin/enquiries" className="text-sm font-semibold text-brand-green hover:underline">
              Open inbox
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Shimmer key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : enquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No enquiries yet.</p>
          ) : (
            <div className="space-y-2">
              {enquiries.slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-border/70 bg-brand-cream/30 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-charcoal">{e.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {e.interested_in}
                        {e.preferred_dates ? ` · ${e.preferred_dates}` : ""}
                      </p>
                    </div>
                    <StatusPill status={e.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-brand-charcoal/80">{e.message}</p>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>

      {/* Quick actions */}
      <AdminPanel title="Quick actions" description="Jump to common admin tasks">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard to="/admin/bookings" icon={CalendarCheck} title="Review bookings" body="Confirm or check in guests" />
          <ActionCard to="/admin/taxi" icon={Car} title="Taxi board" body="Assign drivers & track trips" />
          <ActionCard to="/admin/apartments" icon={BedDouble} title="Apartments" body="Update rates and photos" />
          <ActionCard to="/admin/enquiries" icon={MessageSquare} title="Reply to guests" body={`${stats.newEnquiries.length} new messages`} />
        </div>
      </AdminPanel>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
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
    <div className="rounded-xl bg-brand-cream/70 px-3 py-3">
      <div className="flex items-center gap-1.5 text-brand-green">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-lg font-display font-bold text-brand-charcoal">{value}</p>
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
      <div className="mb-2 flex items-center gap-2">
        <Clock3 className="h-3.5 w-3.5 text-brand-green" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-charcoal">{title}</h3>
        <span className="rounded-full bg-brand-cream px-2 py-0.5 text-[11px] font-medium text-brand-green">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-charcoal">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
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
      className="group rounded-xl border border-border/70 bg-brand-cream/40 p-4 transition hover:border-brand-sage/50 hover:bg-white hover:shadow-card"
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green transition group-hover:bg-brand-green group-hover:text-white">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-charcoal">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
    </Link>
  );
}
