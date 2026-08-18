/**
 * Flat room-type pricing (USD / room / night).
 * Amplifi AI · Final Room Rates (Aug 2026) — PayPal fee already included.
 * Keep in sync with backend `modules/apartments/pricing.ts`.
 *
 * | Room Type   | Nightly rate |
 * | One-bedroom | $95          |
 * | Two-bedroom | $105         |
 */

export type PricedRoomType = "one-bedroom" | "two-bedroom";

export const PLATFORM_MIN_NIGHTLY = 95;

export const RATE_TABLE = {
  "one-bedroom": 95,
  "two-bedroom": 105,
} as const;

export function roomTypeFromBedrooms(bedrooms: number): PricedRoomType {
  return bedrooms >= 2 ? "two-bedroom" : "one-bedroom";
}

export function roomTypeFromApartmentType(
  type: string | undefined,
): PricedRoomType {
  return type === "two-bedroom" || type === "three-bedroom"
    ? "two-bedroom"
    : "one-bedroom";
}

export function nightlyRate(roomType: PricedRoomType, _isoDate?: string): number {
  return RATE_TABLE[roomType];
}

export function catalogFromRate(roomType: PricedRoomType): number {
  return RATE_TABLE[roomType];
}

export function stayNights(checkIn: string, checkOut: string): string[] {
  if (!checkIn || !checkOut) return [];
  const start = checkIn.slice(0, 10);
  const end = checkOut.slice(0, 10);
  const out: string[] = [];
  let cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor < last) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return out;
}

export function staySubtotal(roomType: PricedRoomType, checkIn: string, checkOut: string): number {
  const nights = stayNights(checkIn, checkOut);
  const rate = RATE_TABLE[roomType];
  const total = nights.length * rate;
  return Math.round(total * 100) / 100;
}

export function averageNightly(
  roomType: PricedRoomType,
  checkIn: string,
  checkOut: string,
): number {
  const nights = stayNights(checkIn, checkOut);
  if (nights.length === 0) return catalogFromRate(roomType);
  return RATE_TABLE[roomType];
}

export function unitNightlyRate(
  bedrooms: number,
  storedPrice?: number | null,
): number {
  if (storedPrice != null && Number(storedPrice) > 0) return Number(storedPrice);
  return catalogFromRate(roomTypeFromBedrooms(bedrooms));
}

/** Combined nightly rate when one or more bookable units are selected. */
export function combinedNightlyForUnits(
  units: { bedrooms: number; pricePerNight?: number | null }[],
): number {
  return units.reduce(
    (sum, unit) => sum + unitNightlyRate(unit.bedrooms, unit.pricePerNight),
    0,
  );
}

/** Stay subtotal for one or more units (each charged per room, per night). */
export function staySubtotalForUnits(
  units: { bedrooms: number; pricePerNight?: number | null }[],
  checkIn: string,
  checkOut: string,
): number {
  const nights = stayNights(checkIn, checkOut);
  if (nights.length === 0 || units.length === 0) return 0;
  const nightly = combinedNightlyForUnits(units);
  return Math.round(nightly * nights.length * 100) / 100;
}

/** Listing-card nightly rate from apartment type (not cheapest bookable unit). */
export function listingFromRate(input: {
  type: string | undefined;
  pricePerNight?: number | null;
}): number {
  if (input.pricePerNight != null && Number(input.pricePerNight) > 0) {
    return Number(input.pricePerNight);
  }
  return catalogFromRate(roomTypeFromApartmentType(input.type));
}
