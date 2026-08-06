import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,  
  YAxis,
} from "recharts";
import {
  BarChart3,
  BedDouble,
  CalendarRange,
  Car,
  CircleDollarSign,
  Filter,
  Info,
  RefreshCw,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  listApartmentBookings,
  listAllApartments,
  listTaxiBookings,
  listEnquiries,
  type AptBookingStatus,
} from "@/lib/admin";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmptyState,
  AdminTableCard,
  AdminTableShell,
  AdminTh,
  AdminTd,
  AdminTr,
  FilterChip,
  RefBadge,
  StatusPill,
  StatCard,
  Shimmer,
  TableShimmer,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

type RangePreset = "7d" | "30d" | "month" | "year" | "all" | "custom";
type ReportTab = "overview" | "stays" | "money" | "taxi";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#10B981",
  checked_in: "#059669",
  checked_out: "#8B5CF6",
  cancelled: "#F43F5E",
};

const CHART = {
  green: "#2D5A3D",
  sage: "#7C9A82",
  orange: "#E07A3D",
  amber: "#F59E0B",
  sky: "#0EA5E9",
  violet: "#8B5CF6",
  slate: "#94A3B8",
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  fontSize: 12,
};

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function moneyExact(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthStartISO(iso = todayISO()) {
  return `${iso.slice(0, 7)}-01`;
}

function yearStartISO(iso = todayISO()) {
  return `${iso.slice(0, 4)}-01-01`;
}

function formatMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatDayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `Week of ${new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function startOfWeekISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Sun
  dt.setDate(dt.getDate() - day);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

type TrendGrain = "daily" | "weekly" | "monthly";
type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  paid: number;
  bookings: number;
  nights: number;
};

function bucketKey(iso: string, grain: TrendGrain) {
  if (grain === "daily") return iso;
  if (grain === "weekly") return startOfWeekISO(iso);
  return iso.slice(0, 7);
}

function labelForKey(key: string, grain: TrendGrain) {
  if (grain === "daily") return formatDayLabel(key);
  if (grain === "weekly") return formatWeekLabel(key);
  return formatMonthLabel(key);
}

function buildFilledKeys(from: string, to: string, grain: TrendGrain) {
  if (!from || !to || from > to) return [] as string[];
  const keys: string[] = [];
  if (grain === "daily") {
    let cur = from;
    while (cur <= to) {
      keys.push(cur);
      cur = addDaysISO(cur, 1);
      if (keys.length > 400) break;
    }
    return keys;
  }
  if (grain === "weekly") {
    let cur = startOfWeekISO(from);
    const end = startOfWeekISO(to);
    while (cur <= end) {
      keys.push(cur);
      cur = addDaysISO(cur, 7);
      if (keys.length > 120) break;
    }
    return keys;
  }
  // monthly
  let [y, m] = from.split("-").map(Number);
  const [ey, em] = to.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (keys.length > 60) break;
  }
  return keys;
}

function buildRevenueTrend(
  bookings: Array<{
    check_in: string;
    total_amount: number;
    payment_status: string;
    nights: number;
  }>,
  grain: TrendGrain,
  fromDate: string,
  toDate: string,
): TrendPoint[] {
  const map = new Map<string, TrendPoint>();

  const inferredFrom =
    fromDate ||
    bookings.reduce((min, b) => (b.check_in < min ? b.check_in : min), bookings[0]?.check_in ?? todayISO());
  const inferredTo =
    toDate ||
    bookings.reduce((max, b) => (b.check_in > max ? b.check_in : max), bookings[0]?.check_in ?? todayISO());

  for (const key of buildFilledKeys(inferredFrom, inferredTo, grain)) {
    map.set(key, {
      key,
      label: labelForKey(key, grain),
      revenue: 0,
      paid: 0,
      bookings: 0,
      nights: 0,
    });
  }

  for (const b of bookings) {
    const key = bucketKey(b.check_in, grain);
    const row =
      map.get(key) ??
      ({
        key,
        label: labelForKey(key, grain),
        revenue: 0,
        paid: 0,
        bookings: 0,
        nights: 0,
      } satisfies TrendPoint);
    row.revenue += Number(b.total_amount);
    if (b.payment_status === "paid") row.paid += Number(b.total_amount);
    row.bookings += 1;
    row.nights += Number(b.nights);
    map.set(key, row);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function shortAptName(name: string) {
  if (name.length <= 18) return name;
  return `${name.slice(0, 16)}…`;
}

function ReportsPage() {
  const bookingsQ = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const taxiQ = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const aptsQ = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const enquiriesQ = useQuery({ queryKey: ["admin", "enquiries"], queryFn: listEnquiries });

  const loading =
    bookingsQ.isLoading || taxiQ.isLoading || aptsQ.isLoading || enquiriesQ.isLoading;

  const [tab, setTab] = useState<ReportTab>("overview");
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [fromDate, setFromDate] = useState(shiftDays(todayISO(), -29));
  const [toDate, setToDate] = useState(todayISO());
  const [apartmentId, setApartmentId] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AptBookingStatus | "active">("active");
  const [filtersOpen, setFiltersOpen] = useState(false);

  function applyPreset(next: RangePreset) {
    setPreset(next);
    const today = todayISO();
    if (next === "7d") {
      setFromDate(shiftDays(today, -6));
      setToDate(today);
    } else if (next === "30d") {
      setFromDate(shiftDays(today, -29));
      setToDate(today);
    } else if (next === "month") {
      setFromDate(monthStartISO(today));
      setToDate(today);
    } else if (next === "year") {
      setFromDate(yearStartISO(today));
      setToDate(today);
    } else if (next === "all") {
      setFromDate("");
      setToDate("");
    }
  }

  function resetFilters() {
    applyPreset("30d");
    setApartmentId("all");
    setPaymentFilter("all");
    setStatusFilter("active");
  }

  const apartments = aptsQ.data ?? [];
  const allBookings = bookingsQ.data ?? [];
  const allTaxis = taxiQ.data ?? [];
  const enquiries = enquiriesQ.data ?? [];

  const filtered = useMemo(() => {
    let rows = allBookings;
    if (statusFilter === "active") rows = rows.filter((b) => b.status !== "cancelled");
    else if (statusFilter !== "all") rows = rows.filter((b) => b.status === statusFilter);
    if (paymentFilter !== "all") rows = rows.filter((b) => b.payment_status === paymentFilter);
    if (apartmentId !== "all") rows = rows.filter((b) => String(b.apartment_id) === apartmentId);
    if (fromDate || toDate) {
      const start = fromDate || "0000-01-01";
      const end = toDate || "9999-12-31";
      rows = rows.filter((b) => b.check_in <= end && b.check_out > start);
    }
    return rows;
  }, [allBookings, statusFilter, paymentFilter, apartmentId, fromDate, toDate]);

  const filteredTaxis = useMemo(() => {
    let rows = allTaxis.filter((t) => t.status !== "cancelled");
    if (fromDate || toDate) {
      const start = fromDate || "0000-01-01";
      const end = toDate || "9999-12-31";
      rows = rows.filter((t) => t.pickup_date >= start && t.pickup_date <= end);
    }
    return rows;
  }, [allTaxis, fromDate, toDate]);

  const filteredEnquiries = useMemo(() => {
    let rows = enquiries;
    if (fromDate || toDate) {
      const start = fromDate || "0000-01-01";
      const end = toDate || "9999-12-31";
      rows = rows.filter((e) => {
        const created = String(e.created_at ?? "").slice(0, 10);
        return created >= start && created <= end;
      });
    }
    return rows;
  }, [enquiries, fromDate, toDate]);

  const activeBookings = useMemo(
    () => filtered.filter((b) => b.status !== "cancelled"),
    [filtered],
  );

  const stats = useMemo(() => {
    const paid = activeBookings.filter((b) => b.payment_status === "paid");
    const unpaid = activeBookings.filter((b) => b.payment_status !== "paid");
    const gross = activeBookings.reduce((s, b) => s + Number(b.total_amount), 0);
    const paidRevenue = paid.reduce((s, b) => s + Number(b.total_amount), 0);
    const unpaidRevenue = unpaid.reduce((s, b) => s + Number(b.total_amount), 0);
    const nights = activeBookings.reduce((s, b) => s + Number(b.nights), 0);
    const guests = activeBookings.reduce((s, b) => s + Number(b.guests), 0);
    const taxiFare = filteredTaxis.reduce((s, t) => s + Number(t.estimated_fare), 0);
    return {
      bookings: activeBookings.length,
      nights,
      guests,
      gross,
      paidRevenue,
      unpaidRevenue,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      avgNightly: nights > 0 ? gross / nights : 0,
      avgBooking: activeBookings.length > 0 ? gross / activeBookings.length : 0,
      taxiTrips: filteredTaxis.length,
      taxiFare,
      withTaxi: activeBookings.filter((b) => b.taxi_addon).length,
      enquiries: filteredEnquiries.length,
      newEnquiries: filteredEnquiries.filter((e) => e.status === "new").length,
      paidPct: gross > 0 ? Math.round((paidRevenue / gross) * 100) : 0,
    };
  }, [activeBookings, filteredTaxis, filteredEnquiries]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<
      string,
      { month: string; revenue: number; paid: number; bookings: number; nights: number }
    >();
    for (const b of activeBookings) {
      const key = b.check_in.slice(0, 7);
      const row = map.get(key) ?? { month: key, revenue: 0, paid: 0, bookings: 0, nights: 0 };
      row.revenue += Number(b.total_amount);
      if (b.payment_status === "paid") row.paid += Number(b.total_amount);
      row.bookings += 1;
      row.nights += Number(b.nights);
      map.set(key, row);
    }
    return [...map.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ ...r, label: formatMonthLabel(r.month) }));
  }, [activeBookings]);

  const checkInsByWeekday = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = labels.map((label) => ({ label, checkIns: 0 }));
    for (const b of activeBookings) {
      const [y, m, d] = b.check_in.split("-").map(Number);
      const wd = new Date(y, m - 1, d).getDay();
      counts[wd].checkIns += 1;
    }
    return counts;
  }, [activeBookings]);

  const byApartment = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; bookings: number; nights: number; revenue: number; paid: number }
    >();
    for (const b of activeBookings) {
      const id = String(b.apartment_id);
      const name =
        b.apartments?.name ?? apartments.find((a) => String(a.id) === id)?.name ?? "Apartment";
      const row = map.get(id) ?? { id, name, bookings: 0, nights: 0, revenue: 0, paid: 0 };
      row.bookings += 1;
      row.nights += Number(b.nights);
      row.revenue += Number(b.total_amount);
      if (b.payment_status === "paid") row.paid += Number(b.total_amount);
      map.set(id, row);
    }
    return [...map.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((r) => ({ ...r, short: shortAptName(r.name) }));
  }, [activeBookings, apartments]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of filtered) counts[b.status] = (counts[b.status] ?? 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({
      name,
      label: name.replaceAll("_", " "),
      value,
    }));
  }, [filtered]);

  const paymentMix = useMemo(
    () =>
      [
        { name: "Paid", value: stats.paidRevenue, count: stats.paidCount },
        { name: "Unpaid", value: stats.unpaidRevenue, count: stats.unpaidCount },
      ].filter((x) => x.value > 0 || x.count > 0),
    [stats],
  );

  const taxiByService = useMemo(() => {
    const map = new Map<string, { name: string; trips: number; fare: number }>();
    for (const t of filteredTaxis) {
      const row = map.get(t.service_type) ?? { name: t.service_type, trips: 0, fare: 0 };
      row.trips += 1;
      row.fare += Number(t.estimated_fare);
      map.set(t.service_type, row);
    }
    return [...map.values()].sort((a, b) => b.trips - a.trips);
  }, [filteredTaxis]);

  const taxiTrend = useMemo(() => {
    const map = new Map<string, { day: string; trips: number; fare: number }>();
    for (const t of filteredTaxis) {
      const row = map.get(t.pickup_date) ?? { day: t.pickup_date, trips: 0, fare: 0 };
      row.trips += 1;
      row.fare += Number(t.estimated_fare);
      map.set(t.pickup_date, row);
    }
    return [...map.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((r) => ({ ...r, label: formatDayLabel(r.day) }));
  }, [filteredTaxis]);

  const topBookings = useMemo(
    () =>
      [...activeBookings]
        .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
        .slice(0, 8),
    [activeBookings],
  );

  const rangeLabel = (() => {
    if (preset === "all" || (!fromDate && !toDate)) return "All time";
    if (fromDate && toDate) return `${fromDate} → ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    return `Until ${toDate}`;
  })();

  const activeFilterChips = (
    [
      { key: "range", label: rangeLabel, clear: () => applyPreset("30d") },
      apartmentId !== "all"
        ? {
            key: "apt",
            label: apartments.find((a) => String(a.id) === apartmentId)?.name ?? "Apartment",
            clear: () => setApartmentId("all"),
          }
        : null,
      paymentFilter !== "all"
        ? {
            key: "pay",
            label: paymentFilter === "paid" ? "Paid only" : "Unpaid only",
            clear: () => setPaymentFilter("all"),
          }
        : null,
      statusFilter !== "active"
        ? {
            key: "status",
            label: statusFilter === "all" ? "All statuses" : statusFilter.replaceAll("_", " "),
            clear: () => setStatusFilter("active"),
          }
        : null,
    ] as Array<{ key: string; label: string; clear: () => void } | null>
  ).filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  const insight =
    stats.bookings === 0
      ? "No stay bookings match these filters yet. Try widening the date range."
      : `In this period you have ${stats.bookings} stay${stats.bookings === 1 ? "" : "s"} for ${stats.nights} night${stats.nights === 1 ? "" : "s"}, bringing in ${money(stats.gross)} gross (${stats.paidPct}% already paid). Taxi added ${stats.taxiTrips} trip${stats.taxiTrips === 1 ? "" : "s"} (~${money(stats.taxiFare)}).`;

  const tabs: Array<{ id: ReportTab; label: string; hint: string }> = [
    { id: "overview", label: "Overview", hint: "Big picture" },
    { id: "stays", label: "Stays", hint: "Apartments & nights" },
    { id: "money", label: "Money", hint: "Revenue & payments" },
    { id: "taxi", label: "Taxi", hint: "Rides & fares" },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Reports"
        description="Simple charts and totals — pick a time range, then explore by tab."
        meta={
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm hover:bg-brand-cream"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset filters
          </button>
        }
      />

      <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">When do you want to look at?</p>
            <p className="text-xs text-muted-foreground">Totals and charts update instantly.</p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-charcoal hover:bg-brand-cream sm:self-auto"
          >
            <Filter className="h-3.5 w-3.5" />
            {filtersOpen ? "Hide extra filters" : "More filters"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["7d", "Last 7 days"],
              ["30d", "Last 30 days"],
              ["month", "This month"],
              ["year", "This year"],
              ["all", "All time"],
            ] as const
          ).map(([key, label]) => (
            <FilterChip key={key} active={preset === key} onClick={() => applyPreset(key)}>
              {label}
            </FilterChip>
          ))}
        </div>

        {filtersOpen && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" /> From
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPreset("custom");
                    setFromDate(e.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  To
                </span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPreset("custom");
                    setToDate(e.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apartment
                </span>
                <select
                  value={apartmentId}
                  onChange={(e) => setApartmentId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
                >
                  <option value="all">All apartments</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment
                </span>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid only</option>
                  <option value="unpaid">Unpaid only</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              {(
                [
                  ["active", "Active"],
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["confirmed", "Confirmed"],
                  ["checked_in", "In-house"],
                  ["checked_out", "Checked out"],
                  ["cancelled", "Cancelled"],
                ] as const
              ).map(([key, label]) => (
                <FilterChip key={key} active={statusFilter === key} onClick={() => setStatusFilter(key)}>
                  {label}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {activeFilterChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Showing:</span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full bg-brand-cream px-2.5 py-1 text-xs font-medium text-brand-charcoal ring-1 ring-brand-sage/30 hover:bg-white"
              >
                {chip.label}
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3 rounded-2xl border border-brand-sage/30 bg-gradient-to-r from-brand-green/[0.08] to-brand-cream/80 p-4 sm:p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-charcoal">At a glance</p>
          <p className="mt-1 text-sm leading-relaxed text-brand-charcoal/80">
            {loading ? "Loading your numbers…" : insight}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCard key={i} loading icon={BarChart3} label="…" value="—" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CircleDollarSign}
            label="Gross revenue"
            value={money(stats.gross)}
            hint={`${money(stats.avgBooking)} average per booking`}
            tone="orange"
          />
          <StatCard
            icon={Wallet}
            label="Already paid"
            value={money(stats.paidRevenue)}
            hint={`${stats.paidPct}% of gross · ${money(stats.unpaidRevenue)} still due`}
          />
          <StatCard
            icon={BedDouble}
            label="Stay bookings"
            value={stats.bookings}
            hint={`${stats.nights} nights · ${stats.guests} guests`}
          />
          <StatCard
            icon={Car}
            label="Taxi trips"
            value={stats.taxiTrips}
            hint={`About ${money(stats.taxiFare)} in fares`}
            tone="amber"
          />
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-white p-1.5 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-w-[7rem] flex-1 rounded-xl px-3 py-2.5 text-left transition ${
              tab === t.id
                ? "bg-brand-green text-white shadow-sm"
                : "text-brand-charcoal hover:bg-brand-cream/70"
            }`}
          >
            <span className="block text-sm font-semibold">{t.label}</span>
            <span className={`block text-[11px] ${tab === t.id ? "text-white/75" : "text-muted-foreground"}`}>
              {t.hint}
            </span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          loading={loading}
          bookings={activeBookings}
          fromDate={fromDate}
          toDate={toDate}
          statusBreakdown={statusBreakdown}
          checkInsByWeekday={checkInsByWeekday}
          activeCount={activeBookings.length}
          stats={stats}
        />
      )}

      {tab === "stays" && (
        <StaysTab loading={loading} byApartment={byApartment} />
      )}

      {tab === "money" && (
        <MoneyTab
          loading={loading}
          paymentMix={paymentMix}
          monthlyTrend={monthlyTrend}
          topBookings={topBookings}
          stats={stats}
        />
      )}

      {tab === "taxi" && (
        <TaxiTab
          loading={loading}
          stats={stats}
          taxiTrend={taxiTrend}
          taxiByService={taxiByService}
        />
      )}
    </div>
  );
}

function OverviewTab({
  loading,
  bookings,
  fromDate,
  toDate,
  statusBreakdown,
  checkInsByWeekday,
  activeCount,
  stats,
}: {
  loading: boolean;
  bookings: Array<{
    check_in: string;
    total_amount: number;
    payment_status: string;
    nights: number;
  }>;
  fromDate: string;
  toDate: string;
  statusBreakdown: Array<{ name: string; label: string; value: number }>;
  checkInsByWeekday: Array<{ label: string; checkIns: number }>;
  activeCount: number;
  stats: { avgNightly: number; guests: number; enquiries: number; newEnquiries: number };
}) {
  const [grain, setGrain] = useState<TrendGrain>("daily");
  const [chartFrom, setChartFrom] = useState(fromDate);
  const [chartTo, setChartTo] = useState(toDate);

  useEffect(() => {
    setChartFrom(fromDate);
    setChartTo(toDate);
  }, [fromDate, toDate]);

  const trend = useMemo(
    () => buildRevenueTrend(bookings, grain, chartFrom, chartTo),
    [bookings, grain, chartFrom, chartTo],
  );

  const hasAnyRevenue = trend.some((p) => p.revenue > 0 || p.bookings > 0);
  const grainHint =
    grain === "daily"
      ? "Each point is one calendar day"
      : grain === "weekly"
        ? "Each point is one week (Sun–Sat)"
        : "Each point is one calendar month";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel
          title="Revenue over time"
          description={grainHint}
          action={
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGrain(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    grain === key
                      ? "bg-brand-green text-white"
                      : "bg-brand-cream text-brand-charcoal ring-1 ring-brand-sage/30 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Chart from
              </span>
              <input
                type="date"
                value={chartFrom}
                onChange={(e) => setChartFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Chart to
              </span>
              <input
                type="date"
                value={chartTo}
                onChange={(e) => setChartTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
              />
            </label>
          </div>

          <ChartOrEmpty loading={loading} empty={!hasAnyRevenue} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: grain === "daily" ? 8 : 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.green} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: grain === "daily" ? 10 : 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  interval={grain === "daily" ? "preserveStartEnd" : 0}
                  minTickGap={grain === "daily" ? 28 : 8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={44}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label, payload) => {
                    const key = payload?.[0]?.payload?.key as string | undefined;
                    if (!key) return String(label);
                    if (grain === "daily") return formatDayLabel(key);
                    if (grain === "weekly") return formatWeekLabel(key);
                    return formatMonthLabel(key);
                  }}
                  formatter={(value: number, name: string) => [
                    moneyExact(value),
                    name === "paid" ? "Paid" : "Gross",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross"
                  stroke={CHART.green}
                  fill="url(#revFill)"
                  strokeWidth={2.5}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  name="Paid"
                  stroke={CHART.sage}
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>

        <AdminPanel
          title="Bookings & nights"
          description={`Same ${grain} view as revenue`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGrain(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    grain === key
                      ? "bg-brand-green text-white"
                      : "bg-brand-cream text-brand-charcoal ring-1 ring-brand-sage/30 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <ChartOrEmpty loading={loading} empty={!hasAnyRevenue} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: grain === "daily" ? 10 : 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  interval={grain === "daily" ? "preserveStartEnd" : 0}
                  minTickGap={grain === "daily" ? 28 : 8}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="bookings" name="Bookings" fill={CHART.green} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="nights" name="Nights" fill={CHART.orange} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminPanel title="Booking status mix" description="Where reservations stand right now">
          <ChartOrEmpty loading={loading} empty={statusBreakdown.length === 0} height={260}>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="label" innerRadius={55} outerRadius={84} paddingAngle={3}>
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? CHART.slate} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {statusBreakdown.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ring-slate-200">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] ?? CHART.slate }} />
                    {s.label} · {s.value}
                  </span>
                ))}
              </div>
            </div>
          </ChartOrEmpty>
        </AdminPanel>

        <AdminPanel title="Check-ins by weekday" description="Which days guests usually arrive">
          <ChartOrEmpty loading={loading} empty={activeCount === 0} height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={checkInsByWeekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="checkIns" name="Check-ins" fill={CHART.sky} radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SnapshotCard label="Avg nightly rate" value={moneyExact(stats.avgNightly)} hint="Gross ÷ nights" tone="green" />
        <SnapshotCard label="Guests hosted" value={String(stats.guests)} hint="Across filtered stays" tone="amber" />
        <SnapshotCard label="Enquiries" value={String(stats.enquiries)} hint={`${stats.newEnquiries} still need a reply`} tone="orange" />
      </div>
    </div>
  );
}

function StaysTab({
  loading,
  byApartment,
}: {
  loading: boolean;
  byApartment: Array<{ id: string; name: string; short: string; bookings: number; nights: number; revenue: number; paid: number }>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel title="Revenue by apartment" description="Which properties earn the most">
          <ChartOrEmpty loading={loading} empty={byApartment.length === 0} height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={byApartment} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="short" width={100} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [moneyExact(value), "Revenue"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""} />
                <Bar dataKey="revenue" fill={CHART.green} radius={[0, 8, 8, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>

        <AdminPanel title="Nights by apartment" description="Where guests spend the most nights">
          <ChartOrEmpty loading={loading} empty={byApartment.length === 0} height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={byApartment} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="short" width={100} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Nights"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""} />
                <Bar dataKey="nights" fill={CHART.orange} radius={[0, 8, 8, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>
      </div>

      <AdminPanel title="Apartment performance table" description="Full numbers behind the charts" className="overflow-hidden p-0 [&>div:last-child]:p-0">
        {loading ? (
          <div className="p-4"><TableShimmer rows={4} cols={5} /></div>
        ) : byApartment.length === 0 ? (
          <div className="p-6"><AdminEmptyState message="No apartment data in this range" /></div>
        ) : (
          <AdminTableCard footer={`${byApartment.length} apartment${byApartment.length === 1 ? "" : "s"}`}>
            <AdminTableShell>
              <thead>
                <tr>
                  <AdminTh>Apartment</AdminTh>
                  <AdminTh>Bookings</AdminTh>
                  <AdminTh>Nights</AdminTh>
                  <AdminTh>Revenue</AdminTh>
                  <AdminTh>Paid</AdminTh>
                </tr>
              </thead>
              <tbody>
                {byApartment.map((row) => (
                  <AdminTr key={row.id}>
                    <AdminTd><span className="font-semibold text-brand-charcoal">{row.name}</span></AdminTd>
                    <AdminTd nowrap>{row.bookings}</AdminTd>
                    <AdminTd nowrap>{row.nights}</AdminTd>
                    <AdminTd nowrap><span className="font-bold">{moneyExact(row.revenue)}</span></AdminTd>
                    <AdminTd nowrap className="text-brand-green">{moneyExact(row.paid)}</AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTableShell>
          </AdminTableCard>
        )}
      </AdminPanel>
    </div>
  );
}

function MoneyTab({
  loading,
  paymentMix,
  monthlyTrend,
  topBookings,
  stats,
}: {
  loading: boolean;
  paymentMix: Array<{ name: string; value: number; count: number }>;
  monthlyTrend: Array<{ label: string; revenue: number; paid: number }>;
  topBookings: Array<{
    id: string;
    guest_name: string;
    guest_email: string;
    apartments?: { name?: string } | null;
    check_in: string;
    check_out: string;
    nights: number;
    payment_status: string;
    booking_reference: string;
    total_amount: number;
  }>;
  stats: { paidRevenue: number; unpaidRevenue: number; paidCount: number; unpaidCount: number };
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <AdminPanel title="Paid vs unpaid" description="How much cash is collected vs still owed">
          <ChartOrEmpty loading={loading} empty={paymentMix.length === 0} height={280}>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                      {paymentMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === "Paid" ? CHART.green : CHART.amber} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [moneyExact(value), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SnapshotCard label="Paid" value={money(stats.paidRevenue)} hint={`${stats.paidCount} bookings`} tone="green" />
                <SnapshotCard label="Outstanding" value={money(stats.unpaidRevenue)} hint={`${stats.unpaidCount} bookings`} tone="amber" />
              </div>
            </div>
          </ChartOrEmpty>
        </AdminPanel>

        <AdminPanel title="Gross vs paid by month" description="Green bars = total · sage = collected">
          <ChartOrEmpty loading={loading} empty={monthlyTrend.length === 0} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [moneyExact(value), name === "paid" ? "Paid" : "Gross"]} />
                <Legend />
                <Bar dataKey="revenue" name="Gross" fill={CHART.green} radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="paid" name="Paid" fill={CHART.sage} radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Highest-value stays"
        description="Biggest bookings in this filter"
        action={<Link to="/admin/bookings" className="text-sm font-semibold text-brand-green hover:underline">Open bookings</Link>}
        className="overflow-hidden p-0 [&>div:last-child]:p-0"
      >
        {loading ? (
          <div className="p-4"><TableShimmer rows={5} cols={6} /></div>
        ) : topBookings.length === 0 ? (
          <div className="p-6"><AdminEmptyState message="No bookings match these filters" /></div>
        ) : (
          <AdminTableCard footer={`Top ${topBookings.length} by total`}>
            <AdminTableShell>
              <thead>
                <tr>
                  <AdminTh>Reference</AdminTh>
                  <AdminTh>Guest</AdminTh>
                  <AdminTh>Apartment</AdminTh>
                  <AdminTh>Dates</AdminTh>
                  <AdminTh>Nights</AdminTh>
                  <AdminTh>Payment</AdminTh>
                  <AdminTh>Total</AdminTh>
                </tr>
              </thead>
              <tbody>
                {topBookings.map((b) => (
                  <AdminTr key={b.id}>
                    <AdminTd nowrap><RefBadge>{b.booking_reference}</RefBadge></AdminTd>
                    <AdminTd nowrap>
                      <div className="font-semibold">{b.guest_name}</div>
                      <div className="text-xs text-muted-foreground">{b.guest_email}</div>
                    </AdminTd>
                    <AdminTd>
                      <span className="block truncate text-[13px]" title={b.apartments?.name ?? undefined}>
                        {b.apartments?.name ?? "—"}
                      </span>
                    </AdminTd>
                    <AdminTd nowrap className="text-xs">{b.check_in} → {b.check_out}</AdminTd>
                    <AdminTd nowrap>{b.nights}</AdminTd>
                    <AdminTd nowrap><StatusPill status={b.payment_status} /></AdminTd>
                    <AdminTd nowrap><span className="font-bold">{moneyExact(b.total_amount)}</span></AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTableShell>
          </AdminTableCard>
        )}
      </AdminPanel>
    </div>
  );
}

function TaxiTab({
  loading,
  stats,
  taxiTrend,
  taxiByService,
}: {
  loading: boolean;
  stats: { taxiTrips: number; taxiFare: number };
  taxiTrend: Array<{ label: string; trips: number; fare: number }>;
  taxiByService: Array<{ name: string; trips: number; fare: number }>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Car} label="Trips" value={stats.taxiTrips} hint="Non-cancelled in range" tone="amber" />
        <StatCard icon={CircleDollarSign} label="Estimated fares" value={money(stats.taxiFare)} hint="Sum of trip estimates" tone="orange" />
        <StatCard icon={TrendingUp} label="Avg fare" value={moneyExact(stats.taxiTrips ? stats.taxiFare / stats.taxiTrips : 0)} hint="Per trip in this filter" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel title="Taxi activity over time" description="Trips and fare totals by day">
          <ChartOrEmpty loading={loading} empty={taxiTrend.length === 0} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={taxiTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [name === "fare" ? moneyExact(value) : value, name === "fare" ? "Fare" : "Trips"]} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="trips" name="Trips" stroke={CHART.orange} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="fare" name="Fare" stroke={CHART.violet} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>

        <AdminPanel title="Trips by service type" description="Airport, point-to-point, and more">
          <ChartOrEmpty loading={loading} empty={taxiByService.length === 0} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxiByService} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="trips" name="Trips" fill={CHART.orange} radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </AdminPanel>
      </div>

      <AdminPanel title="Service breakdown" description="Fare contribution per service">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Shimmer key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : taxiByService.length === 0 ? (
          <AdminEmptyState message="No taxi trips in this range" />
        ) : (
          <div className="space-y-3">
            {taxiByService.map((row) => {
              const max = Math.max(...taxiByService.map((r) => r.fare), 1);
              const pct = Math.round((row.fare / max) * 100);
              return (
                <div key={row.name} className="rounded-xl border border-border/70 bg-brand-cream/30 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-charcoal">{row.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.trips} trip{row.trips === 1 ? "" : "s"}</p>
                    </div>
                    <p className="text-sm font-bold text-brand-green">{moneyExact(row.fare)}</p>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-brand-orange/80" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <Link to="/admin/taxi" className="inline-flex text-sm font-semibold text-brand-green hover:underline">
              Open taxi board →
            </Link>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}

function ChartOrEmpty({
  loading,
  empty,
  height,
  children,
}: {
  loading: boolean;
  empty: boolean;
  height: number;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div style={{ height }}>
        <Shimmer className="h-full w-full rounded-xl" />
      </div>
    );
  }
  if (empty) return <AdminEmptyState message="Nothing to chart for these filters" />;
  return <div style={{ height }}>{children}</div>;
}

function SnapshotCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "orange";
}) {
  const tones = {
    green: "from-emerald-50 to-white border-emerald-200/70",
    amber: "from-amber-50 to-white border-amber-200/70",
    orange: "from-orange-50 to-white border-orange-200/70",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-brand-charcoal sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
