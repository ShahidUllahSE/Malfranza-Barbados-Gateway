import { apiRequest } from "@/lib/api";
import { uniquePhotoUrls } from "@/lib/photos";
import {
  catalogFromRate,
  roomTypeFromApartmentType,
  roomTypeFromBedrooms,
} from "@/lib/pricing";

export type Apartment = {
  id: string;
  mongoId: string;
  name: string;
  subtitle: string;
  description: string;
  type: "one-bedroom" | "two-bedroom" | "three-bedroom";
  guests: number;
  beds: number;
  baths: number;
  sizeSqM: number;
  pricePerNight: number;
  images: string[];
  amenities: string[];
  /** When true, unit configs are mutually exclusive (1-BR vs 2-BR on same property). */
  unitsExclusive: boolean;
  units: ApartmentUnit[];
};

export type ApartmentUnit = {
  id: string;
  name: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  isActive: boolean;
};

/** Prefer curated rooms/* set (6 unique per listing); fallback to legacy newimage names. */
const ROOM_IMAGE_MODULES = import.meta.glob(
  "../assets/rooms/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const ROOM1_IMAGE_MODULES = import.meta.glob(
  "../assets/room1/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const ROOM2_IMAGE_MODULES = import.meta.glob(
  "../assets/room2/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const ROOM3_IMAGE_MODULES = import.meta.glob(
  "../assets/room3/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const ROOM4_IMAGE_MODULES = import.meta.glob(
  "../assets/room4/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const ROOM_AB_IMAGE_MODULES = import.meta.glob(
  "../assets/Malfranza A and B/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP}",
  { eager: true, import: "default" },
) as Record<string, string>;

const NEW_IMAGE_MODULES = import.meta.glob(
  "../assets/newimage/*.{jpg,jpeg,JPG,JPEG,png,PNG}",
  { eager: true, import: "default" },
) as Record<string, string>;

function naturalName(path: string) {
  return path.split("/").pop() ?? path;
}

function galleryFromModules(
  modules: Record<string, string>,
  match: string | RegExp,
  limit = 8,
): string[] {
  const needle = typeof match === "string" ? match.toLowerCase() : match;
  const urls = Object.entries(modules)
    .filter(([p]) => {
      const n = naturalName(p).toLowerCase();
      const full = p.toLowerCase();
      if (typeof needle === "string") return n.includes(needle) || full.includes(needle);
      return needle.test(n) || needle.test(full);
    })
    .sort(([a], [b]) =>
      naturalName(a).localeCompare(naturalName(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map(([, url]) => url);
  return uniquePhotoUrls(urls).slice(0, limit);
}

function galleryFor(match: string): string[] {
  const room = galleryFromModules(ROOM_IMAGE_MODULES, match, 10);
  if (room.length > 0) return room;

  const m = match.toLowerCase();
  if (m.includes("tropical") || m.includes("apartment-1")) {
    const room1 = galleryFromModules(ROOM1_IMAGE_MODULES, "room1", 8);
    if (room1.length > 0) return room1;
  }
  if (m.includes("island") || m.includes("apartment-2")) {
    const room2 = galleryFromModules(ROOM2_IMAGE_MODULES, "room2", 8);
    if (room2.length > 0) return room2;
  }
  if (m.includes("palm") || m.includes("apartment-3")) {
    const room3 = galleryFromModules(ROOM3_IMAGE_MODULES, "room3", 8);
    if (room3.length > 0) return room3;
  }
  if (m.includes("golden") || m.includes("apartment-4") || m.includes("serenity")) {
    const room4 = galleryFromModules(ROOM4_IMAGE_MODULES, "room4", 8);
    if (room4.length > 0) return room4;
  }
  if (m.includes("sunset") || m.includes("a-and-b") || m.includes("a and b")) {
    const ab = galleryFromModules(ROOM_AB_IMAGE_MODULES, "malfranza a and b", 8);
    if (ab.length === 0) {
      // path match on full module key
      const fromPath = Object.entries(ROOM_AB_IMAGE_MODULES)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([, url]) => url);
      return uniquePhotoUrls(fromPath).slice(0, 8);
    }
    return ab;
  }

  // Do not fall back to shared newimage dumps for master rooms
  if (
    m.includes("tropical") ||
    m.includes("island") ||
    m.includes("palm") ||
    m.includes("golden") ||
    m.includes("sunset")
  ) {
    return [];
  }
  return galleryFromModules(NEW_IMAGE_MODULES, match, 8);
}

const SHARED_AMENITIES = [
  "High Speed Starlink Internet",
  "Air Conditioning",
  "Smart TV",
  "Fridge",
  "Microwave",
  "Kettle",
  "Kitchen",
  "Coffee Machine",
  "Toaster",
  "Iron",
  "Fire Extinguisher",
] as const;

const AMENITIES_1BR = [...SHARED_AMENITIES, "Washing Machine"] as const;
const AMENITIES_2BR = [...SHARED_AMENITIES] as const;

/**
 * Master Room Schedule fallback — names fixed for when room photos arrive.
 * Live data still comes from the API when available.
 *
 * Room 1 Tropical Escape · Room 2 Island Breeze · Room 3 Palm Retreat
 * Room 4 Golden Serenity · Room A&B Sunset Suite
 */
export const APARTMENTS: Apartment[] = [
  {
    id: "apartment-1",
    mongoId: "",
    name: "Tropical Escape",
    subtitle: "Room 1",
    description:
      "Tropical Escape — one-bedroom self-catering apartment at Malfranza, Oistins.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 55,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("tropical-escape"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-2",
    mongoId: "",
    name: "Island Breeze",
    subtitle: "Room 2",
    description:
      "Island Breeze — one-bedroom self-catering apartment at Malfranza, Oistins.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 54,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("island-breeze"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-3",
    mongoId: "",
    name: "Palm Retreat",
    subtitle: "Room 3",
    description:
      "Palm Retreat — one-bedroom self-catering apartment at Malfranza, Oistins.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 52,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("palm-retreat"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-4",
    mongoId: "",
    name: "Golden Serenity",
    subtitle: "Room 4",
    description:
      "Golden Serenity — two-bedroom apartment at Malfranza, Oistins.",
    type: "two-bedroom",
    guests: 4,
    beds: 2,
    baths: 2,
    sizeSqM: 90,
    pricePerNight: catalogFromRate("two-bedroom"),
    images: galleryFor("golden-serenity"),
    amenities: [...AMENITIES_2BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-a-and-b",
    mongoId: "",
    name: "Sunset Suite",
    subtitle: "Room A & B",
    description:
      "Sunset Suite — Room A and Room B at Malfranza, Oistins. Book either room on its own, or both together.",
    type: "two-bedroom",
    guests: 4,
    beds: 2,
    baths: 2,
    sizeSqM: 95,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("sunset-suite"),
    amenities: [...AMENITIES_2BR],
    unitsExclusive: false,
    units: [
      {
        id: "room-a",
        name: "Room A",
        description: "Independently bookable room in Sunset Suite.",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        pricePerNight: catalogFromRate("one-bedroom"),
        isActive: true,
      },
      {
        id: "room-b",
        name: "Room B",
        description: "Independently bookable room in Sunset Suite.",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        pricePerNight: catalogFromRate("one-bedroom"),
        isActive: true,
      },
    ],
  },
];

export function getApartment(id: string) {
  return APARTMENTS.find((a) => a.id === id);
}

export async function fetchApartments(): Promise<Apartment[]> {
  try {
    const records = await apiRequest<any[]>("/apartments?sort=price-asc");
    const mapped = records.map(mapApiApartment).filter((a) => a.images.length > 0 || a.mongoId);
    return mapped.length > 0 ? mapped : APARTMENTS;
  } catch {
    return APARTMENTS;
  }
}

export async function fetchApartment(slug: string): Promise<Apartment | undefined> {
  try {
    const record = await apiRequest<any>(`/apartments/${encodeURIComponent(slug)}`);
    return mapApiApartment(record);
  } catch {
    return getApartment(slug);
  }
}

/** Drop empty/placeholder URLs and collapse exact URL duplicates. */
// uniquePhotoUrls imported from @/lib/photos

function mapApiApartment(record: any): Apartment {
  const fallback = getApartment(record.slug);
  const photos = uniquePhotoUrls(record.photos);
  const units: ApartmentUnit[] = Array.isArray(record.units)
    ? record.units
        .filter((unit: any) => unit.isActive !== false)
        .map((unit: any) => {
          const bedrooms = Number(unit.bedrooms) || 1;
          return {
            id: String(unit._id),
            name: unit.name,
            description: "",
            bedrooms,
            bathrooms: unit.bathrooms,
            maxGuests: unit.maxGuests,
            pricePerNight: catalogFromRate(roomTypeFromBedrooms(bedrooms)),
            isActive: unit.isActive !== false,
          };
        })
    : [];
  const roomType = roomTypeFromApartmentType(record.type);
  const seedImages = fallback?.images ?? [];
  return {
    id: record.slug,
    mongoId: String(record._id ?? ""),
    name: record.name ?? fallback?.name ?? record.slug,
    subtitle: record.subtitle ?? fallback?.subtitle ?? "",
    description: record.description ?? fallback?.description ?? "",
    type: record.type,
    guests: record.maxGuests,
    beds: record.bedrooms,
    baths: record.bathrooms,
    sizeSqM: record.sizeSqM ?? fallback?.sizeSqM ?? 0,
    pricePerNight:
      units.length > 0
        ? Math.min(...units.map((u) => u.pricePerNight))
        : catalogFromRate(roomType),
    images: uniquePhotoUrls(photos.length > 0 ? photos : seedImages).slice(0, 10),
    amenities: Array.isArray(record.amenities)
      ? record.amenities
      : (fallback?.amenities ?? []),
    unitsExclusive: Boolean(record.unitsExclusive) || fallback?.unitsExclusive === true,
    units: units.length > 0 ? units : (fallback?.units ?? []),
  };
}
