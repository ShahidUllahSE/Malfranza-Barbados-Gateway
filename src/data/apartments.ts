import { apiRequest } from "@/lib/api";
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

/** Real property photos from src/assets/newimage (kept until final image swap). */
const NEW_IMAGE_MODULES = import.meta.glob(
  "../assets/newimage/*.{jpg,jpeg,JPG,JPEG,png,PNG}",
  { eager: true, import: "default" },
) as Record<string, string>;

function naturalName(path: string) {
  return path.split("/").pop() ?? path;
}

function galleryFor(match: string): string[] {
  const needle = match.toLowerCase();
  return Object.entries(NEW_IMAGE_MODULES)
    .filter(([path]) => naturalName(path).toLowerCase().includes(needle))
    .sort(([a], [b]) =>
      naturalName(a).localeCompare(naturalName(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map(([, url]) => url)
    .slice(0, 6);
}

const AMENITIES_1BR = [
  "Air Conditioning",
  "Kitchen",
  "Smart TV",
  "Workspace",
  "Kettle",
  "Microwave",
  "Wi-Fi",
] as const;

const AMENITIES_2BR = [
  "Air Conditioning",
  "Kitchen",
  "Smart TV",
  "Workspace",
  "Kettle",
  "Microwave",
  "Washer/Dryer",
  "Wi-Fi",
] as const;

/**
 * Seed / fallback listings — 3×1-BR + 1×2-BR (exclusive one/two-bedroom configs).
 * Live data still comes from the API when available.
 */
export const APARTMENTS: Apartment[] = [
  {
    id: "apartment-1",
    mongoId: "",
    name: "Tropical Escape",
    subtitle: "Room 1",
    description: "",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 55,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("apartment number 1"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-2",
    mongoId: "",
    name: "Island Breeze",
    subtitle: "Room 2",
    description: "",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 54,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("apartment number 2"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-3",
    mongoId: "",
    name: "Palm Retreat",
    subtitle: "Room 3",
    description: "",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 52,
    pricePerNight: catalogFromRate("one-bedroom"),
    images: galleryFor("apartment number 3"),
    amenities: [...AMENITIES_1BR],
    unitsExclusive: false,
    units: [],
  },
  {
    id: "apartment-4",
    mongoId: "",
    name: "Sunset Suite",
    subtitle: "Room 4",
    description: "",
    type: "two-bedroom",
    guests: 4,
    beds: 2,
    baths: 2,
    sizeSqM: 90,
    pricePerNight: catalogFromRate("two-bedroom"),
    // Reuse A&B gallery until dedicated Apt 4 photos are provided
    images: galleryFor("a and b").length > 0 ? galleryFor("a and b") : galleryFor("apartment number 1"),
    amenities: [...AMENITIES_2BR],
    unitsExclusive: true,
    units: [
      {
        id: "one-bedroom",
        name: "One-bedroom",
        description: "",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        pricePerNight: catalogFromRate("one-bedroom"),
        isActive: true,
      },
      {
        id: "two-bedroom",
        name: "Two-bedroom",
        description: "",
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        pricePerNight: catalogFromRate("two-bedroom"),
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

function mapApiApartment(record: any): Apartment {
  const fallback = getApartment(record.slug);
  const photos: string[] = Array.isArray(record.photos)
    ? record.photos.filter(
        (p: unknown) =>
          typeof p === "string" &&
          p.trim().length > 0 &&
          !p.includes("placeholder") &&
          !p.includes("ChatGPT Image"),
      )
    : [];
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
    name: record.name,
    subtitle: "",
    description: "",
    type: record.type,
    guests: record.maxGuests,
    beds: record.bedrooms,
    baths: record.bathrooms,
    sizeSqM: record.sizeSqM ?? fallback?.sizeSqM ?? 0,
    pricePerNight:
      units.length > 0
        ? Math.min(...units.map((u) => u.pricePerNight))
        : catalogFromRate(roomType),
    images: (seedImages.length > 0 ? seedImages : photos).slice(0, 6),
    amenities: Array.isArray(record.amenities)
      ? record.amenities
      : (fallback?.amenities ?? []),
    unitsExclusive: Boolean(record.unitsExclusive) || fallback?.unitsExclusive === true,
    units: units.length > 0 ? units : (fallback?.units ?? []),
  };
}
