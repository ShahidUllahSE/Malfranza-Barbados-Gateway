import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import {
  createAdminTaxiBooking,
  listTaxiBookings,
  taxiHasAssignedDriver,
  type TaxiStatus,
} from "@/lib/admin";
import { listDrivers } from "@/lib/drivers";
import { Drawer } from "./admin.bookings";
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
  AdminPager,
  useAdminPage,
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

const TAXI_SERVICES = [
  "Airport Pickup",
  "Airport Drop-off",
  "Point to Point",
  "Hourly / Custom",
] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TaxiPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  const pager = useAdminPage(rows, `${status}|${search}`);

  function openTrip(id: string) {
    navigate({ to: "/admin/taxi/$id", params: { id } });
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Taxi Trips"
        description="Open a trip for full details and driver progress. Add walk-in or phone taxi bookings here."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {!q.isLoading && (
              <div className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm">
                {rows.length} shown · {all.length} total
              </div>
            )}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add trip
            </button>
          </div>
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
            rows.length > 0 ? (
              <AdminPager
                page={pager.page}
                pages={pager.pages}
                total={pager.total}
                from={pager.from}
                to={pager.to}
                onPage={pager.setPage}
                noun="trips"
              />
            ) : undefined
          }
        >
          <div className="divide-y divide-slate-100 lg:hidden">
            {pager.slice.map((b) => (
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
              {pager.slice.map((b) => (
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

      {createOpen && (
        <Drawer wide onClose={() => setCreateOpen(false)}>
          <OfflineTaxiForm
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              qc.invalidateQueries({ queryKey: ["admin", "taxi-bookings"] });
            }}
          />
        </Drawer>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15";

function OfflineTaxiForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const driversQ = useQuery({ queryKey: ["admin", "drivers"], queryFn: listDrivers });
  const drivers = (driversQ.data ?? []).filter((d) => d.isActive);
  const [serviceType, setServiceType] = useState<(typeof TAXI_SERVICES)[number]>("Airport Pickup");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupDate, setPickupDate] = useState(todayIso);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [passengers, setPassengers] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [driverId, setDriverId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const [notifyGuest, setNotifyGuest] = useState(true);

  const mut = useMutation({
    mutationFn: () => {
      if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
        throw new Error("Customer name, email, and phone are required");
      }
      if (!pickupLocation.trim() || !dropoffLocation.trim()) {
        throw new Error("Pickup and drop-off are required");
      }
      return createAdminTaxiBooking({
        serviceType,
        pickupLocation: pickupLocation.trim(),
        dropoffLocation: dropoffLocation.trim(),
        pickupDate,
        pickupTime: pickupTime.slice(0, 5),
        passengers,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim() || undefined,
        driverId: driverId || undefined,
        paymentStatus,
        paymentReference: paymentStatus === "paid" ? "OFFLINE" : undefined,
        status,
        notifyGuest,
      });
    },
    onSuccess: () => {
      toast.success("Offline taxi booking added");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add trip"),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <div>
        <h2 className="font-display text-xl font-bold text-brand-charcoal">Add offline taxi trip</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a walk-in or phone taxi booking. Assign a driver now or later.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Service</span>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as (typeof TAXI_SERVICES)[number])}
          className={inputClass}
        >
          {TAXI_SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pickup</span>
        <input required value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Drop-off</span>
        <input required value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Date</span>
          <input type="date" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time</span>
          <input type="time" required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Passengers</span>
        <input
          type="number"
          min={1}
          max={14}
          required
          value={passengers}
          onChange={(e) => setPassengers(Number(e.target.value) || 1)}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Customer name</span>
        <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</span>
        <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</span>
        <input required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} h-auto py-2`} />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Driver (optional)</span>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputClass}>
          <option value="">Assign later</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.vehicleLabel ? ` · ${d.vehicleLabel}` : ""}
              {d.pricePerKmUsd != null ? ` · $${Number(d.pricePerKmUsd).toFixed(2)}/km` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Payment</span>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as "unpaid" | "paid")}
            className={inputClass}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid offline</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "pending" | "confirmed")}
            className={inputClass}
          >
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-brand-charcoal">
        <input type="checkbox" checked={notifyGuest} onChange={(e) => setNotifyGuest(e.target.checked)} />
        Email guest confirmation (and login if new account)
      </label>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Add trip"}
        </button>
      </div>
    </form>
  );
}
