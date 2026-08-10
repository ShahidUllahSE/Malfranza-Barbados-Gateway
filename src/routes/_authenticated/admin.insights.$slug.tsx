import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  Home,
  Percent,
  Car,
  DollarSign,
  Users,
  AlertCircle,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  listApartmentBookings,
  listTaxiBookings,
  listAllApartments,
  listEnquiries,
} from "@/lib/admin";
import { calcRollingOccupancy, inventorySlots } from "@/lib/occupancy";
import {
  StatusPill,
  AdminPageHeader,
  AdminEmptyState,
  AdminTableShell,
  AdminTh,
  AdminTd,
  AdminTr,
  AdminTableCard,
  RefBadge,
  TableShimmer,
  AdminPanel,
  Shimmer,
} from "@/components/admin/AdminBits";

const SLUGS = [
  "arrivals",
  "upcoming",
  "occupancy",
  "taxi-today",
  "revenue",
  "in-house",
  "pending",
  "enquiries",
] as const;

type InsightSlug = (typeof SLUGS)[number];

function isInsightSlug(value: string): value is InsightSlug {
  return (SLUGS as readonly string[]).includes(value);
}

const META: Record<
  InsightSlug,
  {
    title: string;
    description: string;
    icon: typeof Home;
    manageTo: string;
    manageLabel: string;
  }
> = {
  arrivals: {
    title: "Today's arrivals",
    description: "Guests checking in today — full contact, stay, and payment details.",
    icon: CalendarCheck,
    manageTo: "/admin/bookings",
    manageLabel: "All bookings",
  },
  upcoming: {
    title: "Upcoming stays",
    description: "Confirmed and pending reservations with check-in from today onward.",
    icon: Home,
    manageTo: "/admin/bookings",
    manageLabel: "All bookings",
  },
  occupancy: {
    title: "Occupancy (30 days)",
    description: "Booked nights vs capacity over the next 30 days, by apartment.",
    icon: Percent,
    manageTo: "/admin/calendar",
    manageLabel: "Open calendar",
  },
  "taxi-today": {
    title: "Taxi trips today",
    description: "All non-cancelled rides scheduled for today with fare and driver info.",
    icon: Car,
    manageTo: "/admin/taxi",
    manageLabel: "Taxi board",
  },
  revenue: {
    title: "Paid revenue",
    description: "Every paid stay booking with totals, payment status, and guest details.",
    icon: DollarSign,
    manageTo: "/admin/reports",
    manageLabel: "Reports",
  },
  "in-house": {
    title: "Guests in-house",
    description: "Guests currently checked in — who is on property right now.",
    icon: Users,
    manageTo: "/admin/bookings",
    manageLabel: "All bookings",
  },
  pending: {
    title: "Pending bookings",
    description: "Reservations awaiting confirmation — review and confirm or cancel.",
    icon: AlertCircle,
    manageTo: "/admin/bookings",
    manageLabel: "All bookings",
  },
  enquiries: {
    title: "New enquiries",
    description: "Unread contact messages that still need a reply.",
    icon: MessageSquare,
    manageTo: "/admin/enquiries",
    manageLabel: "Enquiry inbox",
  },
};

export const Route = createFileRoute("/_authenticated/admin/insights/$slug")({
  params: {
    parse: (params) => {
      if (!isInsightSlug(params.slug)) throw notFound();
      return { slug: params.slug };
    },
  },
  component: InsightDetailPage,
});

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function moneyExact(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function InsightDetailPage() {
  const { slug } = Route.useParams();
  const meta = META[slug];
  const Icon = meta.icon;

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

  const data = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.status !== "cancelled");
    const todaysCheckIns = bookings.filter(
      (b) =>
        b.check_in === today &&
        (b.status === "confirmed" || b.status === "pending" || b.status === "checked_in"),
    );
    const todaysCheckOuts = bookings.filter(
      (b) => b.check_out === today && (b.status === "checked_in" || b.status === "confirmed"),
    );
    const upcoming = bookings
      .filter((b) => b.check_in >= today && (b.status === "confirmed" || b.status === "pending"))
      .sort((a, b) => a.check_in.localeCompare(b.check_in));
    const pending = bookings.filter((b) => b.status === "pending");
    const inHouse = bookings.filter((b) => b.status === "checked_in");
    const paid = activeBookings
      .filter((b) => b.payment_status === "paid")
      .sort((a, b) => String(b.created_at ?? b.check_in).localeCompare(String(a.created_at ?? a.check_in)));
    const paidRevenue = paid.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const monthStart = today.slice(0, 7);
    const monthRevenue = paid
      .filter((b) => String(b.created_at ?? b.check_in).startsWith(monthStart))
      .reduce((sum, b) => sum + Number(b.total_amount), 0);
    const taxisToday = taxis
      .filter((t) => t.pickup_date === today && t.status !== "cancelled")
      .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));
    const pendingTaxis = taxis.filter((t) => t.status === "pending" || t.status === "confirmed");
    const newEnquiries = enquiries.filter((e) => e.status === "new");

    const horizon = 30;
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + horizon);
    const activeApts = apts.filter((a) => a.is_active);
    const aptBreakdown = activeApts.map((apt) => {
      let nights = 0;
      const related: typeof bookings = [];
      for (const b of bookings) {
        if (b.status === "cancelled") continue;
        if (String(b.apartment_id) !== String(apt.id)) continue;
        const ci = new Date(b.check_in);
        const co = new Date(b.check_out);
        const s = ci < start ? start : ci;
        const e = co > end ? end : co;
        const n = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
        if (n > 0) {
          nights += n;
          related.push(b);
        }
      }
      const slots = inventorySlots(apt);
      const occupancyPct = Math.min(100, Math.round((nights / Math.max(1, slots * horizon)) * 100));
      return {
        apt,
        nights,
        occupancy: occupancyPct,
        slots,
        bookings: related,
      };
    });

    const occ = calcRollingOccupancy(bookings, apts, horizon);
    const occupancy = occ.occupancy;
    const bookedNights = occ.bookedNights;
    const activeCount = occ.inventory;

    const contributing = bookings
      .filter((b) => {
        if (b.status === "cancelled") return false;
        const ci = new Date(b.check_in);
        const co = new Date(b.check_out);
        return co > start && ci < end;
      })
      .sort((a, b) => a.check_in.localeCompare(b.check_in));

    return {
      todaysCheckIns,
      todaysCheckOuts,
      upcoming,
      pending,
      inHouse,
      paid,
      paidRevenue,
      monthRevenue,
      taxisToday,
      pendingTaxis,
      newEnquiries,
      occupancy,
      bookedNights,
      availableNights: occ.availableNights,
      activeCount,
      aptBreakdown,
      contributing,
      horizon,
    };
  }, [bookings, taxis, apts, enquiries, today]);

  const [openId, setOpenId] = useState<string | null>(null);

  const summary = (() => {
    switch (slug) {
      case "arrivals":
        return [
          { label: "Arrivals", value: data.todaysCheckIns.length },
          { label: "Check-outs", value: data.todaysCheckOuts.length },
          {
            label: "Guests arriving",
            value: data.todaysCheckIns.reduce((s, b) => s + Number(b.guests), 0),
          },
        ];
      case "upcoming":
        return [
          { label: "Upcoming", value: data.upcoming.length },
          { label: "Pending", value: data.pending.length },
          {
            label: "Nights booked",
            value: data.upcoming.reduce((s, b) => s + Number(b.nights), 0),
          },
        ];
      case "occupancy":
        return [
          { label: "Occupancy", value: `${data.occupancy}%` },
          { label: "Booked nights", value: data.bookedNights },
          { label: "Active units", value: data.activeCount },
        ];
      case "taxi-today":
        return [
          { label: "Trips today", value: data.taxisToday.length },
          { label: "Need attention", value: data.pendingTaxis.length },
          {
            label: "Fare total",
            value: money(data.taxisToday.reduce((s, t) => s + Number(t.estimated_fare), 0)),
          },
        ];
      case "revenue":
        return [
          { label: "Paid total", value: money(data.paidRevenue) },
          { label: "This month", value: money(data.monthRevenue) },
          { label: "Paid bookings", value: data.paid.length },
        ];
      case "in-house":
        return [
          { label: "In-house", value: data.inHouse.length },
          {
            label: "Guests",
            value: data.inHouse.reduce((s, b) => s + Number(b.guests), 0),
          },
          {
            label: "Nights remaining",
            value: data.inHouse.reduce((s, b) => {
              const left = Math.max(
                0,
                Math.round((new Date(b.check_out).getTime() - new Date(today).getTime()) / 86400000),
              );
              return s + left;
            }, 0),
          },
        ];
      case "pending":
        return [
          { label: "Pending", value: data.pending.length },
          {
            label: "Potential revenue",
            value: money(data.pending.reduce((s, b) => s + Number(b.total_amount), 0)),
          },
          {
            label: "With taxi",
            value: data.pending.filter((b) => b.taxi_addon).length,
          },
        ];
      case "enquiries":
        return [
          { label: "New", value: data.newEnquiries.length },
          { label: "All enquiries", value: enquiries.length },
          {
            label: "Responded",
            value: enquiries.filter((e) => e.status === "responded").length,
          },
        ];
    }
  })();

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <AdminPageHeader
        title={meta.title}
        description={meta.description}
        meta={
          <Link
            to={meta.manageTo}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm hover:bg-brand-cream"
          >
            {meta.manageLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-card sm:p-5">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
          <Icon className="h-5 w-5" />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, i) => <Shimmer key={i} className="h-12 w-full rounded-xl" />)
            : summary.map((item) => (
                <div key={item.label} className="rounded-xl bg-brand-cream/60 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-lg font-display font-bold text-brand-charcoal">{item.value}</p>
                </div>
              ))}
        </div>
      </div>

      {loading ? (
        <TableShimmer rows={6} cols={6} />
      ) : slug === "arrivals" ? (
        <>
          <BookingDetailTable
            title="Check-ins today"
            empty="No arrivals scheduled for today"
            rows={data.todaysCheckIns}
            openId={openId}
            setOpenId={setOpenId}
          />
          <BookingDetailTable
            title="Check-outs today"
            empty="No departures scheduled for today"
            rows={data.todaysCheckOuts}
            openId={openId}
            setOpenId={setOpenId}
          />
        </>
      ) : slug === "upcoming" ? (
        <BookingDetailTable
          title="Upcoming stays"
          empty="No upcoming stays"
          rows={data.upcoming}
          openId={openId}
          setOpenId={setOpenId}
        />
      ) : slug === "in-house" ? (
        <BookingDetailTable
          title="Currently checked in"
          empty="No guests currently in-house"
          rows={data.inHouse}
          openId={openId}
          setOpenId={setOpenId}
        />
      ) : slug === "pending" ? (
        <BookingDetailTable
          title="Awaiting confirmation"
          empty="No pending bookings"
          rows={data.pending}
          openId={openId}
          setOpenId={setOpenId}
        />
      ) : slug === "revenue" ? (
        <BookingDetailTable
          title="Paid bookings"
          empty="No paid bookings yet"
          rows={data.paid}
          openId={openId}
          setOpenId={setOpenId}
          showPayment
        />
      ) : slug === "taxi-today" ? (
        <TaxiDetailTable rows={data.taxisToday} />
      ) : slug === "enquiries" ? (
        <EnquiryDetailList rows={data.newEnquiries} />
      ) : (
        <OccupancyDetail
          occupancy={data.occupancy}
          bookedNights={data.bookedNights}
          availableNights={data.availableNights}
          horizon={data.horizon}
          activeCount={data.activeCount}
          aptBreakdown={data.aptBreakdown}
          contributing={data.contributing}
          openId={openId}
          setOpenId={setOpenId}
        />
      )}
    </div>
  );
}

type BookingRow = Awaited<ReturnType<typeof listApartmentBookings>>[number];

function BookingDetailTable({
  title,
  empty,
  rows,
  openId,
  setOpenId,
  showPayment,
}: {
  title: string;
  empty: string;
  rows: BookingRow[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  showPayment?: boolean;
}) {
  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <AdminPanel title={title} description={`${rows.length} record${rows.length === 1 ? "" : "s"}`}>
      {rows.length === 0 ? (
        <AdminEmptyState message={empty} />
      ) : (
        <AdminTableCard footer={`Showing ${rows.length} booking${rows.length === 1 ? "" : "s"}`}>
          <div className="divide-y divide-slate-100 lg:hidden">
            {rows.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setOpenId(b.id)}
                className="flex w-full flex-col gap-2 p-4 text-left hover:bg-brand-cream/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-charcoal">{b.guest_name}</p>
                    <div className="mt-1">
                      <RefBadge>{b.booking_reference}</RefBadge>
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {b.apartments?.name ?? "Stay"} · {b.check_in} → {b.check_out}
                </p>
                <p className="text-sm font-semibold text-brand-green">{moneyExact(b.total_amount)}</p>
              </button>
            ))}
          </div>
          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh>Reference</AdminTh>
                <AdminTh>Guest</AdminTh>
                <AdminTh>Contact</AdminTh>
                <AdminTh>Apartment</AdminTh>
                <AdminTh>Dates</AdminTh>
                <AdminTh>Guests</AdminTh>
                <AdminTh>Total</AdminTh>
                {showPayment && <AdminTh>Payment</AdminTh>}
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <AdminTr key={b.id} onClick={() => setOpenId(b.id)}>
                  <AdminTd nowrap>
                    <RefBadge>{b.booking_reference}</RefBadge>
                  </AdminTd>
                  <AdminTd nowrap>
                    <div className="font-semibold text-brand-charcoal">{b.guest_name}</div>
                  </AdminTd>
                  <AdminTd className="text-xs">
                    <div className="truncate" title={b.guest_email}>{b.guest_email}</div>
                    <div className="truncate text-muted-foreground">{b.guest_phone}</div>
                  </AdminTd>
                  <AdminTd>
                    <span
                      className="block truncate text-[13px]"
                      title={`${b.apartments?.name ?? "—"}${b.unit_name ? ` · ${b.unit_name}` : ""}`}
                    >
                      {b.apartments?.name ?? "—"}
                      {b.unit_name ? ` · ${b.unit_name}` : ""}
                    </span>
                  </AdminTd>
                  <AdminTd nowrap className="text-xs">
                    {b.check_in} → {b.check_out}
                    <div className="text-muted-foreground">{b.nights} nights</div>
                  </AdminTd>
                  <AdminTd nowrap>{b.guests}</AdminTd>
                  <AdminTd nowrap>
                    <span className="font-bold text-brand-charcoal">{moneyExact(b.total_amount)}</span>
                  </AdminTd>
                  {showPayment && (
                    <AdminTd nowrap>
                      <StatusPill status={b.payment_status} />
                    </AdminTd>
                  )}
                  <AdminTd nowrap>
                    <StatusPill status={b.status} />
                  </AdminTd>
                </AdminTr>
              ))}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}

      {open && (
        <InsightDrawer onClose={() => setOpenId(null)}>
          <BookingDrawerBody booking={open} />
        </InsightDrawer>
      )}
    </AdminPanel>
  );
}

function BookingDrawerBody({ booking: b }: { booking: BookingRow }) {
  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <RefBadge>{b.booking_reference}</RefBadge>
        <StatusPill status={b.status} />
        <StatusPill status={b.payment_status} />
      </div>
      <h2 className="mt-3 text-xl font-display font-bold text-brand-charcoal">{b.guest_name}</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {b.apartments?.name ?? "Apartment"}
        {b.unit_name ? ` · ${b.unit_name}` : ""}
      </p>

      <div className="space-y-4 text-sm">
        <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Guest details
          </h3>
          <Field label="Email">{b.guest_email}</Field>
          <Field label="Phone">{b.guest_phone}</Field>
          {b.user_account && (
            <Field label="Account">
              {b.user_account.name} · {b.user_account.email}
            </Field>
          )}
          <Field label="Party size">{b.guests}</Field>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stay
          </h3>
          <Field label="Check-in / out">
            {b.check_in} → {b.check_out} ({b.nights} nights)
          </Field>
          <Field label="Stay subtotal">{moneyExact(b.stay_subtotal)}</Field>
          <Field label="Service fee">{moneyExact(b.service_fee)}</Field>
          {b.taxi_addon && <Field label="Taxi fare">{moneyExact(b.taxi_fare)}</Field>}
          <Field label="Total">
            <span className="font-bold text-brand-green">{moneyExact(b.total_amount)}</span>
          </Field>
          {b.payment_reference && <Field label="Payment ref">{b.payment_reference}</Field>}
          {b.special_requests && <Field label="Requests">{b.special_requests}</Field>}
        </section>

        {b.taxi_addon && (
          <section className="space-y-3 rounded-xl border border-orange-200/80 bg-orange-50/40 p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-orange">
              Taxi add-on
            </h3>
            <Field label="Pickup">{b.taxi_pickup ?? "—"}</Field>
            <Field label="Drop-off">{b.taxi_dropoff ?? "—"}</Field>
            <Field label="When">
              {b.taxi_date ?? "—"} {b.taxi_time ?? ""}
            </Field>
            <Field label="Passengers">{b.taxi_passengers ?? "—"}</Field>
            {b.taxi_notes && <Field label="Notes">{b.taxi_notes}</Field>}
          </section>
        )}

        <Link
          to="/admin/bookings"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
        >
          Manage in bookings <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  );
}

function TaxiDetailTable({ rows }: { rows: Awaited<ReturnType<typeof listTaxiBookings>> }) {
  const navigate = useNavigate();

  return (
    <AdminPanel title="Today's taxi trips" description={`${rows.length} trip${rows.length === 1 ? "" : "s"}`}>
      {rows.length === 0 ? (
        <AdminEmptyState message="No taxi trips scheduled for today" />
      ) : (
        <AdminTableCard>
          <div className="divide-y divide-slate-100 lg:hidden">
            {rows.map((t) => (
              <Link
                key={t.id}
                to="/admin/taxi/$id"
                params={{ id: t.id }}
                className="flex flex-col gap-2 p-4 hover:bg-brand-cream/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-charcoal">{t.customer_name}</p>
                    <RefBadge>{t.booking_reference}</RefBadge>
                  </div>
                  <StatusPill status={t.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.pickup_time} · {t.service_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.pickup_location} → {t.dropoff_location}
                </p>
              </Link>
            ))}
          </div>
          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh>Reference</AdminTh>
                <AdminTh>Customer</AdminTh>
                <AdminTh>Service</AdminTh>
                <AdminTh>Route</AdminTh>
                <AdminTh>Time</AdminTh>
                <AdminTh>Driver</AdminTh>
                <AdminTh>Fare</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <AdminTr
                  key={t.id}
                  onClick={() => navigate({ to: "/admin/taxi/$id", params: { id: t.id } })}
                >
                  <AdminTd nowrap>
                    <RefBadge>{t.booking_reference}</RefBadge>
                  </AdminTd>
                  <AdminTd nowrap>
                    <div className="font-semibold">{t.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{t.customer_phone}</div>
                  </AdminTd>
                  <AdminTd nowrap>{t.service_type}</AdminTd>
                  <AdminTd className="max-w-[16rem] text-xs">
                    <div className="line-clamp-1">{t.pickup_location}</div>
                    <div className="line-clamp-1 text-muted-foreground">→ {t.dropoff_location}</div>
                  </AdminTd>
                  <AdminTd nowrap>
                    {t.pickup_time}
                    <div className="text-xs text-muted-foreground">{t.passengers} pax</div>
                  </AdminTd>
                  <AdminTd nowrap className="text-xs">
                    {t.driver?.name ?? <span className="text-amber-700">Unassigned</span>}
                  </AdminTd>
                  <AdminTd nowrap className="font-semibold">
                    {moneyExact(t.estimated_fare)}
                  </AdminTd>
                  <AdminTd nowrap>
                    <StatusPill status={t.status} />
                  </AdminTd>
                </AdminTr>
              ))}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}
    </AdminPanel>
  );
}

function EnquiryDetailList({ rows }: { rows: Awaited<ReturnType<typeof listEnquiries>> }) {
  return (
    <AdminPanel title="New enquiries" description={`${rows.length} needing a reply`}>
      {rows.length === 0 ? (
        <AdminEmptyState message="No new enquiries — inbox is clear" />
      ) : (
        <div className="space-y-3">
          {rows.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-brand-charcoal">{e.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {e.email}
                    {e.phone ? ` · ${e.phone}` : ""}
                  </p>
                </div>
                <StatusPill status={e.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-brand-cream px-2.5 py-1 font-medium text-brand-green">
                  {e.interested_in}
                </span>
                {e.preferred_dates && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    {e.preferred_dates}
                  </span>
                )}
                {e.reference && <RefBadge>{e.reference}</RefBadge>}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-brand-charcoal/90">
                {e.message}
              </p>
              {e.created_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Received {new Date(e.created_at).toLocaleString()}
                </p>
              )}
            </div>
          ))}
          <Link
            to="/admin/enquiries"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
          >
            Open enquiry inbox <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </AdminPanel>
  );
}

function OccupancyDetail({
  occupancy,
  bookedNights,
  availableNights,
  horizon,
  activeCount,
  aptBreakdown,
  contributing,
  openId,
  setOpenId,
}: {
  occupancy: number;
  bookedNights: number;
  availableNights: number;
  horizon: number;
  activeCount: number;
  aptBreakdown: Array<{
    apt: Awaited<ReturnType<typeof listAllApartments>>[number];
    nights: number;
    occupancy: number;
    bookings: BookingRow[];
  }>;
  contributing: BookingRow[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  return (
    <div className="space-y-5">
      <AdminPanel
        title="30-day outlook"
        description="Live calc · room-nights booked ÷ (inventory slots × 30 days)"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-display font-bold text-brand-green">{occupancy}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bookedNights} booked ÷ {availableNights} available (
              {activeCount} inventory unit{activeCount === 1 ? "" : "s"} × {horizon} days)
            </p>
          </div>
          <Link
            to="/admin/calendar"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
          >
            Full calendar <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-cream">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-sage to-brand-green"
            style={{ width: `${occupancy}%` }}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="By apartment" description="Occupancy contribution per active unit">
        {aptBreakdown.length === 0 ? (
          <AdminEmptyState message="No active apartments" />
        ) : (
          <div className="space-y-3">
            {aptBreakdown.map(({ apt, nights, occupancy: occ }) => (
              <div
                key={apt.id}
                className="rounded-xl border border-border/70 bg-brand-cream/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-charcoal">{apt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {nights} booked nights · {occ}% of next {horizon} days
                    </p>
                  </div>
                  <span className="text-lg font-display font-bold text-brand-green">{occ}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-brand-green/80"
                    style={{ width: `${occ}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      <BookingDetailTable
        title="Bookings in the 30-day window"
        empty="No bookings overlapping the next 30 days"
        rows={contributing}
        openId={openId}
        setOpenId={setOpenId}
      />
    </div>
  );
}

function InsightDrawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <p className="text-sm font-semibold text-brand-charcoal">Booking details</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-brand-charcoal sm:text-right">{children}</span>
    </div>
  );
}
