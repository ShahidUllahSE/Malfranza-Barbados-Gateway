import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { listTaxiBookings, taxiHasAssignedDriver, type TaxiStatus } from "@/lib/admin";
import {
  StatusPill,
  AdminTableShell,
  AdminTh,
  AdminTd,
  AdminTr,
  AdminTableCard,
  AdminPageHeader,
  AdminEmptyState,
  FilterChip,
  RefBadge,
  TableShimmer,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/taxi")({
  component: TaxiPage,
});

const STATUSES: (TaxiStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "assigned",
  "en_route",
  "completed",
  "cancelled",
];

function TaxiPage() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const all = q.data ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length };
    for (const s of STATUSES) {
      if (s === "all") continue;
      counts[s] = all.filter((b) => b.status === s).length;
    }
    return counts;
  }, [all]);

  const rows = useMemo(() => {
    let items = all;
    if (status !== "all") items = items.filter((b) => b.status === status);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(s) ||
          b.booking_reference.toLowerCase().includes(s) ||
          (taxiHasAssignedDriver(b.status) ? b.driver?.name ?? "" : "").toLowerCase().includes(s),
      );
    }
    return items;
  }, [all, status, search]);

  function openTrip(id: string) {
    navigate({ to: "/admin/taxi/$id", params: { id } });
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Taxi Trips"
        description="Open a trip for full details and driver progress. Free vehicles are assigned when available; you can reassign anytime."
        meta={
          !q.isLoading && (
            <div className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm">
              {rows.length} shown · {all.length} total
            </div>
          )
        }
      />

      <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, driver, or reference…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={status === s}
              onClick={() => setStatus(s)}
              count={statusCounts[s]}
            >
              {s.replace("_", " ")}
            </FilterChip>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <TableShimmer rows={8} cols={6} />
      ) : (
        <AdminTableCard
          footer={
            rows.length > 0 ? `Showing ${rows.length} trip${rows.length === 1 ? "" : "s"}` : undefined
          }
        >
          <div className="divide-y divide-slate-100 lg:hidden">
            {rows.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => openTrip(b.id)}
                className="flex w-full flex-col gap-2.5 p-4 text-left transition hover:bg-brand-cream/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-charcoal">{b.customer_name}</p>
                    <div className="mt-1">
                      <RefBadge>{b.booking_reference}</RefBadge>
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <p className="text-sm text-brand-charcoal">{b.service_type}</p>
                {taxiHasAssignedDriver(b.status) && b.driver ? (
                  <p className="text-xs font-medium text-brand-green">Driver: {b.driver.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {b.pickup_date} · {b.pickup_time}
                </p>
              </button>
            ))}
            {rows.length === 0 && <AdminEmptyState message="No trips match your filters" />}
          </div>

          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh className="w-[11%]">Reference</AdminTh>
                <AdminTh className="w-[16%]">Customer</AdminTh>
                <AdminTh className="w-[12%]">Driver</AdminTh>
                <AdminTh className="w-[12%]">Service</AdminTh>
                <AdminTh className="w-[12%]">Pickup</AdminTh>
                <AdminTh className="w-[25%]">Route</AdminTh>
                <AdminTh className="w-[12%]">Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <AdminTr key={b.id} onClick={() => openTrip(b.id)}>
                  <AdminTd>
                    <RefBadge>{b.booking_reference}</RefBadge>
                  </AdminTd>
                  <AdminTd>
                    <div className="truncate font-semibold text-brand-charcoal" title={b.customer_name}>
                      {b.customer_name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground" title={b.customer_email}>
                      {b.customer_email}
                    </div>
                  </AdminTd>
                  <AdminTd className="text-xs">
                    {taxiHasAssignedDriver(b.status) && b.driver ? (
                      <Link
                        to="/admin/drivers/$id"
                        params={{ id: b.driver.id }}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-semibold text-brand-green hover:underline"
                        title={b.driver.name}
                      >
                        {b.driver.name}
                      </Link>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Unassigned
                      </span>
                    )}
                  </AdminTd>
                  <AdminTd>
                    <span className="block truncate text-[13px]" title={b.service_type}>
                      {b.service_type}
                    </span>
                  </AdminTd>
                  <AdminTd className="text-xs">
                    <div className="truncate font-medium text-brand-charcoal/80">{b.pickup_date}</div>
                    <div className="truncate text-muted-foreground">{b.pickup_time}</div>
                  </AdminTd>
                  <AdminTd>
                    <span
                      className="block truncate text-[13px] text-brand-charcoal/90"
                      title={`${b.pickup_location} → ${b.dropoff_location}`}
                    >
                      {b.pickup_location}
                      <span className="mx-1 text-slate-300">→</span>
                      {b.dropoff_location}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill status={b.status} />
                  </AdminTd>
                </AdminTr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState message="No trips match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}
    </div>
  );
}
