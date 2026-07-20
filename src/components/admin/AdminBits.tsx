import type { LucideIcon } from "lucide-react";
import type { AptBookingStatus, TaxiStatus, EnquiryStatus } from "@/lib/admin";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand-sage/25 grid place-items-center shrink-0">
          <Icon className="h-5 w-5 text-brand-green" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-display font-bold text-brand-charcoal">{value}</div>
        </div>
      </div>
    </div>
  );
}

type AnyStatus = AptBookingStatus | TaxiStatus | EnquiryStatus | string;

export function StatusPill({ status }: { status: AnyStatus }) {
  const map: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-800",
    checked_in: "bg-emerald-100 text-emerald-800",
    completed: "bg-emerald-100 text-emerald-800",
    responded: "bg-emerald-100 text-emerald-800",
    assigned: "bg-blue-100 text-blue-800",
    en_route: "bg-indigo-100 text-indigo-800",
    paid: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    new: "bg-amber-100 text-amber-800",
    unpaid: "bg-slate-200 text-slate-700",
    checked_out: "bg-slate-200 text-slate-700",
    cancelled: "bg-slate-200 text-slate-700",
    closed: "bg-slate-200 text-slate-700",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {String(status).replaceAll("_", " ")}
    </span>
  );
}

/** Scrollable desktop admin table — keeps status pills fully visible. */
export function AdminTableShell({
  children,
  minWidth = "64rem",
}: {
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
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
      className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-charcoal/80 whitespace-nowrap ${className}`}
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
    <td className={`px-3 py-3 align-middle text-brand-charcoal ${nowrap ? "whitespace-nowrap" : ""} ${className}`}>
      {children}
    </td>
  );
}

type ApartmentRow = { id: string; name: string; is_active: boolean };
type BookingRow = {
  id: string;
  apartment_id: string;
  check_in: string;
  check_out: string;
  status: AptBookingStatus;
  guest_name: string;
};

export function BookingsCalendar({
  apartments,
  bookings,
}: {
  apartments: ApartmentRow[];
  bookings: BookingRow[];
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const active = apartments.filter((a) => a.is_active);

  function statusFor(aptId: string, day: number): { cls: string; label: string } | null {
    const d = new Date(year, month, day).toISOString().slice(0, 10);
    const blocking = new Set(["pending", "confirmed", "checked_in"]);
    for (const b of bookings) {
      if (b.apartment_id !== aptId) continue;
      if (!blocking.has(b.status)) continue;
      if (b.check_in === d) return { cls: "bg-blue-500", label: "Check-in" };
      if (b.check_out === d) return { cls: "bg-purple-500", label: "Check-out" };
      if (d > b.check_in && d < b.check_out) return { cls: "bg-emerald-500", label: "Booked" };
    }
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="font-semibold text-brand-charcoal">{monthLabel}</div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend cls="bg-slate-200" label="Available" />
          <Legend cls="bg-emerald-500" label="Booked" />
          <Legend cls="bg-blue-500" label="Check-in" />
          <Legend cls="bg-purple-500" label="Check-out" />
        </div>
      </div>
      <div className="overflow-x-auto -mx-1 px-1 pb-1 lg:overflow-visible">
        <div className="min-w-[480px] sm:min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: `minmax(100px,140px) repeat(${daysInMonth}, minmax(16px, 1fr))` }}>
            <div />
            {days.map((d) => (
              <div key={d} className="text-[10px] text-center text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {active.map((a) => (
              <FragmentRow key={a.id}>
                <div className="text-xs font-medium text-brand-charcoal py-1.5 pr-2 truncate">
                  {a.name}
                </div>
                {days.map((d) => {
                  const s = statusFor(a.id, d);
                  return (
                    <div key={`${a.id}-${d}`} className="p-0.5">
                      <div
                        className={`h-5 rounded ${s ? s.cls : "bg-slate-100"}`}
                        title={s?.label ?? "Available"}
                      />
                    </div>
                  );
                })}
              </FragmentRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-3 rounded ${cls}`} />
      {label}
    </span>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
