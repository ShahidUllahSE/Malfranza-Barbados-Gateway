import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AptBookingStatus, TaxiStatus, EnquiryStatus } from "@/lib/admin";

export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`mfz-shimmer rounded-md ${className}`} aria-hidden="true" />;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  loading = false,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "orange" | "sage" | "amber";
  loading?: boolean;
  to?: string;
}) {
  const tones = {
    default: "bg-brand-sage/20 text-brand-green",
    orange: "bg-brand-orange/15 text-brand-orange",
    sage: "bg-brand-green/10 text-brand-green",
    amber: "bg-amber-100 text-amber-700",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-3">
          <Shimmer className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-7 w-16" />
            <Shimmer className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const body = (
    <div className="flex items-start gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          {to && (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-brand-green" />
          )}
        </div>
        <div className="mt-1 text-2xl font-display font-bold leading-none text-brand-charcoal">{value}</div>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  const className =
    "group rounded-2xl border border-border/60 bg-white p-4 shadow-card transition-all hover:border-brand-sage/40 hover:shadow-card-hover sm:p-5";

  if (to) {
    return (
      <Link to={to} className={`${className} block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

type AnyStatus = AptBookingStatus | TaxiStatus | EnquiryStatus | string;

export function StatusPill({ status }: { status: AnyStatus }) {
  const map: Record<string, { cls: string; dot: string }> = {
    confirmed: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", dot: "bg-emerald-500" },
    checked_in: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", dot: "bg-emerald-500" },
    completed: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", dot: "bg-emerald-500" },
    responded: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", dot: "bg-emerald-500" },
    assigned: { cls: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80", dot: "bg-sky-500" },
    en_route: { cls: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80", dot: "bg-indigo-500" },
    paid: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80", dot: "bg-emerald-500" },
    pending: { cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80", dot: "bg-amber-500" },
    new: { cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80", dot: "bg-amber-500" },
    unpaid: { cls: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80", dot: "bg-slate-400" },
    checked_out: { cls: "bg-violet-50 text-violet-800 ring-1 ring-violet-200/80", dot: "bg-violet-400" },
    cancelled: { cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80", dot: "bg-rose-400" },
    closed: { cls: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80", dot: "bg-slate-400" },
  };
  const style = map[status] ?? { cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200/80", dot: "bg-slate-400" };
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize tracking-wide ${style.cls}`}
      title={String(status).replaceAll("_", " ")}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className="truncate">{String(status).replaceAll("_", " ")}</span>
    </span>
  );
}

export function RefBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-md bg-brand-cream/80 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-brand-charcoal/80 ring-1 ring-brand-sage/25" title={typeof children === "string" ? children : undefined}>
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
        active
          ? "bg-brand-green text-white shadow-sm shadow-brand-green/20"
          : "bg-white text-brand-charcoal ring-1 ring-slate-200 hover:bg-brand-cream/60 hover:ring-brand-sage/40"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-brand-cream text-brand-green"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function AdminPageHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight text-brand-charcoal sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {meta}
    </div>
  );
}

/** Full-width desktop admin table — no horizontal scroll; text truncates inside cells. */
export function AdminTableShell({
  children,
  /** @deprecated Kept for call-site compatibility; tables always fit the container. */
  minWidth: _minWidth,
}: {
  children: React.ReactNode;
  minWidth?: string;
}) {
  void _minWidth;
  return (
    <div className="hidden w-full lg:block">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function AdminTableCard({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-card">
      {children}
      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {footer}
        </div>
      )}
    </div>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`min-w-0 border-b border-slate-200/80 bg-[#F7F8F6] px-2.5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-charcoal/55 first:pl-4 last:pr-4 ${className}`}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
  nowrap = false,
}: {
  children: React.ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <td
      className={`min-w-0 overflow-hidden border-b border-slate-100 px-2.5 py-3 align-middle text-sm text-brand-charcoal first:pl-4 last:pr-4 ${
        nowrap ? "whitespace-nowrap" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** Single-line cell text that truncates with native tooltip for the full value. */
export function AdminCellText({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 truncate ${className}`}
      title={title ?? (typeof children === "string" ? children : undefined)}
    >
      {children}
    </div>
  );
}

export function AdminTr({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors ${
        onClick ? "cursor-pointer" : ""
      } hover:bg-brand-cream/40`}
    >
      {children}
    </tr>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-cream text-brand-green">
        <span className="text-lg font-bold">∅</span>
      </div>
      <p className="text-sm font-medium text-brand-charcoal">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Try adjusting filters or search.</p>
    </div>
  );
}

export function TableShimmer({
  rows = 6,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: Math.min(cols, 5) }, (_, i) => (
            <Shimmer key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }, (_, c) => (
              <Shimmer
                key={c}
                className={`h-3.5 ${c === 0 ? "w-24" : c === 1 ? "w-32" : "w-16"} ${c > 3 ? "hidden sm:block" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border/60 bg-white shadow-card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-brand-charcoal">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

type ApartmentRow = {
  id: string;
  name: string;
  is_active: boolean;
  subtitle?: string | null;
  type?: string;
  bedrooms?: number;
};
type BookingRow = {
  id: string;
  apartment_id: string;
  check_in: string;
  check_out: string;
  status: AptBookingStatus;
  guest_name: string;
  booking_reference?: string;
};

const TYPE_LABEL: Record<string, string> = {
  "one-bedroom": "1-bed",
  "two-bedroom": "2-bed",
  "three-bedroom": "3-bed",
};

export function BookingsCalendar({
  apartments,
  bookings,
  loading = false,
}: {
  apartments: ApartmentRow[];
  bookings: BookingRow[];
  loading?: boolean;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = cursor;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = isCurrentMonth ? now.getDate() : -1;
  const [selectedDay, setSelectedDay] = useState(isCurrentMonth ? now.getDate() : 1);

  const active = apartments.filter((a) => a.is_active);
  const aptName = (id: string) =>
    active.find((a) => String(a.id) === String(id))?.name ??
    apartments.find((a) => String(a.id) === String(id))?.name ??
    "Apartment";

  function isoDay(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function formatNiceDate(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function nightsBetween(checkIn: string, checkOut: string) {
    const [yi, mi, di] = checkIn.split("-").map(Number);
    const [yo, mo, do_] = checkOut.split("-").map(Number);
    return Math.max(
      0,
      Math.round(
        (new Date(yo, mo - 1, do_).getTime() - new Date(yi, mi - 1, di).getTime()) / 86400000,
      ),
    );
  }

  function weekdayShort(day: number) {
    return new Date(year, month, day).toLocaleDateString("en-US", { weekday: "narrow" });
  }

  function isWeekend(day: number) {
    const wd = new Date(year, month, day).getDay();
    return wd === 0 || wd === 6;
  }

  type CellInfo = {
    kind: "check-in" | "check-out" | "booked" | "available";
    guest?: string;
    reference?: string;
    stay?: string;
    bookingId?: string;
  };

  function cellFor(aptId: string, day: number): CellInfo {
    const d = isoDay(day);
    const blocking = new Set(["pending", "confirmed", "checked_in"]);
    for (const b of bookings) {
      if (String(b.apartment_id) !== String(aptId)) continue;
      if (!blocking.has(b.status)) continue;
      const stay = `${b.check_in} → ${b.check_out}`;
      if (b.check_in === d) {
        return {
          kind: "check-in",
          guest: b.guest_name,
          reference: b.booking_reference,
          stay,
          bookingId: b.id,
        };
      }
      if (b.check_out === d) {
        return {
          kind: "check-out",
          guest: b.guest_name,
          reference: b.booking_reference,
          stay,
          bookingId: b.id,
        };
      }
      if (d > b.check_in && d < b.check_out) {
        return {
          kind: "booked",
          guest: b.guest_name,
          reference: b.booking_reference,
          stay,
          bookingId: b.id,
        };
      }
    }
    return { kind: "available" };
  }

  const monthStart = isoDay(1);
  const monthEnd = isoDay(daysInMonth);
  const blocking = new Set(["pending", "confirmed", "checked_in"]);

  const monthStays = bookings
    .filter((b) => {
      if (!blocking.has(b.status)) return false;
      if (b.check_out <= monthStart || b.check_in > monthEnd) return false;
      return active.some((a) => String(a.id) === String(b.apartment_id));
    })
    .map((b) => {
      const nights = nightsBetween(b.check_in, b.check_out);
      return {
        ...b,
        nights,
        apartmentName: aptName(b.apartment_id),
        summary: `${formatNiceDate(b.check_in)} → ${formatNiceDate(b.check_out)} · ${aptName(b.apartment_id)} is booked for ${nights} night${nights === 1 ? "" : "s"} by ${b.guest_name}`,
      };
    })
    .sort((a, b) => a.check_in.localeCompare(b.check_in) || a.apartmentName.localeCompare(b.apartmentName));

  const selectedIso = isoDay(Math.min(Math.max(1, selectedDay), daysInMonth));
  const selectedLabel = formatNiceDate(selectedIso);

  const dayStays = monthStays.filter(
    (b) => b.check_in <= selectedIso && b.check_out > selectedIso,
  );
  const dayCheckIns = monthStays.filter((b) => b.check_in === selectedIso);
  const dayCheckOuts = monthStays.filter((b) => b.check_out === selectedIso);
  const freeApts = active.filter(
    (a) => !dayStays.some((b) => String(b.apartment_id) === String(a.id)),
  );

  const monthStats = (() => {
    let bookedNights = 0;
    for (const b of monthStays) {
      const ci = Math.max(new Date(b.check_in).getTime(), new Date(monthStart).getTime());
      const co = Math.min(new Date(b.check_out).getTime(), new Date(monthEnd).getTime() + 86400000);
      bookedNights += Math.max(0, Math.round((co - ci) / 86400000));
    }
    const capacity = Math.max(1, active.length) * daysInMonth;
    const occupancy = Math.min(100, Math.round((bookedNights / capacity) * 100));
    return { bookedNights, stays: monthStays.length, occupancy };
  })();

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    const next = { year: d.getFullYear(), month: d.getMonth() };
    const nextIsCurrent = next.year === now.getFullYear() && next.month === now.getMonth();
    setCursor(next);
    setSelectedDay(nextIsCurrent ? now.getDate() : 1);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between gap-3">
          <Shimmer className="h-10 w-48" />
          <Shimmer className="h-8 w-56" />
        </div>
        <Shimmer className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-charcoal transition hover:border-brand-sage/50 hover:bg-brand-cream"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[10.5rem] text-center">
            <p className="font-display text-lg font-bold text-brand-charcoal sm:text-xl">{monthLabel}</p>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => {
                  setCursor({ year: now.getFullYear(), month: now.getMonth() });
                  setSelectedDay(now.getDate());
                }}
                className="text-[11px] font-semibold text-brand-green hover:underline"
              >
                Jump to today
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-charcoal transition hover:border-brand-sage/50 hover:bg-brand-cream"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <LegendDot tone="available" label="Available" />
          <LegendDot tone="booked" label="Booked" />
          <LegendDot tone="check-in" label="Check-in" />
          <LegendDot tone="check-out" label="Check-out" />
        </div>
      </div>

      {/* Month snapshot */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MiniMetric label="Occupancy" value={`${monthStats.occupancy}%`} />
        <MiniMetric label="Booked nights" value={monthStats.bookedNights} />
        <MiniMetric label="Active stays" value={monthStats.stays} />
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-2xl border border-brand-sage/20 bg-gradient-to-b from-brand-cream/40 to-white shadow-inner">
        <div className="overflow-x-auto">
          <div
            className="min-w-[720px]"
            style={{
              display: "grid",
              gridTemplateColumns: `minmax(11.5rem, 14rem) repeat(${daysInMonth}, minmax(1.65rem, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 border-b border-r border-brand-sage/15 bg-[#F7F5F0] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Apartment
              </p>
              <p className="mt-0.5 text-xs text-brand-charcoal/70">{active.length} active</p>
            </div>

            {days.map((d) => {
              const weekend = isWeekend(d);
              const isToday = d === todayDay;
              const isSelected = d === selectedDay;
              return (
                <button
                  key={`h-${d}`}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`border-b border-brand-sage/15 px-0.5 py-2 text-center transition ${
                    isSelected
                      ? "bg-brand-green/15"
                      : isToday
                        ? "bg-brand-orange/10"
                        : weekend
                          ? "bg-brand-sage/10"
                          : "bg-[#F7F5F0] hover:bg-brand-cream"
                  }`}
                >
                  <div
                    className={`text-[10px] font-medium uppercase ${
                      isSelected
                        ? "text-brand-green"
                        : isToday
                          ? "text-brand-orange"
                          : "text-muted-foreground"
                    }`}
                  >
                    {weekdayShort(d)}
                  </div>
                  <div
                    className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-brand-green text-white shadow-sm"
                        : isToday
                          ? "bg-brand-orange text-white shadow-sm shadow-brand-orange/30"
                          : "text-brand-charcoal"
                    }`}
                  >
                    {d}
                  </div>
                </button>
              );
            })}

            {active.length === 0 && (
              <div className="col-span-full px-4 py-12 text-center text-sm text-muted-foreground">
                No active apartments to show.
              </div>
            )}

            {active.map((a, rowIdx) => {
              const typeLabel = a.type ? TYPE_LABEL[a.type] ?? a.type : null;
              const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-[#FBFAf7]";
              return (
                <FragmentRow key={a.id}>
                  <div
                    className={`sticky left-0 z-10 border-r border-brand-sage/15 px-3 py-2.5 ${rowBg}`}
                  >
                    <p className="truncate text-sm font-semibold leading-tight text-brand-charcoal" title={a.name}>
                      {a.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {[typeLabel, a.subtitle, a.bedrooms != null ? `${a.bedrooms} br` : null]
                        .filter(Boolean)
                        .join(" · ") || "Stay"}
                    </p>
                  </div>
                  {days.map((d) => {
                    const cell = cellFor(a.id, d);
                    const weekend = isWeekend(d);
                    const isToday = d === todayDay;
                    const isSelected = d === selectedDay;
                    const title =
                      cell.kind === "available"
                        ? `${a.name} · ${isoDay(d)} · Available`
                        : `${cell.guest ?? "Guest"} · ${cell.kind.replace("-", " ")} · ${cell.stay ?? ""}${
                            cell.reference ? ` · ${cell.reference}` : ""
                          }`;
                    return (
                      <button
                        key={`${a.id}-${d}`}
                        type="button"
                        title={title}
                        onClick={() => setSelectedDay(d)}
                        className={`relative flex items-center justify-center p-1 ${rowBg} ${
                          isSelected
                            ? "bg-brand-green/[0.08] ring-1 ring-inset ring-brand-green/25"
                            : isToday
                              ? "bg-brand-orange/[0.06]"
                              : weekend
                                ? "bg-brand-sage/[0.06]"
                                : ""
                        }`}
                      >
                        <CalendarCell cell={cell} isToday={isToday} />
                      </button>
                    );
                  })}
                </FragmentRow>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click any day to see who is staying. Green highlight = selected day.
      </p>

      {/* Day + month overview */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-2xl border border-brand-sage/25 bg-gradient-to-br from-brand-green/[0.06] to-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-green">
                Selected day overview
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-brand-charcoal">
                {selectedLabel}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">
                {dayCheckIns.length} check-in{dayCheckIns.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">
                {dayCheckOuts.length} check-out{dayCheckOuts.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                {dayStays.length} occupied
              </span>
            </div>
          </div>

          {dayStays.length === 0 && dayCheckOuts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-brand-sage/40 bg-white/70 px-4 py-6 text-center text-sm text-muted-foreground">
              All apartments are free on {selectedLabel}.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {dayCheckIns.map((b) => (
                <OverviewCard
                  key={`in-${b.id}`}
                  tone="check-in"
                  eyebrow="Check-in today"
                  title={`${b.apartmentName} · ${b.nights} night${b.nights === 1 ? "" : "s"}`}
                  body={`Booked by ${b.guest_name} from ${formatNiceDate(b.check_in)} to ${formatNiceDate(b.check_out)}.`}
                  meta={b.booking_reference}
                  status={b.status}
                />
              ))}
              {dayStays
                .filter((b) => b.check_in !== selectedIso)
                .map((b) => {
                  const nightsLeft = nightsBetween(selectedIso, b.check_out);
                  return (
                    <OverviewCard
                      key={`stay-${b.id}`}
                      tone="booked"
                      eyebrow="Currently occupied"
                      title={`${b.apartmentName} · ${b.nights} night stay`}
                      body={`Booked by ${b.guest_name}. Staying ${formatNiceDate(b.check_in)} → ${formatNiceDate(b.check_out)} (${nightsLeft} night${nightsLeft === 1 ? "" : "s"} left including tonight).`}
                      meta={b.booking_reference}
                      status={b.status}
                    />
                  );
                })}
              {dayCheckOuts.map((b) => (
                <OverviewCard
                  key={`out-${b.id}`}
                  tone="check-out"
                  eyebrow="Check-out today"
                  title={`${b.apartmentName} frees up`}
                  body={`${b.guest_name} checks out today after a ${b.nights}-night stay (${formatNiceDate(b.check_in)} → ${formatNiceDate(b.check_out)}).`}
                  meta={b.booking_reference}
                  status={b.status}
                />
              ))}
            </ul>
          )}

          {freeApts.length > 0 && dayStays.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Still available: {freeApts.map((a) => a.name).join(", ")}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Month stay list
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-brand-charcoal">
                Who’s booked in {monthLabel}
              </h3>
            </div>
            <span className="rounded-full bg-brand-cream px-2.5 py-1 text-xs font-semibold text-brand-green">
              {monthStays.length}
            </span>
          </div>

          {monthStays.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No active bookings overlap this month.
            </p>
          ) : (
            <ul className="mt-4 max-h-[28rem] space-y-2.5 overflow-y-auto pr-1">
              {monthStays.map((b) => {
                const coversSelected = b.check_in <= selectedIso && b.check_out > selectedIso;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const [y, m, d] = b.check_in.split("-").map(Number);
                        if (y === year && m - 1 === month) setSelectedDay(d);
                        else {
                          // jump to check-in day if in this month window; else first overlapping day
                          const startDay =
                            b.check_in < monthStart ? 1 : Number(b.check_in.slice(8, 10));
                          setSelectedDay(startDay);
                        }
                      }}
                      className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                        coversSelected
                          ? "border-brand-green/40 bg-brand-green/[0.06] ring-1 ring-brand-green/20"
                          : "border-slate-200/80 bg-slate-50/40 hover:border-brand-sage/40 hover:bg-brand-cream/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-charcoal">{b.guest_name}</p>
                          <p className="mt-0.5 text-xs font-medium text-brand-green">
                            {b.apartmentName}
                          </p>
                        </div>
                        <StatusPill status={b.status} />
                      </div>
                      <p className="mt-2 text-sm leading-snug text-brand-charcoal/85">
                        {formatNiceDate(b.check_in)} → {formatNiceDate(b.check_out)} ·{" "}
                        <span className="font-semibold">{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.apartmentName} is booked for {b.nights} night{b.nights === 1 ? "" : "s"} by{" "}
                        {b.guest_name}
                        {b.booking_reference ? ` · ${b.booking_reference}` : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function OverviewCard({
  tone,
  eyebrow,
  title,
  body,
  meta,
  status,
}: {
  tone: "check-in" | "check-out" | "booked";
  eyebrow: string;
  title: string;
  body: string;
  meta?: string;
  status: AptBookingStatus;
}) {
  const toneCls = {
    "check-in": "border-sky-200 bg-sky-50/70",
    "check-out": "border-violet-200 bg-violet-50/70",
    booked: "border-emerald-200 bg-emerald-50/70",
  } as const;
  const eyeCls = {
    "check-in": "text-sky-700",
    "check-out": "text-violet-700",
    booked: "text-emerald-700",
  } as const;

  return (
    <li className={`rounded-xl border px-3.5 py-3 ${toneCls[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wide ${eyeCls[tone]}`}>{eyebrow}</p>
          <p className="mt-0.5 text-sm font-semibold text-brand-charcoal">{title}</p>
        </div>
        <StatusPill status={status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-brand-charcoal/85">{body}</p>
      {meta && <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{meta}</p>}
    </li>
  );
}

function CalendarCell({
  cell,
  isToday,
}: {
  cell: { kind: "check-in" | "check-out" | "booked" | "available"; guest?: string };
  isToday: boolean;
}) {
  if (cell.kind === "available") {
    return (
      <div
        className={`h-7 w-full rounded-md border ${
          isToday
            ? "border-brand-orange/35 bg-white"
            : "border-slate-200/80 bg-slate-50/80"
        }`}
      />
    );
  }

  const styles = {
    booked: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
    "check-in": "bg-sky-500 text-white shadow-sm shadow-sky-500/25",
    "check-out": "bg-violet-500 text-white shadow-sm shadow-violet-500/25",
  } as const;

  const initial = (cell.guest ?? "?").trim().charAt(0).toUpperCase() || "·";

  return (
    <div
      className={`flex h-7 w-full items-center justify-center rounded-md text-[10px] font-bold ${styles[cell.kind]}`}
    >
      {initial}
    </div>
  );
}

function LegendDot({
  tone,
  label,
}: {
  tone: "available" | "booked" | "check-in" | "check-out";
  label: string;
}) {
  const cls = {
    available: "border border-slate-200 bg-slate-50",
    booked: "bg-emerald-500",
    "check-in": "bg-sky-500",
    "check-out": "bg-violet-500",
  } as const;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-charcoal ring-1 ring-slate-200/80">
      <span className={`h-2.5 w-2.5 rounded-sm ${cls[tone]}`} />
      {label}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-brand-sage/20 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-brand-charcoal">{value}</p>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
