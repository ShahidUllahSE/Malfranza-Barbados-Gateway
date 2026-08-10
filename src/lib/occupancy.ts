/**
 * Occupancy helpers (admin dashboard / reports).
 * Reference: available room-nights = inventory slots × period days;
 * occupancy % = booked nights in period ÷ available × 100.
 */

export type OccupancyApartment = {
  id: string;
  is_active?: boolean;
  /** Backend camelCase */
  unitsExclusive?: boolean;
  /** Admin-mapped snake_case */
  units_exclusive?: boolean;
  units?: Array<{ isActive?: boolean }>;
};

export type OccupancyBooking = {
  apartment_id: string;
  check_in: string;
  check_out: string;
  status: string;
};

/** How many simultaneous inventory slots this listing represents. */
export function inventorySlots(apt: OccupancyApartment): number {
  if (apt.is_active === false) return 0;
  const units = (apt.units ?? []).filter((u) => u.isActive !== false);
  const exclusive = apt.unitsExclusive === true || apt.units_exclusive === true;
  // Exclusive 1-BR/2-BR configs share one physical unit.
  if (exclusive || units.length === 0) return 1;
  return units.length;
}

export function totalInventorySlots(apartments: OccupancyApartment[]): number {
  return Math.max(1, apartments.reduce((sum, a) => sum + inventorySlots(a), 0));
}

/** Nights of a stay overlapping [rangeStart, rangeEnd) in ISO date days. */
export function bookedNightsInRange(
  checkIn: string,
  checkOut: string,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const ci = new Date(`${checkIn.slice(0, 10)}T00:00:00`);
  const co = new Date(`${checkOut.slice(0, 10)}T00:00:00`);
  const s = ci < rangeStart ? rangeStart : ci;
  const e = co > rangeEnd ? rangeEnd : co;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}

export type OccupancyResult = {
  occupancy: number;
  bookedNights: number;
  availableNights: number;
  inventory: number;
  horizonDays: number;
};

/** Rolling window from today for `horizonDays` (default 30). */
export function calcRollingOccupancy(
  bookings: OccupancyBooking[],
  apartments: OccupancyApartment[],
  horizonDays = 30,
): OccupancyResult {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + horizonDays);

  const inventory = totalInventorySlots(apartments);
  let bookedNights = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    bookedNights += bookedNightsInRange(b.check_in, b.check_out, start, end);
  }
  const availableNights = inventory * horizonDays;
  const occupancy = Math.min(100, Math.round((bookedNights / availableNights) * 100));
  return { occupancy, bookedNights, availableNights, inventory, horizonDays };
}

/** Calendar month occupancy. */
export function calcMonthOccupancy(
  bookings: OccupancyBooking[],
  apartments: OccupancyApartment[],
  year: number,
  monthIndex: number,
): OccupancyResult {
  const monthStart = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthEnd = new Date(year, monthIndex, daysInMonth + 1); // exclusive end
  const inventory = totalInventorySlots(apartments);
  let bookedNights = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    bookedNights += bookedNightsInRange(b.check_in, b.check_out, monthStart, monthEnd);
  }
  const availableNights = inventory * daysInMonth;
  const occupancy = Math.min(100, Math.round((bookedNights / Math.max(1, availableNights)) * 100));
  return {
    occupancy,
    bookedNights,
    availableNights,
    inventory,
    horizonDays: daysInMonth,
  };
}

export function formatShortStayRange(checkIn: string, checkOut: string): string {
  const fmt = (iso: string) => {
    try {
      return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  };
  return `${fmt(checkIn)} – ${fmt(checkOut)}`;
}
