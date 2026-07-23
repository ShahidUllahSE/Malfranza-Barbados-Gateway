import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
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
} from "@/components/admin/AdminBits";
import { ActionBtn, Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  component: EnquiriesPage,
});

type EnquiryRow = Awaited<ReturnType<typeof listEnquiries>>[number];

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

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (q.data ?? []).filter((e) => {
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
  }, [q.data, filter, search]);

  const openEnquiry = useMemo(
    () => (q.data ?? []).find((e) => e.id === openId) ?? null,
    [q.data, openId],
  );

  function openDetail(enquiry: EnquiryRow) {
    setOpenId(enquiry.id);
    setNotesDraft(enquiry.admin_notes ?? "");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Enquiries</h1>
        <p className="text-sm text-muted-foreground">
          Contact form submissions. Click a row to open full details.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, reference…"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-green"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "new", "responded", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                filter === s
                  ? "border-brand-green bg-brand-green text-white"
                  : "border-slate-200 bg-white text-brand-charcoal hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => openDetail(e)}
            className="w-full cursor-pointer rounded-2xl bg-white p-4 text-left shadow-card transition hover:bg-slate-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-brand-charcoal">{e.name}</span>
              <StatusPill status={e.status} />
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">{e.reference}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {e.interested_in}
              {e.preferred_dates ? ` · ${e.preferred_dates}` : ""}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-brand-charcoal">{e.message}</p>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground shadow-card">
            {q.isLoading ? "Loading…" : "No enquiries match."}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card lg:block">
        <AdminTableShell minWidth="56rem">
          <thead className="bg-slate-50">
            <tr>
              <AdminTh>Reference</AdminTh>
              <AdminTh>Contact</AdminTh>
              <AdminTh>Interested in</AdminTh>
              <AdminTh>Preferred date</AdminTh>
              <AdminTh>Message</AdminTh>
              <AdminTh>Received</AdminTh>
              <AdminTh className="sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                Status
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                onClick={() => openDetail(e)}
                className="group cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <AdminTd nowrap className="font-mono text-xs text-muted-foreground">
                  {e.reference}
                </AdminTd>
                <AdminTd className="max-w-[14rem]">
                  <div className="font-medium text-brand-charcoal">{e.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                </AdminTd>
                <AdminTd nowrap>{e.interested_in}</AdminTd>
                <AdminTd nowrap className="text-xs text-muted-foreground">
                  {e.preferred_dates ?? "—"}
                </AdminTd>
                <AdminTd className="max-w-[16rem]">
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {e.message}
                  </span>
                </AdminTd>
                <AdminTd nowrap className="text-xs text-muted-foreground">
                  {fmtDateTime(e.created_at)}
                </AdminTd>
                <AdminTd
                  nowrap
                  className="sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]"
                >
                  <StatusPill status={e.status} />
                </AdminTd>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No enquiries match."}
                </td>
              </tr>
            )}
          </tbody>
        </AdminTableShell>
      </div>

      {openEnquiry && (
        <Drawer onClose={() => setOpenId(null)}>
          <h2 className="font-display text-xl font-bold text-brand-charcoal">
            {openEnquiry.reference}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Contact enquiry · {fmtDateTime(openEnquiry.created_at)}
          </p>

          <div className="space-y-3 text-sm">
            <Field label="Status">
              <StatusPill status={openEnquiry.status} />
            </Field>
            <Field label="Name">{openEnquiry.name}</Field>
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
            <div>
              <div className="text-xs text-muted-foreground">Message</div>
              <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-brand-charcoal">
                {openEnquiry.message}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Admin notes</div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder="Internal notes about this enquiry…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green"
              />
              <button
                type="button"
                disabled={notesMut.isPending || notesDraft === (openEnquiry.admin_notes ?? "")}
                onClick={() => notesMut.mutate({ id: openEnquiry.id, notes: notesDraft })}
                className="mt-2 cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
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
              className="rounded-lg bg-brand-cream px-3 py-2 text-center text-sm font-semibold text-brand-green transition hover:bg-brand-sage/30"
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
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-brand-charcoal">{children}</div>
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
