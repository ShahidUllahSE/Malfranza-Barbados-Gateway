// Shared Google Maps JS API loader + brand map style.
// Uses the browser-key from the Lovable Google Maps connector.

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

type MapStyler = {
  color?: string;
  visibility?: string;
  weight?: number;
  saturation?: number;
  lightness?: number;
  gamma?: number;
  hue?: string;
  invert_lightness?: boolean;
};

type MapStyle = {
  elementType?: string;
  featureType?: string;
  stylers: MapStyler[];
};

export type GoogleMapInstance = object;
export type GoogleCircleInstance = { setMap: (map: GoogleMapInstance | null) => void };
export type GoogleMarkerInstance = { setMap: (map: GoogleMapInstance | null) => void };

export type GoogleMapsApi = {
  maps: {
    importLibrary: (name: string) => Promise<unknown>;
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Circle: new (options: Record<string, unknown>) => GoogleCircleInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    Size: new (width: number, height: number) => unknown;
    Point: new (x: number, y: number) => unknown;
  };
};

// Central point used across the site.
export const OISTINS_CENTER = { lat: 13.0656, lng: -59.5442 };

// Light, desaturated brand map style.
export const BRAND_MAP_STYLE: MapStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F5F1E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6B6B60" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#8A8A80" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#E7DFCB" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8A7A55" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#BFE0D4" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A8778" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EDE8D6" }] },
];

let loadPromise: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  const win = window as Window & { google?: GoogleMapsApi };
  if (win.google?.maps?.importLibrary) return Promise.resolve(win.google);
  if (loadPromise) return loadPromise;
  if (!BROWSER_KEY) {
    return Promise.reject(new Error("Google Maps browser key missing"));
  }

  loadPromise = new Promise((resolve, reject) => {
    const cbName = "__gmapsInit_" + Math.random().toString(36).slice(2);
    (window as any)[cbName] = () => {
      delete (window as any)[cbName];
      resolve((window as unknown as { google: GoogleMapsApi }).google);
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      libraries: "places,marker",
      callback: cbName,
      v: "weekly",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export const BRAND_GREEN = "#004D3B";
