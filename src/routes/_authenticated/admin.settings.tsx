import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentAdmin } from "@/lib/api";
// Hidden for now — Team access / create another admin
// import { listAdminAccounts, createAdminAccount, setAdminAccountActive } from "@/lib/api";
// Hidden for now — taxi $/km lives on each driver
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { toast } from "sonner";
// import {
//   fetchAdminTaxiFareSettings,
//   updateAdminTaxiFareSettings,
//   type TaxiFareSettings,
// } from "@/lib/bookings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => {
        setEmail(admin.email);
      })
      .catch(() => {
        setEmail("");
      });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Settings</h1>
        <p className="text-sm text-muted-foreground">Account.</p>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-5 max-w-lg">
        <h2 className="font-display font-bold text-brand-charcoal">Account</h2>
        <div className="mt-3 text-sm">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-brand-charcoal">{email || "—"}</div>
        </div>
      </div>

      {/* Taxi rates — hidden; set $/km on each driver instead
      <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-display font-bold text-brand-charcoal">Taxi rates (USD per km)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Default rates by vehicle size. Each driver’s own price per km overrides these.
        </p>
      </div>
      */}

      {/* Team access / create another admin — hidden for now
      <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-display font-bold text-brand-charcoal">Team access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create another admin. They sign in with the same site Sign in using this email and
          password.
        </p>
      </div>
      */}
    </div>
  );
}
