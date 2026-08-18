import { Car, Users } from "lucide-react";
import type { PublicTaxiVehicle } from "@/lib/bookings";

function fmtRideDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function VehicleOfferCard({
  vehicle,
  currency,
  passengers,
  selected,
  onSelect,
}: {
  vehicle: PublicTaxiVehicle;
  currency: string;
  passengers: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const booked = !vehicle.isAvailable;
  const selectable = vehicle.isAvailable && vehicle.fitsParty;
  const slots = vehicle.bookedSlots ?? [];
  const status = !vehicle.fitsParty
    ? "Too small for your party"
    : booked
      ? vehicle.busyUntil
        ? `Booked until ${vehicle.busyUntil}`
        : "Booked for the next 1 hour"
      : "Available now";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-card sm:p-5 ${
        selected
          ? "border-brand-orange ring-2 ring-brand-orange/30"
          : "border-border"
      } ${booked ? "opacity-90" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-cream text-brand-green sm:h-16 sm:w-16">
          <Car className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-brand-charcoal">{vehicle.vehicleLabel}</p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                booked
                  ? "bg-brand-charcoal text-white"
                  : selectable
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Up to {vehicle.passengerCapacity} passengers
          </p>

          {slots.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Booked slots
              </p>
              <div className="flex flex-wrap gap-1.5">
                {slots.slice(0, 4).map((slot) => (
                  <span
                    key={`${slot.date}-${slot.time}`}
                    className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
                  >
                    {fmtRideDate(slot.date)} · {slot.time}
                    {slot.until ? `–${slot.until}` : ""}
                  </span>
                ))}
                {slots.length > 4 && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    +{slots.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold text-brand-green sm:text-2xl">
            ${Number(vehicle.fare).toFixed(2)}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {currency} · {passengers} guest{passengers === 1 ? "" : "s"}
          </p>
          {vehicle.perKmUsd != null && Number(vehicle.perKmUsd) > 0 && (
            <p className="mt-0.5 text-[11px] font-semibold text-brand-charcoal">
              ${Number(vehicle.perKmUsd).toFixed(2)}/km
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {booked || !selectable ? (
          <span className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-600">
            {booked
              ? vehicle.busyUntil
                ? `Booked until ${vehicle.busyUntil}`
                : "Booked for the next 1 hour"
              : "Unavailable"}
          </span>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-orange text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
          >
            {selected ? "Selected" : "Select van"}
          </button>
        )}
      </div>
    </article>
  );
}
