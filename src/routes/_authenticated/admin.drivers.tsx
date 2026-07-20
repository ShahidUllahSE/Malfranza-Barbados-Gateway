import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus } from "lucide-react";
import { createDriver, listDrivers, updateDriver, type AdminDriver } from "@/lib/drivers";
import { AdminTableShell, AdminTd, AdminTh } from "@/components/admin/AdminBits";
import { Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/drivers")({
  component: DriversPage,
});

function DriversPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "drivers"], queryFn: listDrivers });
  const [creating, setCreating] = useState(false);

  const toggleAvailable = useMutation({
    mutationFn: (driver: AdminDriver) =>
      updateDriver(driver.id, { isAvailable: !driver.isAvailable }),
    onSuccess: (_data, driver) => {
      toast.success(driver.isAvailable ? "Marked unavailable" : "Marked available");
      qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const toggleActive = useMutation({
    mutationFn: (driver: AdminDriver) =>
      updateDriver(driver.id, { isActive: !driver.isActive }),
    onSuccess: (_data, driver) => {
      toast.success(driver.isActive ? "Driver deactivated" : "Driver activated");
      qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-charcoal sm:text-3xl">Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Manage taxi drivers, availability, and portal access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90"
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
                  View rides
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <RowAction onClick={() => toggleAvailable.mutate(driver)}>
                  {driver.isAvailable ? "Set unavailable" : "Set available"}
                </RowAction>
                <RowAction muted onClick={() => toggleActive.mutate(driver)}>
                  {driver.isActive ? "Deactivate" : "Activate"}
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
        <AdminTableShell minWidth="56rem">
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
                    <RowAction onClick={() => toggleAvailable.mutate(driver)}>
                      {driver.isAvailable ? "Unavailable" : "Available"}
                    </RowAction>
                    <RowAction muted onClick={() => toggleActive.mutate(driver)}>
                      {driver.isActive ? "Deactivate" : "Activate"}
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
          <CreateDriverForm
            onCancel={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
            }}
          />
        </Drawer>
      )}
    </div>
  );
}

function CreateDriverForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createDriver({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        vehicleLabel: vehicleLabel.trim() || undefined,
        isAvailable: true,
      }),
    onSuccess: () => {
      toast.success("Driver created");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <Field label="Full name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Email">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
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
      <Field label="Password">
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {create.isPending ? "Creating…" : "Create driver"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        muted
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
