// Shared Google Maps JS API loader + brand map style.
// Localhost uses VITE_GOOGLE_MAPS_API_KEY first (Lovable browser keys often block localhost referrers).

function readEnvKey(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = (import.meta.env as Record<string, string | undefined>)[name];
    if (!raw) continue;
    const key = String(raw).trim().replace(/^["']|["']$/g, "");
    if (key) return key;
  }
  return undefined;
}

/**
 * Prefer the project Maps key (VITE_GOOGLE_MAPS_API_KEY) in both dev and production.
 * Lovable connector key is only a fallback — it often blocks custom domains.
 */
function pickBrowserKey(): { key: string; source: string } | null {
  const ordered = [
    "VITE_GOOGLE_MAPS_API_KEY",
    "VITE_MAP_KEYS",
    "VITE_GOOGLE_MAPS_BROWSER_KEY",
    "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY",
  ] as const;

  for (const name of ordered) {
    const key = readEnvKey(name);
    if (key) return { key, source: name };
  }
  return null;
}

const PICKED = pickBrowserKey();
const BROWSER_KEY = PICKED?.key;
const KEY_SOURCE = PICKED?.source ?? null;

const TRACKING_ID = readEnvKey(
  "VITE_GOOGLE_MAPS_TRACKING_ID",
  "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID",
);

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
    places?: {
      AutocompleteService: new () => {
        getPlacePredictions: (
          request: Record<string, unknown>,
          callback: (predictions: unknown[] | null, status: string) => void,
        ) => void;
      };
      AutocompleteSessionToken: new () => unknown;
      PlacesServiceStatus: { OK: string; ZERO_RESULTS: string };
    };
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

export function hasGoogleMapsBrowserKey(): boolean {
  return Boolean(BROWSER_KEY);
}

/** Expose key presence for debugging (never the raw key). */
export function googleMapsConfigStatus(): {
  hasKey: boolean;
  keySource: string | null;
  isDev: boolean;
} {
  return {
    hasKey: Boolean(BROWSER_KEY),
    keySource: KEY_SOURCE,
    isDev: Boolean(import.meta.env.DEV),
  };
}

/**
 * Google calls this when the Maps JS API rejects the key (e.g. RefererNotAllowedMapError).
 * Components can subscribe so the UI shows a useful message instead of a grey box.
 */
type AuthFailureListener = (message: string) => void;
const authFailureListeners = new Set<AuthFailureListener>();
let lastAuthFailure: string | null = null;

export function onGoogleMapsAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  if (lastAuthFailure) listener(lastAuthFailure);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function notifyAuthFailure(message: string) {
  lastAuthFailure = message;
  authFailureListeners.forEach((fn) => {
    try {
      fn(message);
    } catch {
      /* ignore */
    }
  });
}

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  const win = window as Window & { google?: GoogleMapsApi };
  if (win.google?.maps?.importLibrary) return Promise.resolve(win.google);
  if (loadPromise) return loadPromise;
  if (!BROWSER_KEY) {
    return Promise.reject(
      new Error(
        "Google Maps browser key missing. Set VITE_GOOGLE_MAPS_API_KEY in frontend .env and restart Vite.",
      ),
    );
  }

  loadPromise = new Promise((resolve, reject) => {
    const keyFp = BROWSER_KEY.slice(-6);
    const existing = document.querySelector<HTMLScriptElement>("script[data-mfz-gmaps]");
    // If a previous key was injected (HMR / wrong prefer order), strip it so we can reload.
    if (existing && existing.dataset.mfzKeyFp && existing.dataset.mfzKeyFp !== keyFp) {
      existing.remove();
      const w = window as unknown as { google?: GoogleMapsApi };
      try {
        delete (w as { google?: unknown }).google;
      } catch {
        /* ignore */
      }
    } else if (existing) {
      const wait = () => {
        const g = (window as unknown as { google?: GoogleMapsApi }).google;
        if (g?.maps?.importLibrary) resolve(g);
        else setTimeout(wait, 50);
      };
      wait();
      return;
    }

    // Global hook used by the Maps JS API when the key is rejected.
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      const msg =
        "Google Maps blocked this site URL (RefererNotAllowedMapError). In Google Cloud Console → APIs & Services → Credentials → your browser key → Application restrictions → HTTP referrers, add: http://localhost:8080/*, https://malfranzarentals.com/*, and https://www.malfranzarentals.com/*. Enable Maps JavaScript API and Places API (New).";
      console.error("[maps]", msg);
      notifyAuthFailure(msg);
    };

    const cbName = `__gmapsInit_${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, unknown>)[cbName] = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      const g = (window as unknown as { google: GoogleMapsApi }).google;
      if (!g?.maps) {
        reject(new Error("Google Maps loaded without maps API"));
        return;
      }
      if (import.meta.env.DEV) {
        console.info("[maps] loaded", googleMapsConfigStatus());
      }
      resolve(g);
    };

    const s = document.createElement("script");
    s.dataset.mfzGmaps = "1";
    s.dataset.mfzKeyFp = keyFp;
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      libraries: "places",
      callback: cbName,
      v: "weekly",
      loading: "async",
    });
    // Only attach Lovable tracking on the Lovable connector key.
    if (
      TRACKING_ID &&
      KEY_SOURCE === "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"
    ) {
      params.set("channel", TRACKING_ID);
    }
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script — check API key / network"));
    };
    document.head.appendChild(s);
  });

  return loadPromise.catch((err) => {
    loadPromise = null;
    throw err;
  });
}

export const BRAND_GREEN = "#004D3B";
