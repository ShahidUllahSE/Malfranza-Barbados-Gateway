import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, CircleHelp, Plus, Percent, Search, Wallet } from "lucide-react";
import {
  createTravelAgencyAdmin,
  fetchAdminAgencyCommission,
  fetchAdminAgencySettings,
  listAdminAgencies,
  setAdminAgencyActive,
  updateAdminAgencySettings,
} from "@/lib/agency";
import {
  AdminPageHeader,
  AdminTableShell,
  AdminTh,
  AdminTd,
  AdminTr,
  AdminEmptyState,
  TableShimmer,
  AdminPager,
  useAdminPage,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  component: AdminAgenciesPage,
});

function money(n: number) {
  return `$${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const inputClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20";

function AdminAgenciesPage() {
  const qc = useQueryClient();
  const agenciesQ = useQuery({ queryKey: ["admin", "agencies"], queryFn: listAdminAgencies });
  const settingsQ = useQuery({
    queryKey: ["admin", "agency-settings"],
    queryFn: fetchAdminAgencySettings,
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState("10");
  const [form, setForm] = useState({
    agencyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
  });

  const commissionQ = useQuery({
    queryKey: ["admin", "agency-commission", fromDate, toDate],
    queryFn: () =>
      fetchAdminAgencyCommission({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  useEffect(() => {
    if (settingsQ.data?.defaultCommissionPercent != null) {
      setCommissionPercent(String(settingsQ.data.defaultCommissionPercent));
    }
  }, [settingsQ.data]);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setAdminAgencyActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agencies"] });
      toast.success("Agency updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const saveRate = useMutation({
    mutationFn: () => {
      const pct = Number(commissionPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error("Enter a commission between 0 and 100");
      }
      return updateAdminAgencySettings({
        defaultCommissionPercent: pct,
        applyToAllAgencies: true,
      });
    },
    onSuccess: (data) => {
      setCommissionPercent(String(data.defaultCommissionPercent));
      qc.setQueryData(["admin", "agency-settings"], data);
      qc.invalidateQueries({ queryKey: ["admin", "agencies"] });
      qc.invalidateQueries({ queryKey: ["admin", "agency-commission"] });
      toast.success(`Commission rate set to ${data.defaultCommissionPercent}% for all travel agents`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save rate"),
  });

  const create = useMutation({
    mutationFn: () =>
      createTravelAgencyAdmin({
        agencyName: form.agencyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin", "agencies"] });
      toast.success(
        `Agency created · code ${result.agency.agencyCode}. Share email/password so they use site Sign in.`,
      );
      setForm({ agencyName: "", contactName: "", email: "", phone: "", password: "" });
      setShowCreate(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create agency"),
  });

  const agencies = agenciesQ.data ?? [];
  const report = commissionQ.data;
  const ratePercent =
    settingsQ.data?.defaultCommissionPercent ??
    Math.round((report?.commissionRate ?? 0.1) * 100);

  /** Commission figures for the selected period, keyed by agency code */
  const periodByCode = useMemo(() => {
    const map = new Map<
      string,
      { bookings: number; stayRevenue: number; commissionOwed: number }
    >();
    for (const row of report?.agencies ?? []) {
      map.set(row.agencyCode, {
        bookings: row.bookings,
        stayRevenue: row.stayRevenue,
        commissionOwed: row.commissionOwed,
      });
    }
    return map;
  }, [report]);

  const periodLabel = useMemo(() => {
    if (!fromDate && !toDate) return "all time";
    if (fromDate && toDate) return `${fromDate} → ${toDate}`;
    if (fromDate) return `from ${fromDate}`;
    return `until ${toDate}`;
  }, [fromDate, toDate]);

  const rows = useMemo(() => {
    let list = agencies.map((a: any) => {
      const period = periodByCode.get(String(a.agencyCode));
      return {
        ...a,
        periodBookings: period?.bookings ?? 0,
        periodStayRevenue: period?.stayRevenue ?? 0,
        periodCommission: period?.commissionOwed ?? 0,
      };
    });
    if (search.trim()) {
      const s = search.trim().toUpperCase();
      list = list.filter(
        (a: any) =>
          String(a.agencyCode).includes(s) ||
          String(a.agencyName).toUpperCase().includes(s) ||
          String(a.email).toUpperCase().includes(s) ||
          String(a.contactName).toUpperCase().includes(s),
      );
    }
    return list;
  }, [agencies, periodByCode, search]);

  const pager = useAdminPage(rows, search);

  const totalOwed = report?.totals.commissionOwed ?? 0;
  const totalStays = report?.totals.bookings ?? 0;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Travel agencies"
        description="Create agents here. They use the same site Sign in as guests."
        meta={
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-green px-3.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {showCreate ? "Close form" : "Add travel agent"}
          </button>
        }
      />

      {showCreate && (
        <form
          className="rounded-xl border border-border/70 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.password.length < 8) {
              toast.error("Password must be at least 8 characters");
              return;
            }
            create.mutate();
          }}
        >
          <h2 className="text-sm font-semibold text-brand-charcoal">New travel agent</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A unique booking code is generated automatically. Share the email and password so
            they can sign in site-wide and open /agency.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Agency name</span>
              <input
                required
                value={form.agencyName}
                onChange={(e) => setForm((f) => ({ ...f, agencyName: e.target.value }))}
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Contact name</span>
              <input
                required
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Email (login)</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Phone</span>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Initial password</span>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={`${inputClass} mt-1 w-full`}
                placeholder="At least 8 characters"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {create.isPending ? "Creating…" : "Create agency"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-charcoal hover:bg-brand-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Plain-English how it works */}
      <div className="rounded-xl border border-brand-sage/30 bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-3">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
            <CircleHelp className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-sm text-brand-charcoal">
            <p className="font-semibold">How this works (simple)</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              <li>
                You create the agent here (admin only). They get a unique code like{" "}
                <span className="font-mono font-semibold text-brand-green">AG-XXXXXXXX</span> and
                use the normal site Sign in — no public agent sign-up.
              </li>
              <li>
                When they book for a guest, that code is entered on the booking form.
              </li>
              <li>
                That stay is linked to them and they earn{" "}
                <span className="font-semibold text-brand-charcoal">
                  {ratePercent}% of the room total
                </span>{" "}
                (not taxi). You pay that commission later.
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-brand-charcoal">Travel agent commission</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Change the platform rate anytime. Saving updates all agents; new bookings use this %.
              Past bookings keep the rate they were booked at.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveRate.mutate();
            }}
          >
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Rate (%)</span>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  required
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className={`${inputClass} w-28 pr-7`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </label>
            <button
              type="submit"
              disabled={saveRate.isPending || settingsQ.isLoading}
              className="h-9 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saveRate.isPending ? "Saving…" : "Save rate"}
            </button>
          </form>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard
          icon={Building2}
          title="Agencies on file"
          value={String(agencies.length)}
          note={`${agencies.filter((a: any) => a.isActive).length} currently active`}
        />
        <StatCard
          icon={Percent}
          title="Commission rate"
          value={`${ratePercent}%`}
          note="Of stay (room) amount only"
        />
        <StatCard
          icon={Wallet}
          title="What you owe right now"
          value={money(totalOwed)}
          note={`${totalStays} stay(s) in “${periodLabel}”`}
          highlight
        />
      </div>

      {/* One table */}
      <section className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-card">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-charcoal">All travel agents</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every registered agency is listed once. The numbers on the right are for the period
            you pick below.
          </p>
        </div>

        {/* Filters: one clear row */}
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Show commission for
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className={`h-9 cursor-pointer rounded-lg px-3 text-xs font-semibold transition ${
                !fromDate && !toDate
                  ? "bg-brand-green text-white"
                  : "border border-slate-200 bg-white text-brand-charcoal hover:bg-white"
              }`}
            >
              All time
            </button>
          </div>
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, email…"
              className={`${inputClass} w-full pl-8`}
            />
          </div>
        </div>

        {agenciesQ.isLoading || commissionQ.isLoading ? (
          <div className="p-4">
            <TableShimmer rows={4} cols={7} />
          </div>
        ) : rows.length === 0 ? (
          <AdminEmptyState message="No travel agencies yet — use “Add travel agent” above." />
        ) : (
          <>
            {/* Mobile list */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {pager.slice.map((a: any) => (
                <div key={a.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-charcoal">{a.agencyName}</p>
                      <p className="font-mono text-xs font-bold text-brand-green">{a.agencyCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.contactName} · {a.email}
                      </p>
                    </div>
                    <StatusPill active={a.isActive} />
                  </div>
                  <div className="rounded-lg bg-brand-cream/50 px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Period: {periodLabel}</p>
                    <p className="mt-0.5 text-brand-charcoal">
                      {a.periodBookings} stay(s) · rooms {money(a.periodStayRevenue)}
                    </p>
                    <p className="font-bold text-brand-orange">
                      You owe {money(a.periodCommission)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: a.id, isActive: !a.isActive })}
                    className="cursor-pointer text-xs font-semibold text-brand-green hover:underline"
                  >
                    {a.isActive ? "Deactivate (block their code)" : "Reactivate"}
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <AdminTableShell minWidth="56rem">
              <thead>
                <tr>
                  <AdminTh className="!py-2.5">Travel agent</AdminTh>
                  <AdminTh className="!py-2.5">Their booking code</AdminTh>
                  <AdminTh className="!py-2.5">Contact</AdminTh>
                  <AdminTh className="!py-2.5">
                    Stays
                    <span className="mt-0.5 block normal-case tracking-normal text-[10px] font-normal text-muted-foreground">
                      in period
                    </span>
                  </AdminTh>
                  <AdminTh className="!py-2.5">
                    Room revenue
                    <span className="mt-0.5 block normal-case tracking-normal text-[10px] font-normal text-muted-foreground">
                      in period
                    </span>
                  </AdminTh>
                  <AdminTh className="!py-2.5">
                    You owe them
                    <span className="mt-0.5 block normal-case tracking-normal text-[10px] font-normal text-muted-foreground">
                      {ratePercent}% commission
                    </span>
                  </AdminTh>
                  <AdminTh className="!py-2.5">Status</AdminTh>
                  <AdminTh className="!py-2.5"> </AdminTh>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((a: any) => (
                  <AdminTr key={a.id}>
                    <AdminTd className="!py-2.5">
                      <span className="font-semibold text-brand-charcoal">{a.agencyName}</span>
                    </AdminTd>
                    <AdminTd nowrap className="!py-2.5">
                      <span className="rounded bg-brand-green/10 px-1.5 py-0.5 font-mono text-xs font-bold text-brand-green">
                        {a.agencyCode}
                      </span>
                    </AdminTd>
                    <AdminTd className="!py-2.5">
                      <div className="text-sm">{a.contactName}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </AdminTd>
                    <AdminTd nowrap className="!py-2.5 text-sm">
                      {a.periodBookings}
                    </AdminTd>
                    <AdminTd nowrap className="!py-2.5 text-sm">
                      {money(a.periodStayRevenue)}
                    </AdminTd>
                    <AdminTd nowrap className="!py-2.5">
                      <span className="text-sm font-bold text-brand-orange">
                        {money(a.periodCommission)}
                      </span>
                    </AdminTd>
                    <AdminTd className="!py-2.5">
                      <StatusPill active={a.isActive} />
                    </AdminTd>
                    <AdminTd className="!py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle.mutate({ id: a.id, isActive: !a.isActive })}
                        className="cursor-pointer text-xs font-semibold text-brand-green hover:underline"
                      >
                        {a.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTableShell>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-muted-foreground">
              <AdminPager
                page={pager.page}
                pages={pager.pages}
                total={pager.total}
                from={pager.from}
                to={pager.to}
                onPage={pager.setPage}
                noun="agents"
              />
              <span>
                Total commission to pay:{" "}
                <span className="font-bold text-brand-orange">{money(totalOwed)}</span>
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  note,
  highlight,
}: {
  icon: typeof Building2;
  title: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white px-3.5 py-3 shadow-sm ${
        highlight ? "border-brand-orange/30" : "border-border/70"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            highlight ? "bg-brand-orange/10 text-brand-orange" : "bg-brand-sage/20 text-brand-green"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
          <p className="font-display text-xl font-bold text-brand-charcoal">{value}</p>
          <p className="text-[11px] text-muted-foreground">{note}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
