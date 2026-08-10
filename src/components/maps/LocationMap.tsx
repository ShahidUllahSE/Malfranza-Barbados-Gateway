import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  BRAND_MAP_STYLE,
  BRAND_GREEN,
  hasGoogleMapsBrowserKey,
  onGoogleMapsAuthFailure,
} from "@/lib/googleMaps";
import type { GoogleMapInstance, GoogleMarkerInstance } from "@/lib/googleMaps";

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  onReady?: (map: GoogleMapInstance) => void;
};

/** Interactive Google Map with a brand-green pin at `center`. */
export function LocationMap({ center, zoom = 15, className, onReady }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(
    hasGoogleMapsBrowserKey() ? null : "Maps key missing in .env",
  );

  useEffect(() => onGoogleMapsAuthFailure((msg) => setError(msg)), []);

  useEffect(() => {
    let cancelled = false;
    let map: GoogleMapInstance | null = null;
    let marker: GoogleMarkerInstance | null = null;
    setError(hasGoogleMapsBrowserKey() ? null : "Maps key missing in .env");

    loadGoogleMaps()
      .then(async (googleMaps) => {
        if (cancelled || !ref.current) return;
        await googleMaps.maps.importLibrary("maps").catch(() => undefined);
        map = new googleMaps.maps.Map(ref.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
          styles: BRAND_MAP_STYLE,
          backgroundColor: "#F5F1E8",
        });
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
            <defs>
              <filter id="s" x="-20%" y="-10%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
              </filter>
            </defs>
            <path filter="url(#s)" d="M22 2c-10 0-18 8-18 18 0 13 18 34 18 34s18-21 18-34c0-10-8-18-18-18z" fill="${BRAND_GREEN}"/>
            <circle cx="22" cy="20" r="7" fill="#FFFFFF"/>
            <circle cx="22" cy="20" r="3.5" fill="${BRAND_GREEN}"/>
          </svg>`;
        marker = new googleMaps.maps.Marker({
          position: center,
          map,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
            scaledSize: new googleMaps.maps.Size(44, 56),
            anchor: new googleMaps.maps.Point(22, 54),
          },
        });
        onReady?.(map);
      })
      .catch((e) => {
        console.error("Map load error", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load Google Map");
        }
      });

    return () => {
      cancelled = true;
      if (marker) marker.setMap(null);
      map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom]);

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <div ref={ref} className="h-full min-h-[12rem] w-full" aria-label="Map" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-cream/95 p-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}
    </div>
  );
}
