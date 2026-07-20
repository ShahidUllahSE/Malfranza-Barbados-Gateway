import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { listTaxiBookings, type TaxiStatus } from "@/lib/admin";
import { StatusPill, AdminTableShell, AdminTh, AdminTd } from "@/components/admin/AdminBits";

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

  const rows = useMemo(() => {
    let items = q.data ?? [];
    if (status !== "all") items = items.filter((b) => b.status === status);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(s) ||
          b.booking_reference.toLowerCase().includes(s) ||
          (b.driver?.name ?? "").toLowerCase().includes(s),
      );
    }
    return items;
  }, [q.data, status, search]);

  function openTrip(id: string) {
    navigate({ to: "/admin/taxi/$id", params: { id } });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Taxi Trips</h1>
        <p className="text-sm text-muted-foreground">
          Open a trip for full details and that driver&apos;s progress. Free drivers are auto-assigned.
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, driver, or reference"
            className="w-full rounded-lg border border-input bg-white pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                status === s
                  ? "bg-brand-green text-white border-brand-green"
                  : "bg-white text-brand-charcoal border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-card overflow-hidden">
        <div className="divide-y divide-slate-100 lg:hidden">
          {rows.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => openTrip(b.id)}
              className="flex w-full flex-col gap-2 p-4 text-left hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-charcoal truncate">{b.customer_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{b.booking_reference}</p>
                </div>
                <StatusPill status={b.status} />
              </div>
              <p className="text-sm text-brand-charcoal">{b.service_type}</p>
              {b.driver ? (
                <p className="text-xs text-brand-green">Driver: {b.driver.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Unassigned</p>
              )}
              <p className="text-xs text-muted-foreground">
                {b.pickup_date} · {b.pickup_time}
              </p>
            </button>
          ))}
          {rows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {q.isLoading ? "Loading…" : "No trips match."}
            </div>
          )}
        </div>

        <AdminTableShell minWidth="64rem">
          <thead className="bg-slate-50">
            <tr>
              <AdminTh>Reference</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Driver</AdminTh>
              <AdminTh>Service</AdminTh>
              <AdminTh>Pickup</AdminTh>
              <AdminTh>Route</AdminTh>
              <AdminTh className="sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                Status
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                onClick={() => openTrip(b.id)}
                className="group cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <AdminTd nowrap className="font-mono text-xs text-muted-foreground">
                  {b.booking_reference}
                </AdminTd>
                <AdminTd nowrap className="font-medium">{b.customer_name}</AdminTd>
                <AdminTd nowrap className="text-xs">
                  {b.driver ? (
                    <Link
                      to="/admin/drivers/$id"
                      params={{ id: b.driver.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-brand-green hover:underline"
                    >
                      {b.driver.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </AdminTd>
                <AdminTd nowrap>{b.service_type}</AdminTd>
                <AdminTd nowrap className="text-xs text-muted-foreground">
                  {b.pickup_date} {b.pickup_time}
                </AdminTd>
                <AdminTd className="max-w-[16rem]">
                  <span className="line-clamp-2 leading-snug">
                    {b.pickup_location} → {b.dropoff_location}
                  </span>
                </AdminTd>
                <AdminTd
                  nowrap
                  className="sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)] group-hover:bg-slate-50"
                >
                  <StatusPill status={b.status} />
                </AdminTd>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No trips match."}
                </td>
              </tr>
            )}
          </tbody>
        </AdminTableShell>
      </div>
    </div>
  );
}
