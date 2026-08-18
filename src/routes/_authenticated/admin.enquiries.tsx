import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import {
  listEnquiries,
  updateEnquiry,
  updateEnquiryStatus,
  type EnquiryStatus,
} from "@/lib/admin";
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
import { ActionBtn, Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  component: EnquiriesPage,
});

type EnquiryRow = Awaited<ReturnType<typeof listEnquiries>>[number];

const FILTERS = ["all", "new", "responded", "closed"] as const;

function EnquiriesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "enquiries"], queryFn: listEnquiries });
  const [filter, setFilter] = useState<EnquiryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: EnquiryStatus }) => updateEnquiryStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "enquiries"] });
      toast.success("Enquiry updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const notesMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateEnquiry(id, { admin_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "enquiries"] });
      toast.success("Notes saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save notes"),
  });

  const all = q.data ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length };
    for (const s of FILTERS) {
      if (s === "all") continue;
      counts[s] = all.filter((e) => e.status === s).length;
    }
    return counts;
  }, [all]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all.filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.email.toLowerCase().includes(needle) ||
        (e.phone ?? "").toLowerCase().includes(needle) ||
        e.reference.toLowerCase().includes(needle) ||
        e.interested_in.toLowerCase().includes(needle) ||
        e.message.toLowerCase().includes(needle)
      );
    });
  }, [all, filter, search]);

  const pager = useAdminPage(rows, `${filter}|${search}`);

  const openEnquiry = useMemo(
    () => all.find((e) => e.id === openId) ?? null,
    [all, openId],
  );

  function openDetail(enquiry: EnquiryRow) {
    setOpenId(enquiry.id);
    setNotesDraft(enquiry.admin_notes ?? "");
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Enquiries"
        description="Contact form submissions. Click a row for full details."
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
            placeholder="Search name, email, reference…"
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
          {FILTERS.map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              count={statusCounts[s]}
            >
              {s}
            </FilterChip>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <TableShimmer rows={7} cols={6} />
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
                noun="enquiries"
              />
            ) : undefined
          }
        >
          <div className="divide-y divide-slate-100 lg:hidden">
            {pager.slice.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => openDetail(e)}
                className="w-full p-4 text-left transition hover:bg-brand-cream/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-brand-charcoal">{e.name}</span>
                  <StatusPill status={e.status} />
                </div>
                <div className="mt-1.5">
                  <RefBadge>{e.reference}</RefBadge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {e.interested_in}
                  {e.preferred_dates ? ` · ${e.preferred_dates}` : ""}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-brand-charcoal/90">{e.message}</p>
              </button>
            ))}
            {rows.length === 0 && <AdminEmptyState message="No enquiries match your filters" />}
          </div>

          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh className="w-[11%]">Reference</AdminTh>
                <AdminTh className="w-[16%]">Contact</AdminTh>
                <AdminTh className="w-[12%]">Interested in</AdminTh>
                <AdminTh className="w-[11%]">Preferred date</AdminTh>
                <AdminTh className="w-[28%]">Message</AdminTh>
                <AdminTh className="w-[12%]">Received</AdminTh>
                <AdminTh className="w-[10%]">Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((e) => (
                <AdminTr key={e.id} onClick={() => openDetail(e)}>
                  <AdminTd>
                    <RefBadge>{e.reference}</RefBadge>
                  </AdminTd>
                  <AdminTd>
                    <div className="truncate font-semibold text-brand-charcoal" title={e.name}>
                      {e.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground" title={e.email}>
                      {e.email}
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <span className="block truncate text-[13px]" title={e.interested_in}>
                      {e.interested_in}
                    </span>
                  </AdminTd>
                  <AdminTd className="text-xs text-muted-foreground">
                    <span className="block truncate">{e.preferred_dates ?? "—"}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground" title={e.message}>
                      {e.message}
                    </span>
                  </AdminTd>
                  <AdminTd className="text-xs text-muted-foreground">
                    <span className="block truncate">{fmtDateTime(e.created_at)}</span>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill status={e.status} />
                  </AdminTd>
                </AdminTr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState message="No enquiries match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}

      {openEnquiry && (
        <Drawer onClose={() => setOpenId(null)}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <RefBadge>{openEnquiry.reference}</RefBadge>
            <StatusPill status={openEnquiry.status} />
          </div>
          <h2 className="mt-3 font-display text-xl font-bold text-brand-charcoal">
            {openEnquiry.name}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Contact enquiry · {fmtDateTime(openEnquiry.created_at)}
          </p>

          <div className="space-y-4 text-sm">
            <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <Field label="Email">
                <a
                  href={`mailto:${openEnquiry.email}`}
                  className="break-all text-brand-green hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {openEnquiry.email}
                </a>
              </Field>
              <Field label="Phone">
                {openEnquiry.phone ? (
                  <a
                    href={`tel:${openEnquiry.phone}`}
                    className="text-brand-green hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {openEnquiry.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              {openEnquiry.user_account && (
                <Field label="Registered account">
                  {openEnquiry.user_account.name} · {openEnquiry.user_account.email}
                </Field>
              )}
              <Field label="Interested in">{openEnquiry.interested_in}</Field>
              <Field label="Preferred dates">{openEnquiry.preferred_dates ?? "Not specified"}</Field>
            </section>

            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Message
              </div>
              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm text-brand-charcoal">
                {openEnquiry.message}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Admin notes
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder="Internal notes about this enquiry…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
              />
              <button
                type="button"
                disabled={notesMut.isPending || notesDraft === (openEnquiry.admin_notes ?? "")}
                onClick={() => notesMut.mutate({ id: openEnquiry.id, notes: notesDraft })}
                className="mt-2 cursor-pointer rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                {notesMut.isPending ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {openEnquiry.status === "new" && (
              <ActionBtn onClick={() => mut.mutate({ id: openEnquiry.id, s: "responded" })}>
                Mark as responded
              </ActionBtn>
            )}
            {(openEnquiry.status === "new" || openEnquiry.status === "responded") && (
              <ActionBtn
                danger
                onClick={() => mut.mutate({ id: openEnquiry.id, s: "closed" })}
              >
                Close enquiry
              </ActionBtn>
            )}
            {openEnquiry.status === "closed" && (
              <ActionBtn onClick={() => mut.mutate({ id: openEnquiry.id, s: "responded" })}>
                Reopen as responded
              </ActionBtn>
            )}
            <a
              href={`mailto:${openEnquiry.email}?subject=${encodeURIComponent(`Re: Malfranza enquiry ${openEnquiry.reference}`)}`}
              className="rounded-xl bg-brand-cream px-3 py-2.5 text-center text-sm font-semibold text-brand-green transition hover:bg-brand-sage/30"
            >
              Reply by email
            </a>
          </div>
        </Drawer>
      )}
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

function fmtDateTime(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
