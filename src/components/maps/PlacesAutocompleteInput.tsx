import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BRAND_GREEN,
  BRAND_MAP_STYLE,
  googleMapsConfigStatus,
  hasGoogleMapsBrowserKey,
  loadGoogleMaps,
  OISTINS_CENTER,
  onGoogleMapsAuthFailure,
} from "@/lib/googleMaps";

export type LatLng = { lat: number; lng: number };

type PlaceValue = {
  address: string;
  location?: LatLng | null;
};

type AutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called when a place is chosen from suggestions (includes lat/lng when available). */
  onPlace?: (place: PlaceValue) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  regionCode?: string;
  trailing?: ReactNode;
};

export type MapPickRole = "pickup" | "dropoff";

type MapsWindow = {
  google?: {
      maps: {
      importLibrary: (name: string) => Promise<any>;
      places?: Record<string, any>;
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => {
        fitBounds: (b: any, padding?: number) => void;
        setCenter: (c: LatLng) => void;
        setZoom: (z: number) => void;
        setOptions?: (opts: Record<string, unknown>) => void;
      };
      Marker: new (opts: Record<string, unknown>) => {
        setMap: (m: unknown) => void;
        setPosition: (p: LatLng) => void;
        setDraggable?: (d: boolean) => void;
        getPosition?: () => { lat: () => number; lng: () => number } | null;
        addListener?: (name: string, fn: (...args: any[]) => void) => { remove: () => void };
      };
      LatLngBounds: new () => { extend: (p: LatLng) => void };
      Geocoder: new () => {
        geocode: (
          req: { address?: string; location?: LatLng },
          cb: (results: any[] | null, status: string) => void,
        ) => void;
      };
      Size: new (w: number, h: number) => unknown;
      Point: new (x: number, y: number) => unknown;
      event?: {
        trigger: (instance: unknown, name: string) => void;
        addListener: (
          instance: unknown,
          name: string,
          fn: (...args: any[]) => void,
        ) => { remove: () => void };
      };
    };
  };
};

type SuggestionItem = {
  id: string;
  text: string;
  /** Places API (New) prediction handle, if available. */
  prediction?: any;
};

/**
 * Places suggestions (Barbados). Dropdown is portaled to document.body so parent
 * overflow:hidden cards never clip it.
 * Uses Places API (New) AutocompleteSuggestion when available; falls back to classic service.
 */
export function PlacesAutocompleteInput({
  value,
  onChange,
  onPlace,
  onFocus,
  onBlur,
  placeholder,
  className,
  ariaLabel,
  regionCode,
  trailing,
}: AutocompleteProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [failMsg, setFailMsg] = useState<string | null>(null);

  const placesLibRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const detailsServiceRef = useRef<any>(null);
  const placesStatusOk = useRef("OK");
  const sessionRef = useRef<unknown>(null);
  const modeRef = useRef<"new" | "classic" | null>(null);
  const debounceRef = useRef<number | null>(null);
  const attrNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasGoogleMapsBrowserKey()) {
      setFailMsg("Add VITE_GOOGLE_MAPS_API_KEY to .env and restart Vite.");
      return;
    }

    const unsub = onGoogleMapsAuthFailure((msg) => setFailMsg(msg));

    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled) return;
        const placesLib = (await g.maps.importLibrary("places")) as any;
        placesLibRef.current = placesLib;

        // New Places API (required for keys created after March 2025)
        if (typeof placesLib.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function") {
          modeRef.current = "new";
          setReady(true);
          setFailMsg(null);
          if (import.meta.env.DEV) {
            console.info("[maps] Places ready (new AutocompleteSuggestion)", googleMapsConfigStatus());
          }
          return;
        }

        // Classic fallback
        const win = window as unknown as MapsWindow;
        const places = win.google?.maps?.places ?? placesLib;
        if (!places?.AutocompleteService) {
          throw new Error(
            "Enable Places API (New) on your Google Cloud browser key — Places autocomplete is not available.",
          );
        }
        serviceRef.current = new places.AutocompleteService();
        if (!attrNodeRef.current) {
          attrNodeRef.current = document.createElement("div");
        }
        detailsServiceRef.current = new places.PlacesService(attrNodeRef.current);
        placesStatusOk.current = places.PlacesServiceStatus?.OK ?? "OK";
        if (places.AutocompleteSessionToken) {
          sessionRef.current = new places.AutocompleteSessionToken();
        }
        modeRef.current = "classic";
        setReady(true);
        setFailMsg(null);
        if (import.meta.env.DEV) {
          console.info("[maps] Places ready (classic AutocompleteService)", googleMapsConfigStatus());
        }
      })
      .catch((e: unknown) => {
        console.error("[maps] Places load error", e);
        if (!cancelled) {
          setFailMsg(e instanceof Error ? e.message : "Google Places failed to load");
        }
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const updateMenuPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + window.scrollY + 4,
      left: r.left + window.scrollX,
      width: r.width,
    });
  };

  useEffect(() => {
    const onScroll = () => {
      if (open) updateMenuPos();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      const menu = document.getElementById(`places-menu-${inputId}`);
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [inputId]);

  const fetchPredictions = (input: string) => {
    if (!ready) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        const q = input.trim();
        if (q.length < 2) {
          setSuggestions([]);
          setOpen(false);
          return;
        }

        try {
          if (modeRef.current === "new" && placesLibRef.current?.AutocompleteSuggestion) {
            const AutocompleteSuggestion = placesLibRef.current.AutocompleteSuggestion;
            const request: Record<string, unknown> = { input: q };
            if (regionCode) request.includedRegionCodes = [regionCode.toLowerCase()];
            const { suggestions: raw } =
              await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            const items: SuggestionItem[] = (raw ?? [])
              .slice(0, 7)
              .map((s: any, i: number) => {
                const pred = s.placePrediction;
                const text =
                  pred?.text?.toString?.() ||
                  pred?.mainText?.toString?.() ||
                  String(pred?.text?.text ?? pred ?? "");
                const id = String(pred?.placeId ?? pred?.toPlace?.()?.id ?? `n-${i}-${text}`);
                return { id, text, prediction: pred };
              })
              .filter((s: SuggestionItem) => s.text);

            if (!items.length) {
              setSuggestions([]);
              setOpen(false);
              return;
            }
            setSuggestions(items);
            updateMenuPos();
            setOpen(true);
            setHighlight(0);
            return;
          }

          if (!serviceRef.current) return;
          const req: Record<string, unknown> = { input: q };
          if (regionCode) req.componentRestrictions = { country: regionCode.toLowerCase() };
          if (sessionRef.current) req.sessionToken = sessionRef.current;

          serviceRef.current.getPlacePredictions(
            req,
            (preds: any[] | null, status: string) => {
              if (status !== placesStatusOk.current || !preds?.length) {
                setSuggestions([]);
                setOpen(false);
                if (status && status !== "ZERO_RESULTS" && status !== placesStatusOk.current) {
                  console.warn("[maps] prediction status", status);
                  if (String(status).includes("REQUEST_DENIED") || status === "OVER_QUERY_LIMIT") {
                    setFailMsg(
                      "Places request denied — enable Places API (New) for this key, and allow this site as HTTP referrer.",
                    );
                  }
                }
                return;
              }
              setSuggestions(
                preds.slice(0, 7).map((p) => ({
                  id: String(p.place_id),
                  text: String(p.description ?? ""),
                })),
              );
              updateMenuPos();
              setOpen(true);
              setHighlight(0);
            },
          );
        } catch (e) {
          console.warn("[maps] fetchPredictions", e);
        }
      })();
    }, 160);
  };

  const pick = (item: SuggestionItem) => {
    onChange(item.text);
    setOpen(false);
    setSuggestions([]);

    void (async () => {
      try {
        if (modeRef.current === "new" && item.prediction) {
          const place = item.prediction.toPlace?.() ?? item.prediction;
          if (place?.fetchFields) {
            await place.fetchFields({
              fields: ["formattedAddress", "location", "displayName"],
            });
            const loc = place.location;
            const lat =
              typeof loc?.lat === "function" ? loc.lat() : typeof loc?.lat === "number" ? loc.lat : null;
            const lng =
              typeof loc?.lng === "function" ? loc.lng() : typeof loc?.lng === "number" ? loc.lng : null;
            const address =
              place.formattedAddress ||
              place.displayName ||
              item.text;
            onPlace?.({
              address: String(address),
              location: lat != null && lng != null ? { lat, lng } : null,
            });
            return;
          }
        }

        if (detailsServiceRef.current && onPlace) {
          detailsServiceRef.current.getDetails(
            {
              placeId: item.id,
              fields: ["formatted_address", "geometry", "name"],
              sessionToken: sessionRef.current,
            },
            (result: any | null, status: string) => {
              const Token = (window as unknown as MapsWindow).google?.maps?.places
                ?.AutocompleteSessionToken;
              if (Token) sessionRef.current = new Token();
              if (status !== placesStatusOk.current || !result) {
                onPlace({ address: item.text, location: null });
                return;
              }
              const loc = result.geometry?.location;
              onPlace({
                address: String(result.formatted_address || result.name || item.text),
                location: loc ? { lat: loc.lat(), lng: loc.lng() } : null,
              });
            },
          );
          return;
        }

        onPlace?.({ address: item.text, location: null });
      } catch (e) {
        console.warn("[maps] place details", e);
        onPlace?.({ address: item.text, location: null });
      }
    })();
  };

  const menu =
    open && menuPos && suggestions.length > 0
      ? createPortal(
          <ul
            id={`places-menu-${inputId}`}
            role="listbox"
            style={{
              position: "absolute",
              top: menuPos.top,
              left: menuPos.left,
              width: Math.max(menuPos.width, 220),
              zIndex: 99999,
            }}
            className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-brand-charcoal shadow-2xl"
          >
            {suggestions.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={`w-full px-3 py-2.5 text-left text-sm ${
                    i === highlight ? "bg-brand-cream" : "bg-white"
                  } hover:bg-brand-cream`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            fetchPredictions(e.target.value);
          }}
          onFocus={() => {
            onFocus?.();
            updateMenuPos();
            if (suggestions.length) setOpen(true);
          }}
          onBlur={() => onBlur?.()}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && suggestions[highlight]) {
              e.preventDefault();
              pick(suggestions[highlight]!);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={
            !ready && !failMsg ? "Loading places…" : placeholder || "Search Barbados address"
          }
          aria-label={ariaLabel}
          className={`min-w-0 flex-1 ${className ?? ""}`}
          autoComplete="off"
        />
        {trailing}
      </div>
      {failMsg && (
        <p className="mt-1 text-[10px] leading-snug text-amber-200/95" role="status">
          {failMsg}
        </p>
      )}
      {menu}
    </div>
  );
}

type RouteMapProps = {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  /** Which field will receive the next map click (focus pickup / drop-off inputs). */
  activeField?: MapPickRole | null;
  /** Called after reverse-geocode when user clicks map or drags a pin. */
  onMapPick?: (role: MapPickRole, place: PlaceValue) => void;
  className?: string;
};

/** Visible route map: click to set active field, drag pins to adjust. */
export function TaxiRouteMap({
  pickup,
  dropoff,
  activeField = "pickup",
  onMapPick,
  className,
}: RouteMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const clickListenerRef = useRef<{ remove: () => void } | null>(null);
  const pickupDragRef = useRef<{ remove: () => void } | null>(null);
  const dropoffDragRef = useRef<{ remove: () => void } | null>(null);
  const skipFitBoundsRef = useRef(false);
  const activeRef = useRef(activeField);
  const onMapPickRef = useRef(onMapPick);
  activeRef.current = activeField;
  onMapPickRef.current = onMapPick;

  const [error, setError] = useState<string | null>(
    hasGoogleMapsBrowserKey() ? null : "Maps key missing — set VITE_GOOGLE_MAPS_API_KEY in .env",
  );
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const unsub = onGoogleMapsAuthFailure((msg) => {
      setError(msg);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePickAt = async (role: MapPickRole, loc: LatLng) => {
    setPicking(true);
    skipFitBoundsRef.current = true;
    try {
      // Optimistic pin update is driven by parent state; reverse-geocode address.
      const address = (await reverseGeocode(loc)) || `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
      onMapPickRef.current?.(role, { address, location: loc });
    } finally {
      setPicking(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled || !hostRef.current) return;
        await g.maps.importLibrary("maps").catch(() => undefined);
        googleRef.current = g;
        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(hostRef.current, {
            center: OISTINS_CENTER,
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            styles: BRAND_MAP_STYLE,
            backgroundColor: "#F5F1E8",
            draggableCursor: "crosshair",
            draggingCursor: "grabbing",
          });
          window.setTimeout(() => {
            try {
              const win = window as unknown as MapsWindow;
              win.google?.maps?.event?.trigger(mapRef.current, "resize");
              syncMarkers(g, true);
            } catch {
              /* ignore */
            }
          }, 100);
        }

        // Click map → fill active pickup/drop-off field
        const mapsEvent = (window as unknown as MapsWindow).google?.maps?.event;
        clickListenerRef.current?.remove?.();
        if (mapsEvent && mapRef.current) {
          clickListenerRef.current = mapsEvent.addListener(
            mapRef.current,
            "click",
            (e: { latLng?: { lat: () => number; lng: () => number } }) => {
              const ll = e.latLng;
              if (!ll) return;
              const role = activeRef.current || "pickup";
              void handlePickAt(role, { lat: ll.lat(), lng: ll.lng() });
            },
          );
        }

        setError(null);
        setLoading(false);
        syncMarkers(g, true);
      })
      .catch((e: unknown) => {
        console.error("[maps] route map", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Map failed to load");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clickListenerRef.current?.remove?.();
      pickupDragRef.current?.remove?.();
      dropoffDragRef.current?.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (googleRef.current && mapRef.current) {
      syncMarkers(googleRef.current, !skipFitBoundsRef.current);
      skipFitBoundsRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  useEffect(() => {
    // Cursor hint when actively choosing a field
    try {
      mapRef.current?.setOptions?.({
        draggableCursor: activeField ? "crosshair" : "grab",
      });
    } catch {
      /* ignore */
    }
  }, [activeField]);

  function pinIcon(g: any, color: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 44 56">
      <path d="M22 2c-10 0-18 8-18 18 0 13 18 34 18 34s18-21 18-34c0-10-8-18-18-18z" fill="${color}"/>
      <circle cx="22" cy="20" r="6" fill="#fff"/>
    </svg>`;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new g.maps.Size(36, 48),
      anchor: new g.maps.Point(18, 46),
    };
  }

  function ensureMarker(
    g: any,
    existing: any,
    role: MapPickRole,
    position: LatLng,
    color: string,
    dragListenerRef: { current: { remove: () => void } | null },
  ) {
    const map = mapRef.current;
    if (!existing) {
      const marker = new g.maps.Marker({
        map,
        position,
        title: role === "pickup" ? "Pickup" : "Drop-off",
        icon: pinIcon(g, color),
        draggable: true,
        zIndex: role === "pickup" ? 2 : 1,
      });
      dragListenerRef.current?.remove?.();
      dragListenerRef.current = marker.addListener?.("dragend", () => {
        const p = marker.getPosition?.();
        if (!p) return;
        void handlePickAt(role, { lat: p.lat(), lng: p.lng() });
      }) ?? null;
      return marker;
    }
    existing.setPosition(position);
    existing.setMap(map);
    existing.setDraggable?.(true);
    return existing;
  }

  function syncMarkers(g: any, fitView: boolean) {
    const map = mapRef.current;
    if (!map) return;

    if (pickup) {
      pickupMarkerRef.current = ensureMarker(
        g,
        pickupMarkerRef.current,
        "pickup",
        pickup,
        BRAND_GREEN,
        pickupDragRef,
      );
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setMap(null);
    }

    if (dropoff) {
      dropoffMarkerRef.current = ensureMarker(
        g,
        dropoffMarkerRef.current,
        "dropoff",
        dropoff,
        "#E07A3D",
        dropoffDragRef,
      );
    } else if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setMap(null);
    }

    if (!fitView) return;

    if (pickup && dropoff) {
      const bounds = new g.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(dropoff);
      map.fitBounds(bounds, 48);
    } else if (pickup) {
      map.setCenter(pickup);
      map.setZoom(14);
    } else if (dropoff) {
      map.setCenter(dropoff);
      map.setZoom(14);
    }
  }

  const hint =
    picking
      ? "Finding address…"
      : activeField === "dropoff"
        ? "Click the map to set drop-off (or type in the field)"
        : "Click the map to set pickup (or type in the field)";

  return (
    <div
      className={
        className
          ? `relative overflow-hidden rounded-2xl bg-brand-cream ${className}`
          : "relative overflow-hidden rounded-2xl bg-brand-cream"
      }
    >
      <div
        ref={hostRef}
        className="h-full min-h-[220px] w-full cursor-crosshair bg-brand-cream"
        aria-label="Trip map — click to set location"
      />
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-cream/80 text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-auto bg-brand-cream p-4 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {error}
        </div>
      )}
      {!error && !loading && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[90%] rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-brand-charcoal shadow">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Geocode a free-text address (when user types without picking a suggestion). */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!address.trim()) return null;
  try {
    await loadGoogleMaps();
    const g = (window as unknown as MapsWindow).google;
    if (!g?.maps?.Geocoder) return null;
    return await new Promise((resolve) => {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address: `${address}, Barbados` }, (results, status) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          resolve(null);
          return;
        }
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      });
    });
  } catch {
    return null;
  }
}

/** Reverse-geocode lat/lng → human address for the map click flow. */
export async function reverseGeocode(location: LatLng): Promise<string | null> {
  try {
    await loadGoogleMaps();
    const g = (window as unknown as MapsWindow).google;
    if (!g?.maps?.Geocoder) return null;
    return await new Promise((resolve) => {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status !== "OK" || !results?.[0]?.formatted_address) {
          resolve(null);
          return;
        }
        resolve(String(results[0].formatted_address));
      });
    });
  } catch {
    return null;
  }
}
