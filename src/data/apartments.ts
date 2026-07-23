import stayGarden from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_00 PM.png";
import stay1br from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_34 PM.png";
import stayKitchen from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_20 PM.png";
import stayTropical from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_27 PM.png";
import stay2br from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_43 PM.png";
import stayBathroom from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_13 PM.png";
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

export const APARTMENTS: Apartment[] = [
  {
    id: "garden-view",
    mongoId: "",
    name: "One-Bedroom Apartment",
    subtitle: "Garden View",
    description: "Peaceful ground floor apartment with lush garden views and a private patio.",
    type: "one-bedroom",
    guests: 2, beds: 1, baths: 1, sizeSqM: 56,
    pricePerNight: 110,

    images: [stayGarden, stayKitchen, stayBathroom, stay1br],
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV", "Parking", "Workspace"],
    units: [],
  },
  {
    id: "city-view",
    mongoId: "",
    name: "One-Bedroom Apartment",
    subtitle: "City View",
    description: "Bright and airy apartment with city views and a cozy modern feel.",
    type: "one-bedroom",
    guests: 2, beds: 1, baths: 1, sizeSqM: 54,
    pricePerNight: 110,
    images: [stay1br, stayKitchen, stayBathroom, stay2br],
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV", "Workspace"],
    units: [],
  },
  {
    id: "modern-comfort",
    mongoId: "",
    name: "One-Bedroom Apartment",
    subtitle: "Modern Comfort",
    description: "Stylish apartment with modern finishes and a fully equipped kitchen.",
    type: "one-bedroom",
    guests: 2, beds: 1, baths: 1, sizeSqM: 58,
    pricePerNight: 110,
    images: [stayKitchen, stay1br, stayBathroom, stayTropical],
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV", "Parking"],
    units: [],
  },
  {
    id: "tropical-escape",
    mongoId: "",
    name: "One-Bedroom Apartment",
    subtitle: "Tropical Escape",
    description: "Tranquil retreat with tropical décor and plenty of natural light.",
    type: "one-bedroom",
    guests: 2, beds: 1, baths: 1, sizeSqM: 55,
    pricePerNight: 110,
    images: [stayTropical, stayKitchen, stayBathroom, stayGarden],
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV"],
    units: [],
  },
  {
    id: "family-stay",
    mongoId: "",
    name: "Two-Bedroom Apartment",
    subtitle: "Family Stay",
    description: "Spacious two-bedroom apartment ideal for families or small groups.",
    type: "two-bedroom",
    guests: 4, beds: 2, baths: 1, sizeSqM: 82,
    pricePerNight: 150,
    images: [stay2br, stayKitchen, stayBathroom, stayGarden],
    amenities: ["Wi-Fi", "Air Conditioning", "Kitchen", "Smart TV", "Parking", "Workspace"],
    units: [],
  },
];

export function getApartment(id: string) {
  return APARTMENTS.find((a) => a.id === id);
}

export async function fetchApartments(): Promise<Apartment[]> {
  try {
    const records = await apiRequest<any[]>("/apartments?sort=price-asc");
    return records.map(mapApiApartment);
  } catch {
    return APARTMENTS;
  }
}

export async function fetchApartment(slug: string): Promise<Apartment | undefined> {
  try {
    const record = await apiRequest<any>(`/apartments/${encodeURIComponent(slug)}`);
    return mapApiApartment(record);
  } catch {
    return undefined;
  }
}

function mapApiApartment(record: any): Apartment {
  const fallback = getApartment(record.slug);
  const photos: string[] = Array.isArray(record.photos)
    ? record.photos.filter(
        (p: unknown) =>
          typeof p === "string" &&
          p.trim().length > 0 &&
          !p.includes("placeholder"),
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
    images: photos.length > 0 ? photos : (fallback?.images ?? []),
    amenities: Array.isArray(record.amenities) ? record.amenities : [],
    units,
  };
}
