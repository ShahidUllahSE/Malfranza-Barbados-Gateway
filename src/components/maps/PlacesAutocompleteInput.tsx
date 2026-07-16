import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * Places API (New) autocomplete input, restricted to Barbados.
 * Uses AutocompleteSuggestion.fetchAutocompleteSuggestions with a custom dropdown
 * so the field's visual style matches the rest of the form.
 */
export function PlacesAutocompleteInput({
  value, onChange, placeholder, className, ariaLabel,
}: Props) {
  const [suggestions, setSuggestions] = useState<Array<{ id: string; text: string; place: any }>>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const sessionRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(async (g) => {
      if (cancelled) return;
      const places = await g.maps.importLibrary("places");
      placesLibRef.current = places;
      sessionRef.current = new (places as any).AutocompleteSessionToken();
    }).catch((e) => console.error("Places load error", e));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const query = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const places = placesLibRef.current;
      if (!places || !input.trim()) { setSuggestions([]); return; }
      try {
        const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["bb"],
        });
        const mapped = (results || [])
          .filter((r: any) => r.placePrediction)
          .slice(0, 6)
          .map((r: any) => ({
            id: r.placePrediction.placeId,
            text: r.placePrediction.text?.toString?.() ?? "",
            place: r.placePrediction,
          }));
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setHighlight(0);
      } catch (err) {
        console.error("Autocomplete error", err);
      }
    }, 180);
  };

  const select = async (s: { text: string; place: any }) => {
    onChange(s.text);
    setOpen(false);
    // Reset session token after selection per Places API guidance.
    const places = placesLibRef.current;
    if (places) sessionRef.current = new places.AutocompleteSessionToken();
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); query(e.target.value); }}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && suggestions[highlight]) { e.preventDefault(); select(suggestions[highlight]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-white shadow-card-hover">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(s); }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2 text-sm ${i === highlight ? "bg-brand-cream" : "bg-white"} hover:bg-brand-cream`}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
