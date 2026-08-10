import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  BRAND_MAP_STYLE,
  BRAND_GREEN,
  hasGoogleMapsBrowserKey,
} from "@/lib/googleMaps";
import type { GoogleCircleInstance, GoogleMapInstance } from "@/lib/googleMaps";

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  radius?: number; // meters
  className?: string;
};

/** Non-interactive-ish mini map showing a general area (circle overlay). */
export function AreaMap({ center, zoom = 14, radius = 500, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(
    hasGoogleMapsBrowserKey() ? null : "Maps key missing in .env",
  );

  useEffect(() => {
    let cancelled = false;
    let map: GoogleMapInstance | null = null;
    let circle: GoogleCircleInstance | null = null;
    setError(hasGoogleMapsBrowserKey() ? null : "Maps key missing in .env");

    loadGoogleMaps()
      .then((googleMaps) => {
        if (cancelled || !ref.current) return;
        map = new googleMaps.maps.Map(ref.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "none",
          keyboardShortcuts: false,
          clickableIcons: false,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          styles: BRAND_MAP_STYLE,
          backgroundColor: "#F5F1E8",
        });
        circle = new googleMaps.maps.Circle({
          map,
          center,
          radius,
          strokeColor: BRAND_GREEN,
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: BRAND_GREEN,
          fillOpacity: 0.15,
        });
      })
      .catch((e) => {
        console.error("AreaMap load error", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load Google Map");
        }
      });

    return () => {
      cancelled = true;
      if (circle) circle.setMap(null);
      map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, radius]);

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <div ref={ref} className="h-full min-h-[10rem] w-full" aria-label="Approximate area map" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-cream/95 p-3 text-center text-xs text-muted-foreground">
          {error}
        </div>
      )}
    </div>
  );
}
