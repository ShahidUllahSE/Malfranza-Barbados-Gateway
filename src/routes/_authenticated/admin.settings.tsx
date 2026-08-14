import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentAdmin } from "@/lib/api";
import {
  fetchAdminTaxiFareSettings,
  updateAdminTaxiFareSettings,
  type TaxiFareSettings,
} from "@/lib/bookings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const EMPTY: TaxiFareSettings = {
  fareFor1to4: 1.62,
  fareFor5to7: 2.4,
  fareFor8to10: 4,
  perKmUsd: 0,
  minimumFareUsd: 5,
};

function SettingsPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const settingsQ = useQuery({
    queryKey: ["admin", "taxi-fare-settings"],
    queryFn: fetchAdminTaxiFareSettings,
  });
  const [form, setForm] = useState<TaxiFareSettings>(EMPTY);

  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => setEmail(admin.email))
      .catch(() => setEmail(""));
  }, []);

  useEffect(() => {
    if (!settingsQ.data) return;
    const data = settingsQ.data;
    setForm({
      fareFor1to4: data.fareFor1to4 ?? data.fareFor1Guest ?? 1.62,
      fareFor5to7: data.fareFor5to7 ?? data.fareFor3Guests ?? 2.4,
      fareFor8to10: data.fareFor8to10 ?? data.fareFor4PlusGuests ?? 4,
      perKmUsd: data.perKmUsd ?? 0,
      minimumFareUsd: data.minimumFareUsd,
    });
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: () =>
      updateAdminTaxiFareSettings({
        ...form,
        perKmUsd: 0,
      }),
    onSuccess: (data) => {
      setForm(data);
      qc.setQueryData(["admin", "taxi-fare-settings"], data);
      toast.success("Taxi fares saved — guest bookings will use these rates");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save fares"),
  });

  function setNumber(key: keyof TaxiFareSettings, value: string) {
    const n = Number(value);
    setForm((current) => ({
      ...current,
      [key]: Number.isFinite(n) && n >= 0 ? n : 0,
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Settings</h1>
        <p className="text-sm text-muted-foreground">Account and taxi pricing.</p>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-5 max-w-lg">
        <h2 className="font-display font-bold text-brand-charcoal">Account</h2>
        <div className="mt-3 text-sm">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-brand-charcoal">{email || "—"}</div>
        </div>
      </div>

      <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-display font-bold text-brand-charcoal">Taxi rates (USD per km)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the regulated rate by vehicle size. Fare = driving distance (Google Maps) × rate for
          the van chosen, never below the minimum. The 8–10 seat tier is kept for later.
        </p>

        {settingsQ.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading fares…</p>
        ) : settingsQ.isError ? (
          <p className="mt-4 text-sm text-red-600">Couldn’t load fare settings. Try refreshing.</p>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MoneyField
                label="4-seater $/km"
                hint="Up to 4 passengers"
                value={form.fareFor1to4}
                onChange={(v) => setNumber("fareFor1to4", v)}
                step="0.01"
              />
              <MoneyField
                label="XL 7-seater $/km"
                hint="Up to 7 passengers"
                value={form.fareFor5to7}
                onChange={(v) => setNumber("fareFor5to7", v)}
                step="0.01"
              />
              <MoneyField
                label="8–10 seater $/km"
                hint="Not offered yet"
                value={form.fareFor8to10}
                onChange={(v) => setNumber("fareFor8to10", v)}
                step="0.01"
              />
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <MoneyField
                label="Minimum fare"
                hint="Never charge less than this"
                value={form.minimumFareUsd}
                onChange={(v) => setNumber("minimumFareUsd", v)}
                step="0.01"
              />
            </div>

            <div className="rounded-xl bg-brand-cream/70 px-4 py-3 text-xs text-brand-charcoal">
              <p className="font-semibold text-brand-green">How the total is calculated</p>
              <p className="mt-1">
                Distance (km) × rate for the vehicle size, then floored by the minimum fare.
              </p>
              <p className="mt-2 text-muted-foreground">
                Example: 4-seater · 10 km → 10 × ${form.fareFor1to4} = $
                {Math.max(
                  form.minimumFareUsd,
                  Math.round(10 * form.fareFor1to4 * 100) / 100,
                ).toFixed(2)}
                {" · "}
                XL · 10 km → 10 × ${form.fareFor5to7} = $
                {Math.max(
                  form.minimumFareUsd,
                  Math.round(10 * form.fareFor5to7 * 100) / 100,
                ).toFixed(2)}
              </p>
            </div>

            <button
              type="submit"
              disabled={save.isPending}
              className="cursor-pointer rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save taxi fares"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-card p-5 max-w-lg">
        <h2 className="font-display font-bold text-brand-charcoal">Team access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Additional admins can be granted access after they create an account. Contact support to
          add teammates in bulk.
        </p>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  hint,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  hint?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-brand-charcoal">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <input
          type="number"
          min={0}
          step={step}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-white py-2 pl-7 pr-3 text-sm outline-none focus:border-brand-green"
        />
      </div>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
