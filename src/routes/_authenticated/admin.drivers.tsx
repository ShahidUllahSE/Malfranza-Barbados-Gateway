import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
  type AdminDriver,
} from "@/lib/drivers";
import { AdminTableShell, AdminTd, AdminTh } from "@/components/admin/AdminBits";
import { Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/drivers")({
  component: DriversPage,
});

function DriversPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "drivers"], queryFn: listDrivers });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminDriver | null>(null);
  const [deleting, setDeleting] = useState<AdminDriver | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
  }

  const toggleAvailable = useMutation({
    mutationFn: (driver: AdminDriver) =>
      updateDriver(driver.id, { isAvailable: !driver.isAvailable }),
    onSuccess: (_data, driver) => {
      toast.success(driver.isAvailable ? "Marked unavailable" : "Marked available");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const toggleActive = useMutation({
    mutationFn: (driver: AdminDriver) =>
      updateDriver(driver.id, { isActive: !driver.isActive }),
    onSuccess: (_data, driver) => {
      toast.success(driver.isActive ? "Driver deactivated" : "Driver activated");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => {
      toast.success("Driver deleted");
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-charcoal sm:text-3xl">Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, activate, or delete taxi drivers and portal access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add driver
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {/* Mobile */}
        <div className="divide-y divide-slate-100 lg:hidden">
          {rows.map((driver) => (
            <div key={driver.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/admin/drivers/$id"
                  params={{ id: driver.id }}
                  className="min-w-0 flex-1 rounded-lg outline-none ring-brand-green/40 focus-visible:ring-2"
                >
                  <p className="font-semibold text-brand-charcoal hover:text-brand-green">{driver.name}</p>
                  <p className="break-all text-xs text-muted-foreground">{driver.email}</p>
                  <p className="text-xs text-muted-foreground">{driver.phone}</p>
                  {driver.vehicleLabel && (
                    <p className="text-xs text-muted-foreground">{driver.vehicleLabel}</p>
                  )}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge active={driver.isActive} onLabel="Active" offLabel="Inactive" />
                  <StatusBadge
                    active={driver.isAvailable}
                    onLabel="Available"
                    offLabel="Unavailable"
                    tone="blue"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/drivers/$id"
                  params={{ id: driver.id }}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-sage/30 px-2.5 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-sage/50"
                >
                  Details
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <RowAction onClick={() => setEditing(driver)}>Edit</RowAction>
                <RowAction onClick={() => toggleAvailable.mutate(driver)}>
                  {driver.isAvailable ? "Set unavailable" : "Set available"}
                </RowAction>
                <RowAction muted onClick={() => toggleActive.mutate(driver)}>
                  {driver.isActive ? "Deactivate" : "Activate"}
                </RowAction>
                <RowAction danger onClick={() => setDeleting(driver)}>
                  Delete
                </RowAction>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {q.isLoading ? "Loading…" : "No drivers yet. Add your first driver."}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <AdminTableShell minWidth="64rem">
          <thead className="bg-slate-50">
            <tr>
              <AdminTh>Name</AdminTh>
              <AdminTh>Email</AdminTh>
              <AdminTh>Phone</AdminTh>
              <AdminTh>Vehicle</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Availability</AdminTh>
              <AdminTh className="sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                Actions
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={driver.id} className="group border-t border-slate-100">
                <AdminTd nowrap className="font-medium">
                  <Link
                    to="/admin/drivers/$id"
                    params={{ id: driver.id }}
                    className="text-brand-charcoal hover:text-brand-green hover:underline"
                  >
                    {driver.name}
                  </Link>
                </AdminTd>
                <AdminTd className="max-w-[14rem] text-xs">
                  <span className="break-all">{driver.email}</span>
                </AdminTd>
                <AdminTd nowrap className="text-sm">{driver.phone}</AdminTd>
                <AdminTd nowrap className="text-sm text-muted-foreground">
                  {driver.vehicleLabel || "—"}
                </AdminTd>
                <AdminTd nowrap>
                  <StatusBadge active={driver.isActive} onLabel="Active" offLabel="Inactive" />
                </AdminTd>
                <AdminTd nowrap>
                  <StatusBadge
                    active={driver.isAvailable}
                    onLabel="Available"
                    offLabel="Unavailable"
                    tone="blue"
                  />
                </AdminTd>
                <AdminTd
                  nowrap
                  className="sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)] group-hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/drivers/$id"
                      params={{ id: driver.id }}
                      className="rounded-lg bg-brand-sage/30 px-2.5 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-sage/50"
                    >
                      Details
                    </Link>
                    <RowAction onClick={() => setEditing(driver)}>
                      <span className="inline-flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </span>
                    </RowAction>
                    <RowAction onClick={() => toggleAvailable.mutate(driver)}>
                      {driver.isAvailable ? "Unavailable" : "Available"}
                    </RowAction>
                    <RowAction muted onClick={() => toggleActive.mutate(driver)}>
                      {driver.isActive ? "Deactivate" : "Activate"}
                    </RowAction>
                    <RowAction danger onClick={() => setDeleting(driver)}>
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </span>
                    </RowAction>
                  </div>
                </AdminTd>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No drivers yet. Add your first driver."}
                </td>
              </tr>
            )}
          </tbody>
        </AdminTableShell>
      </div>

      {creating && (
        <Drawer onClose={() => setCreating(false)}>
          <h2 className="font-display text-xl font-bold text-brand-charcoal">Add driver</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            They sign in with the same modal using this email and password.
          </p>
          <DriverForm
            mode="create"
            onCancel={() => setCreating(false)}
            onDone={() => {
              setCreating(false);
              refresh();
            }}
          />
        </Drawer>
      )}

      {editing && (
        <Drawer onClose={() => setEditing(null)}>
          <h2 className="font-display text-xl font-bold text-brand-charcoal">Edit driver</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Update profile details. Leave password blank to keep the current one.
          </p>
          <DriverForm
            mode="edit"
            initial={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Drawer>
      )}

      {deleting && (
        <Drawer onClose={() => !remove.isPending && setDeleting(null)}>
          <h2 className="font-display text-xl font-bold text-brand-charcoal">Delete driver</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Permanently remove <span className="font-semibold text-brand-charcoal">{deleting.name}</span>
            {" "}({deleting.email}). This cannot be undone.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            If they have active assigned trips, delete will be blocked — deactivate them instead.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
              className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {remove.isPending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
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

function DriverForm({
  mode,
  initial,
  onCancel,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: AdminDriver;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState(initial?.vehicleLabel ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);

  const save = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        await createDriver({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          vehicleLabel: vehicleLabel.trim() || undefined,
          isAvailable,
        });
        return;
      }

      await updateDriver(initial!.id, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleLabel: vehicleLabel.trim() || null,
        isActive,
        isAvailable,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Driver created" : "Driver updated");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : mode === "create" ? "Create failed" : "Update failed"),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "create" && password.trim().length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        save.mutate();
      }}
    >
      <Field label="Full name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Email">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          disabled={mode === "edit"}
        />
        {mode === "edit" && (
          <p className="mt-1 text-[11px] text-muted-foreground">Email can’t be changed after create.</p>
        )}
      </Field>
      <Field label="Phone">
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Vehicle (optional)">
        <input
          value={vehicleLabel}
          onChange={(e) => setVehicleLabel(e.target.value)}
          className={inputClass}
          placeholder="White van · B 1234"
        />
      </Field>
      <Field label={mode === "create" ? "Password" : "New password (optional)"}>
        <input
          required={mode === "create"}
          type="password"
          minLength={mode === "create" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={mode === "edit" ? "Leave blank to keep current" : undefined}
        />
      </Field>
      {mode === "edit" && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-charcoal">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (can sign in to the driver portal)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-charcoal">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
            />
            Available for new trip assignments
          </label>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="flex-1 cursor-pointer rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {save.isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create driver"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function StatusBadge({
  active,
  onLabel,
  offLabel,
  tone = "green",
}: {
  active: boolean;
  onLabel: string;
  offLabel: string;
  tone?: "green" | "blue";
}) {
  const onCls =
    tone === "blue" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? onCls : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? onLabel : offLabel}
    </span>
  );
}

function RowAction({
  children,
  onClick,
  muted,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        danger
          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : muted
            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
            : "bg-brand-green text-white hover:opacity-90"
      }`}
    >
      {children}
    </button>
  );
}

const inputClass = "w-full rounded-lg border border-input bg-white px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-brand-charcoal">{label}</div>
      {children}
    </label>
  );
}
