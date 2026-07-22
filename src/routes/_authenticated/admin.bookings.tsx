import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import {
  listApartmentBookings,
  updateApartmentBookingStatus,
  type AptBookingStatus,
} from "@/lib/admin";
import { StatusPill, AdminTableShell, AdminTh, AdminTd } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: BookingsPage,
});

const STATUSES: (AptBookingStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
];

function BookingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: AptBookingStatus }) => updateApartmentBookingStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "apt-bookings"] });
      toast.success("Booking updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const rows = useMemo(() => {
    let items = q.data ?? [];
    if (status !== "all") items = items.filter((b) => b.status === status);
    if (fromDate) items = items.filter((b) => b.check_in >= fromDate);
    if (toDate) items = items.filter((b) => b.check_out <= toDate);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.guest_name.toLowerCase().includes(s) ||
          b.booking_reference.toLowerCase().includes(s) ||
          b.guest_email.toLowerCase().includes(s),
      );
    }
    return items;
  }, [q.data, status, search, fromDate, toDate]);

  const openBooking = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Bookings</h1>
        <p className="text-sm text-muted-foreground">Manage apartment bookings.</p>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest name or reference"
              className="w-full rounded-lg border border-input bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
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
        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 lg:hidden">
          {rows.map((b) => {
            const anyB = b as any;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setOpenId(b.id)}
                className="flex w-full flex-col gap-2 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-charcoal truncate">{b.guest_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.booking_reference}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {anyB.apartments?.name ?? "—"}
                  {anyB.unit_name ? ` · ${anyB.unit_name}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{b.check_in} → {b.check_out}</span>
                  <span>{b.nights} nights</span>
                  <span className="font-semibold text-brand-green">${Number(b.total_amount).toFixed(2)}</span>
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {q.isLoading ? "Loading…" : "No bookings match."}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <AdminTableShell minWidth="72rem">
          <thead className="bg-slate-50">
            <tr>
              <AdminTh>Reference</AdminTh>
              <AdminTh>Guest</AdminTh>
              <AdminTh>Account</AdminTh>
              <AdminTh>Apartment</AdminTh>
              <AdminTh>Dates</AdminTh>
              <AdminTh>Nights</AdminTh>
              <AdminTh>Taxi</AdminTh>
              <AdminTh>Total</AdminTh>
              <AdminTh>Payment</AdminTh>
              <AdminTh className="sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Status</AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const anyB = b as any;
              return (
                <tr
                  key={b.id}
                  onClick={() => setOpenId(b.id)}
                  className="group border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <AdminTd nowrap className="font-mono text-xs text-muted-foreground">
                    {b.booking_reference}
                  </AdminTd>
                  <AdminTd nowrap className="font-medium">{b.guest_name}</AdminTd>
                  <AdminTd className="text-xs max-w-[10rem]">
                    {(b as any).user_account ? (
                      <span className="text-brand-green font-medium break-all">
                        {(b as any).user_account.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Guest checkout</span>
                    )}
                  </AdminTd>
                  <AdminTd className="max-w-[14rem]">
                    <span className="line-clamp-2 leading-snug">
                      {anyB.apartments?.name ?? "—"}
                      {anyB.unit_name ? ` · ${anyB.unit_name}` : ""}
                    </span>
                  </AdminTd>
                  <AdminTd nowrap className="text-xs text-muted-foreground">
                    {b.check_in} → {b.check_out}
                  </AdminTd>
                  <AdminTd nowrap className="text-center">{b.nights}</AdminTd>
                  <AdminTd nowrap>
                    {anyB.taxi_addon ? (
                      <span className="inline-flex items-center rounded-full bg-brand-cream px-2 py-0.5 text-xs font-medium text-brand-green">
                        ${Number(anyB.taxi_fare ?? 0).toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </AdminTd>
                  <AdminTd nowrap className="font-semibold">${Number(b.total_amount).toFixed(2)}</AdminTd>
                  <AdminTd nowrap><StatusPill status={b.payment_status} /></AdminTd>
                  <AdminTd
                    nowrap
                    className="sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]"
                  >
                    <StatusPill status={b.status} />
                  </AdminTd>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No bookings match."}
                </td>
              </tr>
            )}
          </tbody>
        </AdminTableShell>
      </div>


      {openBooking && (
        <Drawer onClose={() => setOpenId(null)}>
          <h2 className="text-xl font-display font-bold text-brand-charcoal">
            {openBooking.booking_reference}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {(openBooking as any).apartments?.name ?? "Apartment"}
            {(openBooking as any).unit_name ? ` · ${(openBooking as any).unit_name}` : ""}
          </p>

          <div className="space-y-3 text-sm">
            <Field label="Guest">{openBooking.guest_name}</Field>
            <Field label="Email">{openBooking.guest_email}</Field>
            <Field label="Phone">{openBooking.guest_phone}</Field>
            {(openBooking as any).user_account && (
              <Field label="Registered account">
                {(openBooking as any).user_account.name} · {(openBooking as any).user_account.email}
              </Field>
            )}
            <Field label="Guests">{openBooking.guests}</Field>
            <Field label="Check-in / out">
              {openBooking.check_in} → {openBooking.check_out} ({openBooking.nights} nights)
            </Field>
            {(() => {
              const b = openBooking as any;
              const stay = Number(b.stay_subtotal ?? 0);
              const fee = Number(b.service_fee ?? 0);
              const fare = Number(b.taxi_fare ?? 0);
              return (
                <div className="rounded-lg border border-slate-200 p-3 space-y-1">
                  {stay > 0 && <RowLine label="Stay subtotal" value={`$${stay.toFixed(2)}`} />}
                  {fee > 0 && <RowLine label="Service fee" value={`$${fee.toFixed(2)}`} />}
                  {b.taxi_addon && <RowLine label="Taxi fare" value={`$${fare.toFixed(2)}`} />}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-brand-green">
                    <span>Total</span><span>${Number(openBooking.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
            <Field label="Payment status"><StatusPill status={openBooking.payment_status} /></Field>
            <Field label="Booking status"><StatusPill status={openBooking.status} /></Field>
            {openBooking.special_requests && (
              <Field label="Special requests">{openBooking.special_requests}</Field>
            )}
            {(openBooking as any).taxi_addon && (
              <div className="rounded-lg border border-brand-sage/40 bg-brand-cream/40 p-3 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-green">Taxi add-on</div>
                <Field label="Pickup">{(openBooking as any).taxi_pickup}</Field>
                <Field label="Drop-off">{(openBooking as any).taxi_dropoff}</Field>
                <Field label="When">
                  {(openBooking as any).taxi_date} · {(openBooking as any).taxi_time}
                </Field>
                <Field label="Passengers">{(openBooking as any).taxi_passengers}</Field>
                {(openBooking as any).taxi_distance_km != null && (
                  <Field label="Distance">{(openBooking as any).taxi_distance_km} km</Field>
                )}
                {(openBooking as any).taxi_notes && (
                  <Field label="Notes">{(openBooking as any).taxi_notes}</Field>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {openBooking.status === "pending" && (
              <ActionBtn onClick={() => mut.mutate({ id: openBooking.id, s: "confirmed" })}>
                Confirm
              </ActionBtn>
            )}
            {openBooking.status === "confirmed" && (
              <ActionBtn onClick={() => mut.mutate({ id: openBooking.id, s: "checked_in" })}>
                Check In
              </ActionBtn>
            )}
            {openBooking.status === "checked_in" && (
              <ActionBtn onClick={() => mut.mutate({ id: openBooking.id, s: "checked_out" })}>
                Check Out
              </ActionBtn>
            )}
            {(openBooking.status === "pending" || openBooking.status === "confirmed") && (
              <ActionBtn
                danger
                onClick={() => mut.mutate({ id: openBooking.id, s: "cancelled" })}
              >
                Cancel
              </ActionBtn>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}

function RowLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="text-brand-charcoal">{value}</span>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-brand-charcoal">{children}</div>
    </div>
  );
}
export function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-xl p-6 overflow-y-auto">
        <button onClick={onClose} className="mb-4 text-sm text-muted-foreground hover:text-brand-green">← Close</button>
        {children}
      </div>
    </div>
  );
}
export function ActionBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        danger
          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "bg-brand-green text-white hover:opacity-90"
      }`}
    >
      {children}
    </button>
  );
}
