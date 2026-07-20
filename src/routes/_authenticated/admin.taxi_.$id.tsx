import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Route as RouteIcon,
  ChevronRight,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import {
  assignTaxiDriver,
  getTaxiBooking,
  updateTaxiBookingStatus,
  type TaxiStatus,
} from "@/lib/admin";
import { getDriverDetail, listAvailableDrivers } from "@/lib/drivers";
import { ActionBtn } from "./admin.bookings";
import { AdminTableShell, AdminTd, AdminTh, StatusPill } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/taxi_/$id")({
  component: TaxiTripDetailPage,
});

function TaxiTripDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [assignDriverId, setAssignDriverId] = useState("");

  const tripQ = useQuery({
    queryKey: ["admin", "taxi-booking", id],
    queryFn: () => getTaxiBooking(id),
  });

  const trip = tripQ.data;
  const driverId = trip?.driver?.id;

  const driverQ = useQuery({
    queryKey: ["admin", "drivers", driverId, "trip-detail"],
    queryFn: () => getDriverDetail(driverId!),
    enabled: !!driverId,
  });

  const driversQ = useQuery({
    queryKey: ["admin", "drivers-available"],
    queryFn: listAvailableDrivers,
  });

  const statusMut = useMutation({
    mutationFn: (s: TaxiStatus) => updateTaxiBookingStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "taxi-booking", id] });
      qc.invalidateQueries({ queryKey: ["admin", "taxi-bookings"] });
      if (driverId) qc.invalidateQueries({ queryKey: ["admin", "drivers", driverId] });
      toast.success("Trip updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const assignMut = useMutation({
    mutationFn: (nextDriverId: string) => assignTaxiDriver(id, nextDriverId),
    onSuccess: () => {
      setAssignDriverId("");
      qc.invalidateQueries({ queryKey: ["admin", "taxi-booking", id] });
      qc.invalidateQueries({ queryKey: ["admin", "taxi-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "drivers"] });
      toast.success("Driver assigned");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Assign failed"),
  });

  if (tripQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading trip…</p>;
  }

  if (tripQ.isError || !trip) {
    return (
      <div className="space-y-3">
        <Link to="/admin/taxi" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green">
          <ArrowLeft className="h-4 w-4" />
          Back to taxi trips
        </Link>
        <h1 className="font-display text-2xl font-bold text-brand-charcoal">Trip not found</h1>
        <p className="text-sm text-muted-foreground">
          {tripQ.error instanceof Error ? tripQ.error.message : "Could not load this trip."}
        </p>
      </div>
    );
  }

  const stats = driverQ.data?.stats;
  const recentTrips = (driverQ.data?.trips ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/taxi"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to taxi trips
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-brand-charcoal sm:text-3xl">
            {trip.booking_reference}
          </h1>
          <StatusPill status={trip.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{trip.service_type}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-brand-charcoal">Trip details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Customer" value={trip.customer_name} />
            <Field label="Phone" value={trip.customer_phone} />
            <Field label="Email" value={trip.customer_email} />
            <Field label="Passengers" value={String(trip.passengers)} />
            <Field label="Pickup" value={`${trip.pickup_date} at ${trip.pickup_time}`} />
            <Field
              label="Fare"
              value={`$${Number(trip.estimated_fare).toFixed(0)}${
                trip.duration_minutes != null ? ` · ~${trip.duration_minutes} min` : ""
              }`}
            />
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Route</div>
              <p className="mt-0.5 flex items-start gap-1.5 text-sm text-brand-charcoal">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
                <span>
                  {trip.pickup_location} → {trip.dropoff_location}
                </span>
              </p>
            </div>
            {trip.notes && (
              <div className="sm:col-span-2">
                <Field label="Notes" value={trip.notes} />
              </div>
            )}
          </div>

          {(trip.status === "pending" || trip.status === "confirmed" || trip.status === "assigned") && (
            <div className="mt-5 space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                {trip.driver ? "Reassign driver" : "Assign driver"}
              </div>
              <select
                value={assignDriverId}
                onChange={(e) => setAssignDriverId(e.target.value)}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Select available driver…</option>
                {(driversQ.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.vehicleLabel ? ` · ${d.vehicleLabel}` : ""}
                  </option>
                ))}
              </select>
              <ActionBtn
                onClick={() => {
                  if (!assignDriverId) {
                    toast.error("Select a driver first");
                    return;
                  }
                  assignMut.mutate(assignDriverId);
                }}
              >
                {assignMut.isPending ? "Assigning…" : "Assign & notify driver"}
              </ActionBtn>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trip.status === "pending" && (
              <ActionBtn onClick={() => statusMut.mutate("confirmed")}>Confirm</ActionBtn>
            )}
            {trip.status === "assigned" && (
              <ActionBtn onClick={() => statusMut.mutate("en_route")}>Mark en route</ActionBtn>
            )}
            {trip.status === "en_route" && (
              <ActionBtn onClick={() => statusMut.mutate("completed")}>Complete</ActionBtn>
            )}
            {["pending", "confirmed", "assigned", "en_route"].includes(trip.status) && (
              <ActionBtn danger onClick={() => statusMut.mutate("cancelled")}>
                Cancel trip
              </ActionBtn>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-brand-charcoal">Assigned driver</h2>
          {!trip.driver ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No driver assigned yet. Use the assign panel to pick an available driver.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-brand-sage/15 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-green shadow-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-bold text-brand-charcoal">{trip.driver.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {trip.driver.phone}
                    </p>
                    {trip.driver.vehicleLabel && (
                      <p className="text-sm text-muted-foreground">{trip.driver.vehicleLabel}</p>
                    )}
                  </div>
                </div>
                <Link
                  to="/admin/drivers/$id"
                  params={{ id: trip.driver.id }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Open full driver progress
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-2">
                  <MiniMetric icon={RouteIcon} label="Total rides" value={stats.total} />
                  <MiniMetric icon={CheckCircle2} label="Completed" value={stats.completed} />
                  <MiniMetric icon={Activity} label="Active now" value={stats.activeNow} />
                  <MiniMetric
                    icon={CircleDollarSign}
                    label="Fare earned"
                    value={`$${stats.fareEarned.toFixed(0)}`}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {trip.driver && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-brand-charcoal">
                {trip.driver.name}&apos;s ride progress
              </h2>
              <p className="text-sm text-muted-foreground">
                Recent rides for this driver. Open the full page for day/date/status filters.
              </p>
            </div>
            <Link
              to="/admin/drivers/$id"
              params={{ id: trip.driver.id }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:opacity-80"
            >
              View all rides & filters
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 lg:hidden">
            {driverQ.isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading driver rides…</p>
            )}
            {recentTrips.map((ride) => (
              <div key={ride.id} className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-brand-charcoal">{ride.customerName}</p>
                    <p className="text-xs text-muted-foreground">{ride.bookingReference}</p>
                  </div>
                  <StatusPill status={ride.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {ride.pickupDate} · {ride.pickupTime}
                </p>
                <p className="text-sm">
                  {ride.pickupLocation} → {ride.dropoffLocation}
                </p>
              </div>
            ))}
            {!driverQ.isLoading && recentTrips.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No rides yet for this driver.</p>
            )}
          </div>

          <div className="hidden lg:block">
            <AdminTableShell minWidth="56rem">
              <thead className="bg-slate-50">
                <tr>
                  <AdminTh>Guest</AdminTh>
                  <AdminTh>Route</AdminTh>
                  <AdminTh>Pickup</AdminTh>
                  <AdminTh>Fare</AdminTh>
                  <AdminTh>Status</AdminTh>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((ride) => (
                  <tr
                    key={ride.id}
                    className={`border-t border-slate-100 ${ride.id === trip.id ? "bg-brand-sage/10" : ""}`}
                  >
                    <AdminTd>
                      <div className="font-medium">{ride.customerName}</div>
                      <div className="text-xs text-muted-foreground">{ride.bookingReference}</div>
                    </AdminTd>
                    <AdminTd className="max-w-[16rem] text-sm">
                      {ride.pickupLocation} → {ride.dropoffLocation}
                    </AdminTd>
                    <AdminTd nowrap className="text-sm">
                      {ride.pickupDate} · {ride.pickupTime}
                    </AdminTd>
                    <AdminTd nowrap className="font-semibold">
                      ${ride.estimatedFare.toFixed(0)}
                    </AdminTd>
                    <AdminTd nowrap>
                      <StatusPill status={ride.status} />
                    </AdminTd>
                  </tr>
                ))}
                {!driverQ.isLoading && recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No rides yet for this driver.
                    </td>
                  </tr>
                )}
              </tbody>
            </AdminTableShell>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-brand-charcoal">{value}</div>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 text-brand-green" />
        {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold text-brand-charcoal">{value}</div>
    </div>
  );
}
