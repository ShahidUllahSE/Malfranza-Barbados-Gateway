import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  Phone,
  Route as RouteIcon,
  Car,
  Clock3,
  XCircle,
  Activity,
} from "lucide-react";
import {
  getDriverDetail,
  type DriverDetailFilters,
  type DriverTripStatus,
} from "@/lib/drivers";
import { AdminTableShell, AdminTd, AdminTh, StatusPill } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/drivers_/$id")({
  component: DriverDetailPage,
});

type DayPreset = NonNullable<DriverDetailFilters["day"]>;
type StatusFilter = "all" | DriverTripStatus;

const DAY_PRESETS: { id: DayPreset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "assigned", label: "Assigned" },
  { id: "en_route", label: "En route" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function DriverDetailPage() {
  const { id } = Route.useParams();
  const [day, setDay] = useState<DayPreset>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters = useMemo<DriverDetailFilters>(() => {
    if (fromDate || toDate) {
      return {
        status,
        day: "all",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
    }
    return { status, day };
  }, [day, status, fromDate, toDate]);

  const q = useQuery({
    queryKey: ["admin", "drivers", id, filters],
    queryFn: () => getDriverDetail(id, filters),
  });

  const driver = q.data?.driver;
  const stats = q.data?.stats;
  const trips = q.data?.trips ?? [];

  function applyDay(next: DayPreset) {
    setDay(next);
    setFromDate("");
    setToDate("");
  }

  function clearCustomDates() {
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/drivers"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to drivers
          </Link>
          {q.isLoading && !driver ? (
            <p className="text-sm text-muted-foreground">Loading driver…</p>
          ) : q.isError ? (
            <div>
              <h1 className="font-display text-2xl font-bold text-brand-charcoal">Driver not found</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {q.error instanceof Error ? q.error.message : "Could not load this driver."}
              </p>
            </div>
          ) : driver ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-brand-charcoal sm:text-3xl">
                  {driver.name}
                </h1>
                <Badge active={driver.isActive} on="Active" off="Inactive" />
                <Badge active={driver.isAvailable} on="Available" off="Unavailable" tone="blue" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {driver.email} · {driver.phone}
                {driver.vehicleLabel ? ` · ${driver.vehicleLabel}` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
          <Metric
            icon={RouteIcon}
            label="Total rides"
            value={stats.total}
            hint="All assigned trips"
          />
          <Metric
            icon={CheckCircle2}
            label="Completed"
            value={stats.completed}
            hint={`${stats.completedToday} today · ${stats.completedThisWeek} this week`}
            accent="emerald"
          />
          <Metric
            icon={Activity}
            label="Active now"
            value={stats.activeNow}
            hint={`${stats.assigned} assigned · ${stats.enRoute} en route`}
            accent="blue"
          />
          <Metric
            icon={CircleDollarSign}
            label="Fare earned"
            value={`$${stats.fareEarned.toFixed(0)}`}
            hint={`${stats.cancelled} cancelled`}
            accent="amber"
          />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Assigned" value={stats.assigned} />
          <MiniStat label="En route" value={stats.enRoute} />
          <MiniStat label="Completed today" value={stats.completedToday} />
          <MiniStat label="Cancelled" value={stats.cancelled} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-brand-charcoal">Ride history</h2>
              <p className="text-sm text-muted-foreground">
                Filter by day, custom date range, or status.
                {q.isFetching ? " Updating…" : ` Showing ${trips.length} ride${trips.length === 1 ? "" : "s"}.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DAY_PRESETS.map((preset) => {
                const active = !fromDate && !toDate && day === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDay(preset.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-brand-green text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block min-w-[9rem] flex-1">
                <span className="mb-1 block text-xs font-medium text-brand-charcoal">From date</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDay("all");
                  }}
                  className={filterInput}
                />
              </label>
              <label className="block min-w-[9rem] flex-1">
                <span className="mb-1 block text-xs font-medium text-brand-charcoal">To date</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDay("all");
                  }}
                  className={filterInput}
                />
              </label>
              <label className="block min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs font-medium text-brand-charcoal">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  className={filterInput}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={clearCustomDates}
                  className="h-10 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 lg:hidden">
          {trips.map((trip) => (
            <div key={trip.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-charcoal">{trip.customerName}</p>
                  <p className="text-xs text-muted-foreground">{trip.bookingReference}</p>
                </div>
                <StatusPill status={trip.status} />
              </div>
              <p className="flex items-start gap-1.5 text-sm text-brand-charcoal">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
                <span className="min-w-0">
                  {trip.pickupLocation} → {trip.dropoffLocation}
                </span>
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {trip.pickupDate} · {trip.pickupTime}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {trip.serviceType}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {trip.customerPhone}
                </span>
                <span className="font-semibold text-brand-charcoal">${trip.estimatedFare.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {trips.length === 0 && (
            <EmptyTrips loading={q.isLoading} />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block">
          <AdminTableShell minWidth="64rem">
            <thead className="bg-slate-50">
              <tr>
                <AdminTh>Guest</AdminTh>
                <AdminTh>Route</AdminTh>
                <AdminTh>Pickup</AdminTh>
                <AdminTh>Service</AdminTh>
                <AdminTh>Fare</AdminTh>
                <AdminTh className="sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  Status
                </AdminTh>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="group border-t border-slate-100">
                  <AdminTd>
                    <div className="min-w-[10rem]">
                      <div className="font-medium text-brand-charcoal">{trip.customerName}</div>
                      <div className="text-xs text-muted-foreground">{trip.bookingReference}</div>
                      <div className="text-xs text-muted-foreground">{trip.customerPhone}</div>
                    </div>
                  </AdminTd>
                  <AdminTd className="max-w-[18rem]">
                    <div className="text-sm leading-snug">
                      <span className="text-brand-charcoal">{trip.pickupLocation}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="text-brand-charcoal">{trip.dropoffLocation}</span>
                    </div>
                  </AdminTd>
                  <AdminTd nowrap>
                    <div className="text-sm">{trip.pickupDate}</div>
                    <div className="text-xs text-muted-foreground">{trip.pickupTime}</div>
                  </AdminTd>
                  <AdminTd nowrap className="text-sm">
                    {trip.serviceType}
                    <div className="text-xs text-muted-foreground">
                      {trip.passengers} pax
                      {trip.durationMinutes != null ? ` · ~${trip.durationMinutes} min` : ""}
                    </div>
                  </AdminTd>
                  <AdminTd nowrap className="font-semibold">
                    ${trip.estimatedFare.toFixed(0)}
                  </AdminTd>
                  <AdminTd
                    nowrap
                    className="sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)] group-hover:bg-slate-50"
                  >
                    <StatusPill status={trip.status} />
                  </AdminTd>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    {q.isLoading ? "Loading rides…" : "No rides match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  accent = "green",
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "green" | "emerald" | "blue" | "amber";
}) {
  const tone =
    accent === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : accent === "blue"
        ? "bg-blue-50 text-blue-700"
        : accent === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-brand-sage/25 text-brand-green";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold text-brand-charcoal">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-xl font-bold text-brand-charcoal">{value}</div>
    </div>
  );
}

function Badge({
  active,
  on,
  off,
  tone = "green",
}: {
  active: boolean;
  on: string;
  off: string;
  tone?: "green" | "blue";
}) {
  const onCls = tone === "blue" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? onCls : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? on : off}
    </span>
  );
}

function EmptyTrips({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading rides…</p>
      ) : (
        <>
          <XCircle className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-brand-charcoal">No rides match these filters</p>
          <p className="text-xs text-muted-foreground">Try another day range or status.</p>
        </>
      )}
    </div>
  );
}

const filterInput =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-brand-charcoal";
