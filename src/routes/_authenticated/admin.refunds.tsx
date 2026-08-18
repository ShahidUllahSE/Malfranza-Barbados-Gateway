import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleDollarSign } from "lucide-react";
import {
  listAdminRefunds,
  updateAdminRefund,
  type AdminRefundItem,
} from "@/lib/admin";
import { refundStatusLabel } from "@/lib/cancellation";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTableCard,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
  FilterChip,
  RefBadge,
  StatusPill,
  TableShimmer,
  AdminPager,
  useAdminPage,
} from "@/components/admin/AdminBits";
import { ActionBtn, Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  component: AdminRefundsPage,
});

const STATUS_FILTERS = [
  "all",
  "requested",
  "reviewing",
  "eligible",
  "processed",
  "rejected",
] as const;

function AdminRefundsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("requested");
  const [kind, setKind] = useState<"all" | "stay" | "taxi">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const q = useQuery({
    queryKey: ["admin", "refunds", kind],
    queryFn: () => listAdminRefunds({ status: "all", kind }),
  });

  const allItems = q.data?.items ?? [];
  const counts = useMemo(() => {
    const base = {
      eligible: 0,
      requested: 0,
      reviewing: 0,
      processed: 0,
      rejected: 0,
      open: 0,
    };
    for (const item of allItems) {
      if (item.refundStatus in base) {
        (base as any)[item.refundStatus] += 1;
      }
      if (["eligible", "requested", "reviewing"].includes(item.refundStatus)) base.open += 1;
    }
    return base;
  }, [allItems]);

  const items = useMemo(
    () => (status === "all" ? allItems : allItems.filter((item) => item.refundStatus === status)),
    [allItems, status],
  );
  const pager = useAdminPage(items, `${status}|${kind}`);
  const openItem = useMemo(
    () => items.find((item) => `${item.kind}:${item.id}` === openId) ?? null,
    [items, openId],
  );

  const mut = useMutation({
    mutationFn: ({
      item,
      next,
      note,
    }: {
      item: AdminRefundItem;
      next: "reviewing" | "processed" | "rejected";
      note?: string;
    }) => updateAdminRefund(item.kind, item.id, { status: next, adminNote: note }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "refunds"] });
      toast.success(
        vars.next === "processed"
          ? "Refund marked as processed — guest notified"
          : vars.next === "rejected"
            ? "Refund rejected — guest notified"
            : "Refund marked in review",
      );
      if (vars.next === "processed" || vars.next === "rejected") {
        setOpenId(null);
        setAdminNote("");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Refunds"
        description="Guest refund requests after cancellation. Review payout details, then mark processed or rejected. No automatic payouts."
        meta={
          !q.isLoading && (
            <div className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm">
              {counts.open} open · {counts.requested} requested
            </div>
          )
        }
      />

      <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s}
              {s !== "all" ? ` (${(counts as any)[s] ?? 0})` : ` (${allItems.length})`}
            </FilterChip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {(["all", "stay", "taxi"] as const).map((k) => (
            <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? "All types" : k === "stay" ? "Stays" : "Taxi"}
            </FilterChip>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <TableShimmer rows={6} cols={6} />
      ) : (
        <AdminTableCard
          footer={
            items.length > 0 ? (
              <AdminPager
                page={pager.page}
                pages={pager.pages}
                total={pager.total}
                from={pager.from}
                to={pager.to}
                onPage={pager.setPage}
                noun="refunds"
              />
            ) : undefined
          }
        >
          <div className="divide-y divide-slate-100 lg:hidden">
            {pager.slice.map((item) => (
              <button
                key={`${item.kind}:${item.id}`}
                type="button"
                onClick={() => {
                  setOpenId(`${item.kind}:${item.id}`);
                  setAdminNote(item.refundAdminNote ?? "");
                }}
                className="flex w-full flex-col gap-2 p-4 text-left hover:bg-brand-cream/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-charcoal">{item.guestName}</p>
                    <RefBadge>{item.bookingReference}</RefBadge>
                  </div>
                  <StatusPill status={item.refundStatus} />
                </div>
                <p className="text-sm text-brand-charcoal">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind === "stay" ? "Stay" : "Taxi"} · {item.eventDate} · ${item.refundAmount.toFixed(2)}
                </p>
              </button>
            ))}
            {items.length === 0 && <AdminEmptyState message="No refunds in this filter" />}
          </div>

          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh className="w-[12%]">Reference</AdminTh>
                <AdminTh className="w-[16%]">Guest</AdminTh>
                <AdminTh className="w-[10%]">Type</AdminTh>
                <AdminTh className="w-[22%]">Booking</AdminTh>
                <AdminTh className="w-[12%]">Amount</AdminTh>
                <AdminTh className="w-[14%]">Status</AdminTh>
                <AdminTh className="w-[14%]">Requested</AdminTh>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((item) => (
                <AdminTr
                  key={`${item.kind}:${item.id}`}
                  onClick={() => {
                    setOpenId(`${item.kind}:${item.id}`);
                    setAdminNote(item.refundAdminNote ?? "");
                  }}
                >
                  <AdminTd>
                    <RefBadge>{item.bookingReference}</RefBadge>
                  </AdminTd>
                  <AdminTd>
                    <div className="truncate font-semibold" title={item.guestName}>
                      {item.guestName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{item.guestEmail}</div>
                  </AdminTd>
                  <AdminTd>{item.kind === "stay" ? "Stay" : "Taxi"}</AdminTd>
                  <AdminTd>
                    <span className="line-clamp-2 text-[13px]">{item.title}</span>
                    <div className="text-xs text-muted-foreground">{item.eventDate}</div>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-bold tabular-nums text-brand-green">
                      ${item.refundAmount.toFixed(2)}
                    </span>
                    <div className="text-[11px] text-muted-foreground">{item.refundPercent}%</div>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill status={item.refundStatus} />
                  </AdminTd>
                  <AdminTd className="text-xs text-muted-foreground">
                    {item.refundRequestedAt
                      ? String(item.refundRequestedAt).slice(0, 10)
                      : item.refundStatus === "eligible"
                        ? "Awaiting guest"
                        : "—"}
                  </AdminTd>
                </AdminTr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState message="No refunds in this filter" />
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}

      {openItem && (
        <Drawer onClose={() => setOpenId(null)}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <RefBadge>{openItem.bookingReference}</RefBadge>
            <StatusPill status={openItem.refundStatus} />
          </div>
          <h2 className="mt-3 flex items-center gap-2 text-xl font-display font-bold text-brand-charcoal">
            <CircleDollarSign className="h-5 w-5 text-brand-green" />
            ${openItem.refundAmount.toFixed(2)} refund
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {openItem.kind === "stay" ? "Stay" : "Taxi"} · {openItem.title} · {openItem.eventDate}
          </p>

          <div className="space-y-4 text-sm">
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Guest
              </h3>
              <Field label="Name" value={openItem.guestName} />
              <Field label="Email" value={openItem.guestEmail} />
              <Field label="Phone" value={openItem.guestPhone} />
              <Field label="Paid total" value={`$${openItem.totalPaid.toFixed(2)} · ${openItem.paymentStatus}`} />
              {openItem.cancellationReason && (
                <Field label="Cancel reason" value={openItem.cancellationReason} />
              )}
            </section>

            <section className="rounded-xl border border-brand-sage/40 bg-brand-cream/40 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-green">
                Payout details
              </h3>
              {openItem.refundPayout ? (
                <>
                  <Field label="Method" value={openItem.refundPayout.method ?? "—"} />
                  <Field label="Account name" value={openItem.refundPayout.accountName ?? "—"} />
                  {openItem.refundPayout.paypalEmail && (
                    <Field label="PayPal email" value={openItem.refundPayout.paypalEmail} />
                  )}
                  {openItem.refundPayout.bankName && (
                    <Field label="Bank" value={openItem.refundPayout.bankName} />
                  )}
                  {openItem.refundPayout.accountNumber && (
                    <Field label="Account no." value={openItem.refundPayout.accountNumber} />
                  )}
                  {openItem.refundPayout.routingOrSortCode && (
                    <Field label="Routing / sort" value={openItem.refundPayout.routingOrSortCode} />
                  )}
                  {openItem.refundPayout.notes && (
                    <Field label="Notes" value={openItem.refundPayout.notes} />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Guest has not submitted payout details yet. Status is “eligible” until they request.
                </p>
              )}
            </section>

            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Admin note
              </span>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note for the guest (required when rejecting)"
                className="h-auto w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
              />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2">
            {["eligible", "requested"].includes(openItem.refundStatus) && (
              <ActionBtn
                onClick={() =>
                  mut.mutate({ item: openItem, next: "reviewing", note: adminNote || undefined })
                }
              >
                Mark in review
              </ActionBtn>
            )}
            {["requested", "reviewing"].includes(openItem.refundStatus) && (
              <ActionBtn
                onClick={() =>
                  mut.mutate({ item: openItem, next: "processed", note: adminNote || undefined })
                }
              >
                Mark processed (paid out)
              </ActionBtn>
            )}
            {["eligible", "requested", "reviewing"].includes(openItem.refundStatus) && (
              <ActionBtn
                danger
                onClick={() => {
                  if (!adminNote.trim()) {
                    toast.error("Add a short note before rejecting");
                    return;
                  }
                  mut.mutate({ item: openItem, next: "rejected", note: adminNote.trim() });
                }}
              >
                Reject refund
              </ActionBtn>
            )}
            <Link
              to={openItem.kind === "taxi" ? "/admin/taxi/$id" : "/admin/bookings"}
              params={openItem.kind === "taxi" ? { id: openItem.id } : undefined}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Open original booking
            </Link>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-brand-charcoal">{value}</div>
    </div>
  );
}
