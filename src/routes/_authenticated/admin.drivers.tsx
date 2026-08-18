import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CircleOff,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
  type AdminDriver,
} from "@/lib/drivers";
import { fetchAdminTaxiFareSettings, vehicleFareFromSettings } from "@/lib/bookings";
import { AdminPageHeader, AdminTableShell, AdminTd, AdminTh } from "@/components/admin/AdminBits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <AdminPageHeader
        title="Drivers"
        description="Create, edit, activate, or delete taxi drivers and portal access."
        meta={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add driver
          </button>
        }
      />

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
                  {(driver.vehicleLabel || driver.passengerCapacity) && (
                    <p className="text-xs text-muted-foreground">
                      {driver.vehicleLabel || "Van"}
                      {driver.passengerCapacity ? ` · ${driver.passengerCapacity} seats` : ""}
                      {driver.pricePerKmUsd
                        ? ` · $${Number(driver.pricePerKmUsd).toFixed(2)}/km`
                        : ""}
                    </p>
                  )}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge active={driver.isActive} onLabel="Active" offLabel="Inactive" />
                    <StatusBadge
                      active={driver.isAvailable}
                      onLabel="Available"
                      offLabel="Unavailable"
                      tone="blue"
                    />
                  </div>
                  <DriverActions
                    driver={driver}
                    onEdit={() => setEditing(driver)}
                    onToggleAvailable={() => toggleAvailable.mutate(driver)}
                    onToggleActive={() => toggleActive.mutate(driver)}
                    onDelete={() => setDeleting(driver)}
                  />
                </div>
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
        <AdminTableShell>
          <thead className="bg-slate-50">
            <tr>
              <AdminTh className="w-[12%]">Name</AdminTh>
              <AdminTh className="w-[18%]">Email</AdminTh>
              <AdminTh className="w-[12%]">Phone</AdminTh>
              <AdminTh className="w-[14%]">Vehicle</AdminTh>
              <AdminTh className="w-[8%]">Seats</AdminTh>
              <AdminTh className="w-[10%]">$/km</AdminTh>
              <AdminTh className="w-[10%]">Status</AdminTh>
              <AdminTh className="w-[12%]">Availability</AdminTh>
              <AdminTh className="w-[8%]">
                <span className="block text-right">Actions</span>
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={driver.id} className="group border-t border-slate-100 hover:bg-brand-cream/40">
                <AdminTd className="font-medium">
                  <Link
                    to="/admin/drivers/$id"
                    params={{ id: driver.id }}
                    className="block truncate text-brand-charcoal hover:text-brand-green hover:underline"
                    title={driver.name}
                  >
                    {driver.name}
                  </Link>
                </AdminTd>
                <AdminTd className="text-xs">
                  <span className="block truncate" title={driver.email}>
                    {driver.email}
                  </span>
                </AdminTd>
                <AdminTd className="text-sm">
                  <span className="block truncate">{driver.phone}</span>
                </AdminTd>
                <AdminTd className="text-sm text-muted-foreground">
                  <span className="block truncate" title={driver.vehicleLabel || undefined}>
                    {driver.vehicleLabel || "—"}
                  </span>
                </AdminTd>
                <AdminTd className="text-sm text-muted-foreground">
                  {driver.passengerCapacity ?? "—"}
                </AdminTd>
                <AdminTd className="text-sm font-medium text-brand-charcoal">
                  {driver.pricePerKmUsd != null
                    ? `$${Number(driver.pricePerKmUsd).toFixed(2)}`
                    : "—"}
                </AdminTd>
                <AdminTd>
                  <StatusBadge active={driver.isActive} onLabel="Active" offLabel="Inactive" />
                </AdminTd>
                <AdminTd>
                  <StatusBadge
                    active={driver.isAvailable}
                    onLabel="Available"
                    offLabel="Unavailable"
                    tone="blue"
                  />
                </AdminTd>
                <AdminTd nowrap>
                  <DriverActions
                    driver={driver}
                    onEdit={() => setEditing(driver)}
                    onToggleAvailable={() => toggleAvailable.mutate(driver)}
                    onToggleActive={() => toggleActive.mutate(driver)}
                    onDelete={() => setDeleting(driver)}
                  />
                </AdminTd>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
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
  const [passengerCapacity, setPassengerCapacity] = useState(initial?.passengerCapacity ?? 4);
  const [pricePerKmUsd, setPricePerKmUsd] = useState(
    initial?.pricePerKmUsd != null ? String(initial.pricePerKmUsd) : "",
  );
  const [rateTouched, setRateTouched] = useState(initial?.pricePerKmUsd != null);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);

  const faresQ = useQuery({
    queryKey: ["admin", "taxi-fare-settings"],
    queryFn: fetchAdminTaxiFareSettings,
  });
  const xlRate = faresQ.data ? vehicleFareFromSettings(faresQ.data, 7) : 2.4;
  const coachRate = faresQ.data ? vehicleFareFromSettings(faresQ.data, 12) : 4;

  function defaultRateForCapacity(capacity: number) {
    return capacity <= 7 ? xlRate : coachRate;
  }

  const ratePresets = [
    { value: xlRate, label: `$${xlRate.toFixed(2)} · XL 7-seater` },
    { value: coachRate, label: `$${coachRate.toFixed(2)} · 12-seater` },
  ].filter((preset, index, all) => all.findIndex((p) => p.value === preset.value) === index);

  const parsedRate = Number(pricePerKmUsd);
  const selectedPreset =
    Number.isFinite(parsedRate) && ratePresets.some((p) => Math.abs(p.value - parsedRate) < 0.001)
      ? String(parsedRate)
      : "custom";

  useEffect(() => {
    if (rateTouched) return;
    setPricePerKmUsd(String(defaultRateForCapacity(passengerCapacity)));
  }, [passengerCapacity, xlRate, coachRate, rateTouched]);

  const save = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        await createDriver({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          vehicleLabel: vehicleLabel.trim() || undefined,
          passengerCapacity,
          pricePerKmUsd: Number(pricePerKmUsd),
          isAvailable,
        });
        return;
      }

      await updateDriver(initial!.id, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleLabel: vehicleLabel.trim() || null,
        passengerCapacity,
        pricePerKmUsd: Number(pricePerKmUsd),
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
        const rate = Number(pricePerKmUsd);
        if (!Number.isFinite(rate) || rate <= 0) {
          toast.error("Enter a price per km greater than 0");
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
          placeholder="XL — 7 seats"
        />
      </Field>
      <Field label="Passenger capacity">
        <select
          value={passengerCapacity}
          onChange={(e) => setPassengerCapacity(Number(e.target.value))}
          className={inputClass}
        >
          {[4, 5, 6, 7, 8, 10, 12, 14].map((n) => (
            <option key={n} value={n}>
              {n} passengers
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price per km (USD)">
        <select
          value={selectedPreset}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "custom") {
              setRateTouched(true);
              return;
            }
            setRateTouched(true);
            setPricePerKmUsd(next);
          }}
          className={inputClass}
        >
          {ratePresets.map((preset) => (
            <option key={preset.value} value={String(preset.value)}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom amount</option>
        </select>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <input
            required
            type="number"
            min={0.01}
            step="0.01"
            value={pricePerKmUsd}
            onChange={(e) => {
              setRateTouched(true);
              setPricePerKmUsd(e.target.value);
            }}
            className={`${inputClass} pl-7`}
            placeholder="2.40"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Guest fare for this van = driving distance × this rate (never below the Settings minimum).
        </p>
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

function DriverActions({
  driver,
  onEdit,
  onToggleAvailable,
  onToggleActive,
  onDelete,
}: {
  driver: AdminDriver;
  onEdit: () => void;
  onToggleAvailable: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-brand-green hover:bg-brand-sage/40"
        title="Edit"
        aria-label={`Edit ${driver.name}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-charcoal"
            title="More actions"
            aria-label={`More actions for ${driver.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/admin/drivers/$id" params={{ id: driver.id }}>
              <Eye className="h-4 w-4" />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={onToggleAvailable}>
            {driver.isAvailable ? <CircleOff className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {driver.isAvailable ? "Mark unavailable" : "Mark available"}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={onToggleActive}>
            <Power className="h-4 w-4" />
            {driver.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700"
            onSelect={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
