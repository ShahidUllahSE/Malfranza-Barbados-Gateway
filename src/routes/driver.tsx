import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Car, LogOut, MapPin } from "lucide-react";
import { clearAllTokens, getCurrentDriver, type DriverIdentity } from "@/lib/api";
import {
  listMyDriverTrips,
  setMyDriverAvailability,
  updateMyTripStatus,
} from "@/lib/drivers";
import { StatusPill } from "@/components/admin/AdminBits";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver Portal — Malfranza" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DriverPortalPage,
});

function notifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "mfz-driver-ride" });
  } catch {
    // Some browsers require a service worker for notifications.
  }
}

function DriverPortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [driver, setDriver] = useState<DriverIdentity | null>(null);
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const knownTripIds = useRef<Set<string> | null>(null);

  const tripsQ = useQuery({
    queryKey: ["driver", "trips"],
    queryFn: listMyDriverTrips,
    enabled: status === "ok",
    refetchInterval: 5_000,
  });

  useEffect(() => {
    getCurrentDriver()
      .then((d) => {
        setDriver(d);
        setStatus("ok");
      })
      .catch(() => setStatus("denied"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifyPermission("unsupported");
      return;
    }
    setNotifyPermission(Notification.permission);
  }, []);

  const onTripsLoaded = useEffectEvent((trips: any[]) => {
    const active = trips.filter((t) => t.status === "assigned" || t.status === "en_route");
    const ids = new Set(active.map((t) => String(t._id)));

    if (knownTripIds.current === null) {
      knownTripIds.current = ids;
      return;
    }

    for (const trip of active) {
      const id = String(trip._id);
      if (!knownTripIds.current.has(id) && trip.status === "assigned") {
        const date = String(trip.pickupDate).slice(0, 10);
        toast.success("New ride assigned", {
          description: `${trip.pickupLocation} → ${trip.dropoffLocation} · ${date} ${trip.pickupTime}`,
          duration: 12_000,
        });
        notifyBrowser(
          "New Malfranza ride",
          `${trip.customerName}: ${trip.pickupLocation} → ${trip.dropoffLocation}`,
        );
      }
    }

    knownTripIds.current = ids;
  });

  useEffect(() => {
    if (!tripsQ.data) return;
    onTripsLoaded(tripsQ.data);
  }, [tripsQ.data]);

  const activeTrips = useMemo(
    () => (tripsQ.data ?? []).filter((t) => t.status === "assigned" || t.status === "en_route"),
    [tripsQ.data],
  );
  const pastTrips = useMemo(
    () => (tripsQ.data ?? []).filter((t) => t.status === "completed"),
    [tripsQ.data],
  );

  const availability = useMutation({
    mutationFn: (isAvailable: boolean) => setMyDriverAvailability(isAvailable),
    onSuccess: (d) => {
      setDriver(d);
      toast.success(d.isAvailable ? "You are available for trips" : "You are marked unavailable");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const tripStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: "en_route" | "completed" | "cancelled" }) =>
      updateMyTripStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver", "trips"] });
      toast.success("Trip updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported here");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifyPermission(permission);
    if (permission === "granted") {
      toast.success("Ride alerts enabled", {
        description: "You'll get a desktop notification for new assignments.",
      });
      notifyBrowser("Malfranza driver alerts on", "You'll be notified when a ride is assigned.");
    } else {
      toast.error("Notification permission denied");
    }
  }

  function signOut() {
    clearAllTokens();
    navigate({ to: "/", search: { auth: "signin" } });
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <p className="text-sm text-muted-foreground">Loading driver portal…</p>
      </div>
    );
  }

  if (status === "denied" || !driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-bold text-brand-charcoal">Driver sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your driver email and password in the site sign-in modal.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/", search: { auth: "signin" } })}
            className="mt-6 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-border bg-brand-green text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
            <div>
              <p className="font-display font-bold">Driver portal</p>
              <p className="text-xs text-white/80">{driver.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-charcoal">Availability</p>
              <p className="text-xs text-muted-foreground">
                {driver.isAvailable
                  ? "New bookings can auto-assign to you while you're free."
                  : "You won't receive new assignments."}
              </p>
            </div>
            <button
              type="button"
              disabled={availability.isPending}
              onClick={() => availability.mutate(!driver.isAvailable)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                driver.isAvailable ? "bg-amber-100 text-amber-900" : "bg-brand-green text-white"
              }`}
            >
              {driver.isAvailable ? "Go unavailable" : "Go available"}
            </button>
          </div>
        </div>

        {notifyPermission !== "unsupported" && notifyPermission !== "granted" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-sage/40 bg-white p-4 shadow-card">
            <div className="flex items-start gap-2">
              <BellOff className="mt-0.5 h-4 w-4 text-brand-green" />
              <div>
                <p className="text-sm font-semibold text-brand-charcoal">Enable ride alerts</p>
                <p className="text-xs text-muted-foreground">
                  Keep this tab open to get a toast + desktop notification when a ride is assigned.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={enableBrowserAlerts}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white"
            >
              <Bell className="h-4 w-4" />
              Allow alerts
            </button>
          </div>
        )}

        {notifyPermission === "granted" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5 text-brand-green" />
            Ride alerts on · portal checks for new trips every few seconds
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-brand-charcoal">Active trips</h2>
          {activeTrips.map((trip) => (
            <TripCard
              key={trip._id}
              trip={trip}
              busy={tripStatus.isPending}
              onEnRoute={() => tripStatus.mutate({ id: trip._id, s: "en_route" })}
              onComplete={() => tripStatus.mutate({ id: trip._id, s: "completed" })}
              onCancel={() => tripStatus.mutate({ id: trip._id, s: "cancelled" })}
            />
          ))}
          {activeTrips.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-muted-foreground shadow-card">
              {tripsQ.isLoading
                ? "Loading trips…"
                : "No active assigned trips. Stay available to get auto-booked."}
            </div>
          )}
        </section>

        {pastTrips.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-brand-charcoal">Completed</h2>
            {pastTrips.slice(0, 8).map((trip) => (
              <div key={trip._id} className="rounded-2xl bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{trip.bookingReference}</p>
                    <p className="text-sm font-medium text-brand-charcoal">{trip.serviceType}</p>
                  </div>
                  <StatusPill status={trip.status} />
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function TripCard({
  trip,
  busy,
  onEnRoute,
  onComplete,
  onCancel,
}: {
  trip: any;
  busy: boolean;
  onEnRoute: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const date = String(trip.pickupDate).slice(0, 10);
  const isNew =
    trip.status === "assigned" &&
    trip.assignedAt &&
    Date.now() - new Date(trip.assignedAt).getTime() < 15 * 60 * 1000;

  return (
    <div
      className={`space-y-3 rounded-2xl bg-white p-5 shadow-card ${
        isNew ? "ring-2 ring-brand-orange/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {isNew && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-orange">
              New ride
            </p>
          )}
          <p className="font-mono text-xs text-muted-foreground">{trip.bookingReference}</p>
          <p className="text-sm font-medium text-brand-green">You are assigned to</p>
          <p className="font-semibold text-brand-charcoal">{trip.customerName}</p>
          <p className="text-xs text-muted-foreground">{trip.customerPhone}</p>
          {trip.customerEmail && (
            <p className="text-xs text-muted-foreground break-all">{trip.customerEmail}</p>
          )}
        </div>
        <StatusPill status={trip.status} />
      </div>
      <div className="rounded-xl bg-brand-cream/50 px-3 py-2 text-sm text-brand-charcoal">
        <p>
          Pickup at <strong>{trip.pickupTime}</strong> on <strong>{date}</strong>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Passengers: {trip.passengers}
          {trip.durationMinutes ? ` · Approx trip ~${trip.durationMinutes} min` : ""}
          {trip.estimatedFare != null ? ` · Fare $${Number(trip.estimatedFare).toFixed(0)}` : ""}
        </p>
      </div>
      <div className="flex items-start gap-2 text-sm text-brand-charcoal">
        <Car className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
        <span>{trip.serviceType}</span>
      </div>
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
        <span>
          {trip.pickupLocation} → {trip.dropoffLocation}
        </span>
      </div>
      {trip.notes && (
        <p className="text-xs text-muted-foreground">Notes: {trip.notes}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {trip.status === "assigned" && (
          <button
            type="button"
            disabled={busy}
            onClick={onEnRoute}
            className="rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Start trip (en route)
          </button>
        )}
        {trip.status === "en_route" && (
          <button
            type="button"
            disabled={busy}
            onClick={onComplete}
            className="rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Mark completed
          </button>
        )}
        {(trip.status === "assigned" || trip.status === "en_route") && (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Cancel trip
          </button>
        )}
      </div>
    </div>
  );
}
