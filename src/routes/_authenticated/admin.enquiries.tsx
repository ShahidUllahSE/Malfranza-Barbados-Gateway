import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listEnquiries, updateEnquiryStatus, type EnquiryStatus } from "@/lib/admin";
import { StatusPill } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  component: EnquiriesPage,
});

function EnquiriesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "enquiries"], queryFn: listEnquiries });
  const [filter, setFilter] = useState<EnquiryStatus | "all">("all");

  const mut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: EnquiryStatus }) => updateEnquiryStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "enquiries"] });
      toast.success("Enquiry updated");
    },
  });

  const rows = (q.data ?? []).filter((e) => filter === "all" || e.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Enquiries</h1>
        <p className="text-sm text-muted-foreground">Contact form submissions.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "new", "responded", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === s
                ? "bg-brand-green text-white border-brand-green"
                : "bg-white text-brand-charcoal border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((e) => (
          <div key={e.id} className="rounded-2xl bg-white shadow-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-brand-charcoal">{e.name}</span>
                  <StatusPill status={e.status} />
                  <span className="text-xs text-muted-foreground font-mono">{e.reference}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 break-words">
                  <span className="break-all">{e.email}</span>{e.phone ? ` · ${e.phone}` : ""} · Interested in: {e.interested_in}
                  {e.preferred_dates ? ` · Dates: ${e.preferred_dates}` : ""}
                </div>
                <p className="mt-3 text-sm text-brand-charcoal whitespace-pre-wrap">{e.message}</p>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                {e.status === "new" && (
                  <button
                    onClick={() => mut.mutate({ id: e.id, s: "responded" })}
                    className="rounded-lg bg-brand-green text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                  >
                    Mark as responded
                  </button>
                )}
                {(e.status === "new" || e.status === "responded") && (
                  <button
                    onClick={() => mut.mutate({ id: e.id, s: "closed" })}
                    className="rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl bg-white shadow-card p-8 text-center text-sm text-muted-foreground">
            {q.isLoading ? "Loading…" : "No enquiries yet."}
          </div>
        )}
      </div>
    </div>
  );
}
