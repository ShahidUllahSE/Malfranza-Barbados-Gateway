import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import {
  deleteDirectoryAccount,
  getCurrentAdmin,
  listDirectoryAccounts,
  restoreDirectoryAccount,
  setDirectoryAccountActive,
  type DirectoryAccount,
  type DirectoryKind,
  type DirectoryStatus,
} from "@/lib/api";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTableCard,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
  FilterChip,
  TableShimmer,
  AdminPager,
  useAdminPage,
} from "@/components/admin/AdminBits";
import { Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type StatusFilter = "total" | "blocked" | "deleted";
type KindFilter = "all" | DirectoryKind;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "blocked", label: "Blocked" },
  { id: "deleted", label: "Deleted" },
];

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "admin", label: "Admin" },
  { id: "agency", label: "Travel agents" },
  { id: "driver", label: "Drivers" },
  { id: "guest", label: "Guests" },
];

const KIND_LABEL: Record<DirectoryKind, string> = {
  admin: "Admin",
  agency: "Travel agent",
  driver: "Driver",
  guest: "Guest",
};

function UsersPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: listDirectoryAccounts });
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: getCurrentAdmin });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("total");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DirectoryAccount | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  const setActive = useMutation({
    mutationFn: ({ user, isActive }: { user: DirectoryAccount; isActive: boolean }) =>
      setDirectoryAccountActive(user.kind, user.id, isActive),
    onSuccess: (_data, { isActive }) => {
      toast.success(isActive ? "Account unblocked" : "Account blocked");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (user: DirectoryAccount) => deleteDirectoryAccount(user.kind, user.id),
    onSuccess: () => {
      toast.success("Account deleted");
      setPendingDelete(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const restore = useMutation({
    mutationFn: (user: DirectoryAccount) => restoreDirectoryAccount(user.kind, user.id),
    onSuccess: () => {
      toast.success("Account restored");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Restore failed"),
  });

  const all = q.data ?? [];
  const meId = me.data?.id;

  const counts = useMemo(() => {
    return {
      total: all.length,
      blocked: all.filter((u) => u.status === "blocked").length,
      deleted: all.filter((u) => u.status === "deleted").length,
      all: all.length,
      admin: all.filter((u) => u.kind === "admin").length,
      agency: all.filter((u) => u.kind === "agency").length,
      driver: all.filter((u) => u.kind === "driver").length,
      guest: all.filter((u) => u.kind === "guest").length,
    };
  }, [all]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all.filter((user) => {
      if (statusFilter === "blocked" && user.status !== "blocked") return false;
      if (statusFilter === "deleted" && user.status !== "deleted") return false;
      if (kindFilter !== "all" && user.kind !== kindFilter) return false;
      if (!needle) return true;
      return (
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.phone ?? "").toLowerCase().includes(needle) ||
        (user.detail ?? "").toLowerCase().includes(needle)
      );
    });
  }, [all, statusFilter, kindFilter, search]);

  const pager = useAdminPage(rows, `${statusFilter}|${kindFilter}|${search}`);

  const busy = setActive.isPending || remove.isPending || restore.isPending;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Users"
        description="Every account on the site: admins, travel agents, drivers, and guests. Block stops sign-in. Delete hides the account until you restore it."
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
            placeholder="Search name, email, phone…"
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
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <FilterRow label="Status">
            {STATUS_FILTERS.map((item) => (
              <FilterChip
                key={item.id}
                active={statusFilter === item.id}
                onClick={() => setStatusFilter(item.id)}
                count={counts[item.id]}
              >
                {item.label}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Account type">
            {KIND_FILTERS.map((item) => (
              <FilterChip
                key={item.id}
                active={kindFilter === item.id}
                onClick={() => setKindFilter(item.id)}
                count={counts[item.id]}
              >
                {item.label}
              </FilterChip>
            ))}
          </FilterRow>
        </div>
      </div>

      {q.isLoading ? (
        <TableShimmer rows={7} cols={7} />
      ) : q.isError ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-6 text-sm text-rose-700 shadow-card">
          Couldn’t load accounts. Refresh and try again.
        </div>
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
                noun="accounts"
              />
            ) : undefined
          }
        >
          <div className="divide-y divide-slate-100 lg:hidden">
            {pager.slice.map((user) => (
              <div key={`${user.kind}-${user.id}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-charcoal">{user.name}</p>
                    <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                    {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                    {user.detail && <p className="text-xs text-muted-foreground">{user.detail}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <KindBadge kind={user.kind} />
                    <StatusBadge status={user.status} />
                  </div>
                </div>
                {user.kind === "guest" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {user.stayBookings} stay{user.stayBookings === 1 ? "" : "s"} · {user.taxiBookings}{" "}
                    taxi
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Joined {fmtDate(user.createdAt)}
                  {user.lastLoginAt ? ` · Last login ${fmtDate(user.lastLoginAt)}` : ""}
                </p>
                <AccountActions
                  user={user}
                  isSelf={user.kind === "admin" && user.id === meId}
                  busy={busy}
                  onBlock={() => setActive.mutate({ user, isActive: false })}
                  onUnblock={() => setActive.mutate({ user, isActive: true })}
                  onDelete={() => setPendingDelete(user)}
                  onRestore={() => restore.mutate(user)}
                />
              </div>
            ))}
            {rows.length === 0 && (
              <AdminEmptyState message="No accounts match your filters" />
            )}
          </div>

          <AdminTableShell>
            <thead className="bg-slate-50">
              <tr>
                <AdminTh>Account</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Joined</AdminTh>
                <AdminTh>Last login</AdminTh>
                <AdminTh />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((user) => (
                <AdminTr key={`${user.kind}-${user.id}`}>
                  <AdminTd>
                    <div className="truncate font-semibold text-brand-charcoal" title={user.name}>
                      {user.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground" title={user.email}>
                      {user.email}
                    </div>
                    {(user.phone || user.detail) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {[user.phone, user.detail].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </AdminTd>
                  <AdminTd>
                    <KindBadge kind={user.kind} />
                  </AdminTd>
                  <AdminTd>
                    <StatusBadge status={user.status} />
                  </AdminTd>
                  <AdminTd className="text-xs text-muted-foreground">{fmtDate(user.createdAt)}</AdminTd>
                  <AdminTd className="text-xs text-muted-foreground">
                    {user.lastLoginAt ? fmtDate(user.lastLoginAt) : "—"}
                  </AdminTd>
                  <AdminTd nowrap>
                    <AccountActions
                      user={user}
                      isSelf={user.kind === "admin" && user.id === meId}
                      busy={busy}
                      compact
                      onBlock={() => setActive.mutate({ user, isActive: false })}
                      onUnblock={() => setActive.mutate({ user, isActive: true })}
                      onDelete={() => setPendingDelete(user)}
                      onRestore={() => restore.mutate(user)}
                    />
                  </AdminTd>
                </AdminTr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <AdminEmptyState message="No accounts match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTableShell>
        </AdminTableCard>
      )}

      {pendingDelete && (
        <Drawer onClose={() => !remove.isPending && setPendingDelete(null)}>
          <h2 className="font-display text-xl font-bold text-brand-charcoal">Delete account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-brand-charcoal">{pendingDelete.name}</span> (
            {pendingDelete.email}) from sign-in. You can restore it later from the Deleted filter.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(pendingDelete)}
              className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {remove.isPending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => setPendingDelete(null)}
              className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function KindBadge({ kind }: { kind: DirectoryKind }) {
  const cls: Record<DirectoryKind, string> = {
    admin: "bg-brand-green/10 text-brand-green",
    agency: "bg-amber-100 text-amber-800",
    driver: "bg-sky-100 text-sky-800",
    guest: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls[kind]}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function StatusBadge({ status }: { status: DirectoryStatus }) {
  const cls: Record<DirectoryStatus, string> = {
    active: "bg-emerald-100 text-emerald-800",
    blocked: "bg-slate-200 text-slate-700",
    deleted: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls[status]}`}
    >
      {status}
    </span>
  );
}

function AccountActions({
  user,
  isSelf,
  busy,
  compact,
  onBlock,
  onUnblock,
  onDelete,
  onRestore,
}: {
  user: DirectoryAccount;
  isSelf: boolean;
  busy: boolean;
  compact?: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const wrap = compact ? "flex flex-wrap items-center justify-end gap-3" : "mt-3 flex flex-wrap gap-3";
  if (isSelf) {
    return <p className={`${compact ? "" : "mt-3 "}text-xs text-muted-foreground`}>You</p>;
  }
  if (user.status === "deleted") {
    return (
      <div className={wrap}>
        <button
          type="button"
          disabled={busy}
          onClick={onRestore}
          className="text-xs font-semibold text-brand-green hover:underline disabled:opacity-60"
        >
          Restore
        </button>
      </div>
    );
  }
  return (
    <div className={wrap}>
      {user.status === "blocked" ? (
        <button
          type="button"
          disabled={busy}
          onClick={onUnblock}
          className="text-xs font-semibold text-brand-green hover:underline disabled:opacity-60"
        >
          Unblock
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onBlock}
          className="text-xs font-semibold text-brand-green hover:underline disabled:opacity-60"
        >
          Block
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}

function fmtDate(value: string) {
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
