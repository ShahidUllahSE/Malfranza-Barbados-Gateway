import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export const STARLINK_AMENITY = "High Speed Starlink Internet";

export function isStarlinkAmenity(label: string): boolean {
  const n = label.toLowerCase().replace(/[\s\-–—_/]/g, "");
  return n.includes("starlink") || n === "highspeedstarlinkinternet";
}

/** Put Starlink first so it always shows at a glance. */
export function prioritizeStarlinkAmenities(amenities: string[]): string[] {
  const starlink: string[] = [];
  const rest: string[] = [];
  for (const am of amenities) {
    if (isStarlinkAmenity(am)) starlink.push(am);
    else rest.push(am);
  }
  if (starlink.length === 0) return [STARLINK_AMENITY, ...rest];
  return [...starlink, ...rest];
}

/**
 * Compact badge — white pill, Wi‑Fi icon, “High Speed Starlink Internet”.
 */
export function StarlinkBadge({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white text-left text-brand-charcoal shadow-sm",
        compact ? "gap-1.5 px-2.5 py-1.5" : "px-3 py-2",
        className,
      )}
    >
      <Wifi
        className={cn("shrink-0 text-brand-green", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      <span
        className={cn(
          "font-medium leading-tight text-brand-charcoal",
          compact ? "text-[11px]" : "text-xs sm:text-sm",
        )}
      >
        High Speed Starlink
        <br />
        Internet
      </span>
    </span>
  );
}
