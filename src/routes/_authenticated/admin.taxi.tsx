import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { listTaxiBookings, updateTaxiBookingStatus, type TaxiStatus } from "@/lib/admin";
import { StatusPill } from "@/components/admin/AdminBits";
import { Drawer, ActionBtn } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/taxi")({
  component: TaxiPage,
});

const STATUSES: (TaxiStatus | "all")[] = ["all", "pending", "confirmed", "completed", "cancelled"];

function TaxiPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: TaxiStatus }) => updateTaxiBookingStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "taxi-bookings"] });
      toast.success("Trip updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const rows = useMemo(() => {
    let items = q.data ?? [];
    if (status !== "all") items = items.filter((b) => b.status === status);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(s) ||
          b.booking_reference.toLowerCase().includes(s),
      );
    }
    return items;
  }, [q.data, status, search]);

  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Taxi Trips</h1>
        <p className="text-sm text-muted-foreground">Manage taxi bookings.</p>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name or reference"
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
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Reference</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Customer</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Service</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Pickup</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Route</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setOpenId(b.id)}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">{b.booking_reference}</td>
                  <td className="px-3 py-2.5">{b.customer_name}</td>
                  <td className="px-3 py-2.5">{b.service_type}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {b.pickup_date} {b.pickup_time}
                  </td>
                  <td className="px-3 py-2.5 max-w-[280px] truncate">
                    {b.pickup_location} → {b.dropoff_location}
                  </td>
                  <td className="px-3 py-2.5"><StatusPill status={b.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {q.isLoading ? "Loading…" : "No trips match."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Drawer onClose={() => setOpenId(null)}>
          <h2 className="text-xl font-display font-bold text-brand-charcoal">{open.booking_reference}</h2>
          <p className="text-sm text-muted-foreground mb-4">{open.service_type}</p>
          <div className="space-y-3 text-sm">
            <F label="Customer">{open.customer_name}</F>
            <F label="Email">{open.customer_email}</F>
            <F label="Phone">{open.customer_phone}</F>
            <F label="Passengers">{open.passengers}</F>
            <F label="Pickup">{open.pickup_date} at {open.pickup_time}</F>
            <F label="From">{open.pickup_location}</F>
            <F label="To">{open.dropoff_location}</F>
            <F label="Status"><StatusPill status={open.status} /></F>
            {open.notes && <F label="Notes">{open.notes}</F>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <ActionBtn onClick={() => mut.mutate({ id: open.id, s: "confirmed" })}>Confirm</ActionBtn>
            <ActionBtn onClick={() => mut.mutate({ id: open.id, s: "completed" })}>Complete</ActionBtn>
            <ActionBtn danger onClick={() => mut.mutate({ id: open.id, s: "cancelled" })}>Cancel</ActionBtn>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-brand-charcoal">{children}</div>
    </div>
  );
}
