/**
 * Seasonal + room-type pricing (USD / room / night).
 * Keep in sync with backend `modules/apartments/pricing.ts`.
 */

export type PricedRoomType = "one-bedroom" | "two-bedroom";

const RATES: Record<PricedRoomType, { off: number; peak: number }> = {
  "one-bedroom": { off: 90, peak: 95 },
  "two-bedroom": { off: 100, peak: 110 },
};

export const PLATFORM_MIN_NIGHTLY = 90;

export function isPeakSeason(isoDate: string): boolean {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  if (month === 12 && day >= 15) return true;
  if (month >= 1 && month <= 3) return true;
  if (month === 4 && day <= 14) return true;
  if (month === 7 || month === 8) return true;

  return false;
}

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

export function nightlyRate(roomType: PricedRoomType, isoDate: string): number {
  const band = RATES[roomType];
  const rate = isPeakSeason(isoDate) ? band.peak : band.off;
  return Math.max(PLATFORM_MIN_NIGHTLY, rate);
}

export function catalogFromRate(roomType: PricedRoomType): number {
  return RATES[roomType].off;
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
  const total = nights.reduce((sum, day) => sum + nightlyRate(roomType, day), 0);
  return Math.round(total * 100) / 100;
}

export function averageNightly(
  roomType: PricedRoomType,
  checkIn: string,
  checkOut: string,
): number {
  const nights = stayNights(checkIn, checkOut);
  if (nights.length === 0) return catalogFromRate(roomType);
  return Math.round((staySubtotal(roomType, checkIn, checkOut) / nights.length) * 100) / 100;
}

/** Peak table rates for help copy */
export const RATE_TABLE = {
  "one-bedroom": { off: 90, peak: 95 },
  "two-bedroom": { off: 100, peak: 110 },
} as const;
