import { apiRequest } from "@/lib/api";

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

/** Real property photos from src/assets/newimage */
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

const AMENITIES_STANDARD = [
  "Wi-Fi",
  "Air Conditioning",
  "Kitchen",
  "Smart TV",
  "Parking",
  "Workspace",
] as const;

/**
 * Seed / fallback listings aligned with the property photo sets.
 * Live data still comes from the API when available; empty/placeholder photos fall back here.
 */
export const APARTMENTS: Apartment[] = [
  {
    id: "apartment-1",
    mongoId: "",
    name: "Malfranza Apartment Number 1",
    subtitle: "Garden courtyard stay",
    description:
      "Comfortable self-catering apartment in our lime-green courtyard building in Barbados. Private patio access, tropical landscaping, and on-site parking — ideal for couples or a short city base.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 55,
    pricePerNight: 110,
    images: galleryFor("apartment number 1"),
    amenities: [...AMENITIES_STANDARD],
    units: [],
  },
  {
    id: "apartment-2",
    mongoId: "",
    name: "Malfranza Apartment Number 2",
    subtitle: "Bright bedroom suite",
    description:
      "Light-filled apartment with a restful bedroom, air conditioning, and Malfranza’s signature tropical finishes. A quiet, well-kept stay close to everything Oistins has to offer.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 54,
    pricePerNight: 110,
    images: galleryFor("apartment number 2"),
    amenities: [...AMENITIES_STANDARD],
    units: [],
  },
  {
    id: "apartment-3",
    mongoId: "",
    name: "Malfranza Apartment Number 3",
    subtitle: "Tropical double room",
    description:
      "Cheerful double bedroom suite with split air conditioning, tropical décor, and tiled floors for easy beach-day living. Perfect for a relaxed Barbados getaway.",
    type: "one-bedroom",
    guests: 2,
    beds: 1,
    baths: 1,
    sizeSqM: 52,
    pricePerNight: 105,
    images: galleryFor("apartment number 3"),
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV", "Parking"],
    units: [],
  },
  {
    id: "apartment-a-and-b",
    mongoId: "",
    name: "Malfranza Apartments A & B",
    subtitle: "Two-unit residence",
    description:
      "A flexible Malfranza property with two independently bookable units — Unit A and Unit B. Book one for a couple’s stay, or both when travelling as a family or small group.",
    type: "two-bedroom",
    guests: 4,
    beds: 2,
    baths: 2,
    sizeSqM: 90,
    pricePerNight: 110,
    images: galleryFor("a and b"),
    amenities: [...AMENITIES_STANDARD],
    units: [
      {
        id: "unit-a",
        name: "Unit A",
        description: "Self-contained unit A with private facilities.",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        pricePerNight: 110,
        isActive: true,
      },
      {
        id: "unit-b",
        name: "Unit B",
        description: "Self-contained unit B with private facilities.",
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        pricePerNight: 110,
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
    // Prefer API list when non-empty; otherwise local seed with real photos.
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
        .map((unit: any) => ({
          id: String(unit._id),
          name: unit.name,
          description: unit.description ?? "",
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          maxGuests: unit.maxGuests,
          pricePerNight: unit.pricePerNight,
          isActive: unit.isActive !== false,
        }))
    : [];
  const unitPrices = units.map((unit) => unit.pricePerNight);
  const seedImages = fallback?.images ?? [];
  return {
    id: record.slug,
    mongoId: String(record._id ?? ""),
    name: record.name,
    subtitle: record.subtitle ?? "",
    description: record.description ?? "",
    type: record.type,
    guests: record.maxGuests,
    beds: record.bedrooms,
    baths: record.bathrooms,
    sizeSqM: record.sizeSqM ?? fallback?.sizeSqM ?? 0,
    pricePerNight: unitPrices.length > 0 ? Math.min(...unitPrices) : record.pricePerNight,
    // Prefer local real photos when present; otherwise API (non-old) photos.
    images: (seedImages.length > 0 ? seedImages : photos).slice(0, 6),
    amenities: Array.isArray(record.amenities) ? record.amenities : [],
    units: units.length > 0 ? units : (fallback?.units ?? []),
  };
}
