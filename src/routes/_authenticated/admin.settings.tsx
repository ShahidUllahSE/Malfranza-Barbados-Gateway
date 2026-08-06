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
  fareFor1Guest: 25,
  fareFor2Guests: 30,
  fareFor3Guests: 35,
  fareFor4PlusGuests: 45,
  perKmUsd: 2.5,
  minimumFareUsd: 20,
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
    if (settingsQ.data) setForm(settingsQ.data);
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: () => updateAdminTaxiFareSettings(form),
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
        <h2 className="font-display font-bold text-brand-charcoal">Taxi fares by guests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the base fare for 1, 2, 3, or 4+ passengers. An optional per-km charge is added on top
          for the route distance. Guests see these amounts in estimates and bookings.
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
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField
                label="1 guest"
                value={form.fareFor1Guest}
                onChange={(v) => setNumber("fareFor1Guest", v)}
              />
              <MoneyField
                label="2 guests"
                value={form.fareFor2Guests}
                onChange={(v) => setNumber("fareFor2Guests", v)}
              />
              <MoneyField
                label="3 guests"
                value={form.fareFor3Guests}
                onChange={(v) => setNumber("fareFor3Guests", v)}
              />
              <MoneyField
                label="4 or more guests"
                value={form.fareFor4PlusGuests}
                onChange={(v) => setNumber("fareFor4PlusGuests", v)}
              />
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <MoneyField
                label="Per km (optional)"
                hint="Set to 0 for flat guest-only pricing"
                value={form.perKmUsd}
                onChange={(v) => setNumber("perKmUsd", v)}
                step="0.1"
              />
              <MoneyField
                label="Minimum fare"
                hint="Never charge less than this"
                value={form.minimumFareUsd}
                onChange={(v) => setNumber("minimumFareUsd", v)}
              />
            </div>

            <div className="rounded-xl bg-brand-cream/70 px-4 py-3 text-xs text-brand-charcoal">
              <p className="font-semibold text-brand-green">How the total is calculated</p>
              <p className="mt-1">
                Guest fare (from the brackets above) + (distance km × per km), then floored by the
                minimum fare.
              </p>
              <p className="mt-2 text-muted-foreground">
                Example with current values: 2 guests · 10 km → ${form.fareFor2Guests} + 10 × $
                {form.perKmUsd} = ${Math.max(form.minimumFareUsd, Math.round(form.fareFor2Guests + 10 * form.perKmUsd))}
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
