import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Plus, Search, X } from "lucide-react";
import {
  createAdminStayBooking,
  listAllApartments,
  listApartmentBookings,
  updateApartmentBookingStatus,
  type ApartmentUnitInput,
  type AptBookingStatus,
} from "@/lib/admin";
import { formatShortStayRange } from "@/lib/occupancy";
import {
  StatusPill,
  AdminTableShell,
  AdminTh,
  AdminTd,
  AdminTr,
  AdminTableCard,
  AdminPageHeader,
  AdminEmptyState,
  AdminCellText,
  FilterChip,
  RefBadge,
  TableShimmer,
  AdminPager,
  useAdminPage,
} from "@/components/admin/AdminBits";

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
  const [createOpen, setCreateOpen] = useState(false);

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: AptBookingStatus }) => updateApartmentBookingStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "apt-bookings"] });
      toast.success("Booking updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

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
  }, [all, status, search, fromDate, toDate]);

  const pager = useAdminPage(rows, `${status}|${search}|${fromDate}|${toDate}`);

  const openBooking = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Bookings"
        description="Manage apartment stays, payments, and guest check-ins. Add walk-in or phone bookings here."
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
              Add booking
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest, email, or reference…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-brand-charcoal"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="relative flex items-center">
            <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15 lg:w-40"
            />
          </label>
          <label className="relative flex items-center">
            <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15 lg:w-40"
            />
          </label>
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

      {/* Table */}
      {q.isLoading ? (
        <TableShimmer rows={8} cols={7} />
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
                noun="bookings"
              />
            ) : undefined
          }
        >
          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {pager.slice.map((b) => {
              const anyB = b as any;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setOpenId(b.id)}
                  className="flex w-full flex-col gap-2.5 p-4 text-left transition hover:bg-brand-cream/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-charcoal">{b.guest_name}</p>
                      <div className="mt-1">
                        <RefBadge>{b.booking_reference}</RefBadge>
                      </div>
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {anyB.apartments?.name ?? "—"}
                    {anyB.unit_name ? ` · ${anyB.unit_name}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-brand-charcoal/80">
                      {formatShortStayRange(b.check_in, b.check_out)}
                    </span>
                    <span>{b.nights} nights</span>
                    {(b as any).agency_code && (
                      <span className="font-mono font-semibold text-brand-green">
                        {(b as any).agency_code}
                      </span>
                    )}
                    <span className="font-semibold text-brand-green">
                      ${Number(b.total_amount).toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
            {rows.length === 0 && <AdminEmptyState message="No bookings match your filters" />}
          </div>

          {/* Desktop table — readable columns with optional horizontal scroll */}
          <AdminTableShell minWidth="68rem">
            <thead>
              <tr>
                <AdminTh>Reference</AdminTh>
                <AdminTh>Guest</AdminTh>
                <AdminTh>Account</AdminTh>
                <AdminTh>Apartment</AdminTh>
                <AdminTh>Stay</AdminTh>
                <AdminTh>Agency</AdminTh>
                <AdminTh>Nights</AdminTh>
                <AdminTh>Taxi</AdminTh>
                <AdminTh>Total</AdminTh>
                <AdminTh>Payment</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((b) => {
                const anyB = b as any;
                const accountEmail = anyB.user_account?.email as string | undefined;
                const aptLabel = [
                  anyB.apartments?.name ?? "—",
                  anyB.unit_name ? `· ${anyB.unit_name}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const stayLabel = formatShortStayRange(b.check_in, b.check_out);
                const stayTitle = `${b.check_in} → ${b.check_out} (${b.nights} nights)`;
                return (
                  <AdminTr key={b.id} onClick={() => setOpenId(b.id)}>
                    <AdminTd>
                      <RefBadge>{b.booking_reference}</RefBadge>
                    </AdminTd>
                    <AdminTd>
                      <AdminCellText
                        className="font-semibold text-brand-charcoal"
                        title={b.guest_name}
                      >
                        {b.guest_name}
                      </AdminCellText>
                      <AdminCellText
                        className="mt-0.5 text-xs text-muted-foreground"
                        title={b.guest_email}
                      >
                        {b.guest_email}
                      </AdminCellText>
                    </AdminTd>
                    <AdminTd>
                      {accountEmail ? (
                        <AdminCellText
                          className="text-xs font-medium text-brand-green"
                          title={accountEmail}
                        >
                          {accountEmail}
                        </AdminCellText>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          Guest
                        </span>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <AdminCellText className="text-[13px] text-brand-charcoal/90" title={aptLabel}>
                        {aptLabel}
                      </AdminCellText>
                    </AdminTd>
                    <AdminTd nowrap>
                      <span
                        className="text-[13px] font-semibold tabular-nums text-brand-charcoal"
                        title={stayTitle}
                      >
                        {stayLabel}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      {anyB.agency_code ? (
                        <div>
                          <span className="font-mono text-xs font-bold text-brand-green">
                            {anyB.agency_code}
                          </span>
                          {anyB.agency_name && (
                            <AdminCellText
                              className="mt-0.5 text-[11px] text-muted-foreground"
                              title={anyB.agency_name}
                            >
                              {anyB.agency_name}
                            </AdminCellText>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-brand-cream/80 px-1.5 py-0.5 text-xs font-semibold text-brand-green">
                        {b.nights}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      {anyB.taxi_addon ? (
                        <span className="text-xs font-semibold text-brand-orange">
                          ${Number(anyB.taxi_fare ?? 0).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[13px] font-bold tabular-nums text-brand-charcoal">
                        ${Number(b.total_amount).toFixed(0)}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill status={b.payment_status} />
                    </AdminTd>
                    <AdminTd>
                      <StatusPill status={b.status} />
                    </AdminTd>
                  </AdminTr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <AdminEmptyState message="No bookings match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}

      {openBooking && (
        <Drawer onClose={() => setOpenId(null)}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <RefBadge>{openBooking.booking_reference}</RefBadge>
            <StatusPill status={openBooking.status} />
          </div>
          <h2 className="mt-3 text-xl font-display font-bold text-brand-charcoal">
            {openBooking.guest_name}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {(openBooking as any).apartments?.name ?? "Apartment"}
            {(openBooking as any).unit_name ? ` · ${(openBooking as any).unit_name}` : ""}
          </p>

          <div className="space-y-4 text-sm">
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Guest details
              </h3>
              <Field label="Email">{openBooking.guest_email}</Field>
              <Field label="Phone">{openBooking.guest_phone}</Field>
              {(openBooking as any).user_account && (
                <Field label="Registered account">
                  {(openBooking as any).user_account.name} · {(openBooking as any).user_account.email}
                </Field>
              )}
              <Field label="Guests">{openBooking.guests}</Field>
              {(openBooking as any).agency_code && (
                <Field label="Travel agency">
                  <span className="font-mono font-bold text-brand-green">
                    {(openBooking as any).agency_code}
                  </span>
                  {(openBooking as any).agency_name
                    ? ` · ${(openBooking as any).agency_name}`
                    : ""}
                  {(openBooking as any).commission_amount != null &&
                    Number((openBooking as any).commission_amount) > 0 && (
                      <span className="mt-1 block text-xs text-brand-orange">
                        Commission ${Number((openBooking as any).commission_amount).toFixed(2)} (
                        {Math.round(Number((openBooking as any).commission_rate ?? 0.1) * 100)}%)
                      </span>
                    )}
                </Field>
              )}
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stay
              </h3>
              <Field label="Check-in / out">
                {openBooking.check_in} → {openBooking.check_out} ({openBooking.nights} nights)
              </Field>
              {(() => {
                const b = openBooking as any;
                const stay = Number(b.stay_subtotal ?? 0);
                const fee = Number(b.service_fee ?? 0);
                const fare = Number(b.taxi_fare ?? 0);
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                    {stay > 0 && <RowLine label="Stay subtotal" value={`$${stay.toFixed(2)}`} />}
                    {fee > 0 && <RowLine label="Service fee" value={`$${fee.toFixed(2)}`} />}
                    {b.taxi_addon && <RowLine label="Taxi fare" value={`$${fare.toFixed(2)}`} />}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-brand-green">
                      <span>Total</span>
                      <span>${Number(openBooking.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              <Field label="Payment">
                <StatusPill status={openBooking.payment_status} />
              </Field>
              {openBooking.special_requests && (
                <Field label="Special requests">{openBooking.special_requests}</Field>
              )}
            </section>

            {(openBooking.status === "cancelled" ||
              Number((openBooking as any).refund_percent) > 0 ||
              (openBooking as any).refund_payout) && (
              <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                  Guest cancellation
                </h3>
                {(openBooking as any).cancelled_by && (
                  <Field label="Cancelled by">{String((openBooking as any).cancelled_by)}</Field>
                )}
                <Field label="Refund policy">
                  {Number((openBooking as any).refund_percent) > 0
                    ? `50% · $${Number((openBooking as any).refund_amount ?? 0).toFixed(2)} · ${
                        (openBooking as any).refund_status || "eligible"
                      }`
                    : "No refund (within 7 days or unpaid)"}
                </Field>
                {(openBooking as any).cancellation_reason && (
                  <Field label="Reason">{(openBooking as any).cancellation_reason}</Field>
                )}
                {(openBooking as any).refund_payout && (
                  <>
                    <Field label="Payout method">
                      {String((openBooking as any).refund_payout.method ?? "—")}
                    </Field>
                    <Field label="Account name">
                      {(openBooking as any).refund_payout.accountName || "—"}
                    </Field>
                    {(openBooking as any).refund_payout.paypalEmail && (
                      <Field label="PayPal email">{(openBooking as any).refund_payout.paypalEmail}</Field>
                    )}
                    {(openBooking as any).refund_payout.bankName && (
                      <Field label="Bank">{(openBooking as any).refund_payout.bankName}</Field>
                    )}
                    {(openBooking as any).refund_payout.accountNumber && (
                      <Field label="Account no.">{(openBooking as any).refund_payout.accountNumber}</Field>
                    )}
                    {(openBooking as any).refund_payout.routingOrSortCode && (
                      <Field label="Routing / sort">
                        {(openBooking as any).refund_payout.routingOrSortCode}
                      </Field>
                    )}
                    {(openBooking as any).refund_payout.notes && (
                      <Field label="Payout notes">{(openBooking as any).refund_payout.notes}</Field>
                    )}
                  </>
                )}
              </section>
            )}

            {(openBooking as any).taxi_addon && (
              <section className="rounded-xl border border-brand-sage/40 bg-brand-cream/40 p-4 space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-green">
                  Taxi add-on
                </h3>
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
              </section>
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

      {createOpen && (
        <Drawer wide onClose={() => setCreateOpen(false)}>
          <OfflineStayForm
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              qc.invalidateQueries({ queryKey: ["admin", "apt-bookings"] });
            }}
          />
        </Drawer>
      )}
    </div>
  );
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function OfflineStayForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const apartmentsQ = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const apartments = (apartmentsQ.data ?? []).filter((a) => a.is_active);
  const [apartmentId, setApartmentId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [checkIn, setCheckIn] = useState(todayIso);
  const [checkOut, setCheckOut] = useState(() => addDaysIso(todayIso(), 1));
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [agencyCode, setAgencyCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const [notifyGuest, setNotifyGuest] = useState(true);

  const apartment = apartments.find((a) => a.id === apartmentId);
  const units = (apartment?.units ?? []).filter((u: ApartmentUnitInput) => u.isActive);

  const mut = useMutation({
    mutationFn: () => {
      if (!apartmentId) throw new Error("Select an apartment");
      if (units.length > 0 && !unitId) throw new Error("Select a unit");
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
        throw new Error("Guest name, email, and phone are required");
      }
      if (checkOut <= checkIn) throw new Error("Check-out must be after check-in");
      return createAdminStayBooking({
        apartmentId,
        unitId: unitId || undefined,
        unitIds: unitId ? [unitId] : undefined,
        checkIn,
        checkOut,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        guests,
        specialRequests: specialRequests.trim() || undefined,
        agencyCode: agencyCode.trim() || undefined,
        paymentStatus,
        paymentReference: paymentStatus === "paid" ? "OFFLINE" : undefined,
        status,
        notifyGuest,
      });
    },
    onSuccess: () => {
      toast.success("Offline booking added");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add booking"),
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
        <h2 className="font-display text-xl font-bold text-brand-charcoal">Add offline booking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a walk-in or phone stay. Dates are locked like an online booking.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Apartment</span>
        <select
          required
          value={apartmentId}
          onChange={(e) => {
            setApartmentId(e.target.value);
            setUnitId("");
          }}
          className={inputClass}
        >
          <option value="">Select apartment…</option>
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {units.length > 0 && (
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {apartment?.units_exclusive ? "Configuration" : "Unit"}
          </span>
          <select required value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {units.map((u: ApartmentUnitInput) => (
              <option key={u._id} value={u._id}>
                {u.name} · {u.bedrooms} BR · max {u.maxGuests}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Check-in</span>
          <input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Check-out</span>
          <input type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Guests</span>
        <input
          type="number"
          min={1}
          max={apartment?.max_guests ?? 20}
          required
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value) || 1)}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Guest name</span>
        <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</span>
        <input type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</span>
        <input required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Special requests</span>
        <textarea
          rows={3}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          className={`${inputClass} h-auto py-2`}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Agency code (optional)</span>
        <input
          value={agencyCode}
          onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
          placeholder="AG-XXXXXXXX"
          className={inputClass}
        />
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
          {mut.isPending ? "Saving…" : "Add booking"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15";

function RowLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-brand-charcoal">{value}</span>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-brand-charcoal">{children}</div>
    </div>
  );
}
export function Drawer({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`absolute right-0 top-0 h-full w-full overflow-y-auto bg-white p-6 shadow-2xl ${
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        }`}
      >
        <button
          onClick={onClose}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:bg-brand-cream hover:text-brand-green"
        >
          ← Close
        </button>
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
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        danger
          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "bg-brand-green text-white shadow-sm hover:opacity-90"
      }`}
    >
      {children}
    </button>
  );
}
