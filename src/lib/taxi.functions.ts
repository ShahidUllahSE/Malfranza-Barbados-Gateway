import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  pickup: z.string().trim().min(2).max(300),
  dropoff: z.string().trim().min(2).max(300),
  passengers: z.number().int().min(1).max(14).default(1),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Simple, transparent Barbados taxi pricing:
// - Base fare: $15 USD
// - Per km: $2.50 USD
// - Extra passenger (>4): +$5 each
// - Minimum: $20
function computeFare(distanceKm: number, passengers: number): number {
  const base = 15;
  const perKm = 2.5;
  const extraPax = Math.max(0, passengers - 4) * 5;
  const raw = base + distanceKm * perKm + extraPax;
  return Math.max(20, Math.round(raw));
}

export const estimateTaxiFare = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Maps service is not configured.");
    }

    const body = {
      origin: { address: `${data.pickup}, Barbados` },
      destination: { address: `${data.dropoff}, Barbados` },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
    };

    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Routes API error", res.status, text);
      throw new Error("Couldn't calculate route. Check the pickup and drop-off.");
    }

    const json = (await res.json()) as { routes?: Array<{ distanceMeters?: number; duration?: string }> };
    const route = json.routes?.[0];
    if (!route?.distanceMeters) {
      throw new Error("No route found between those locations.");
    }
    const distanceKm = route.distanceMeters / 1000;
    const fare = computeFare(distanceKm, data.passengers);
    const durationSeconds = route.duration ? Number(route.duration.replace("s", "")) : null;

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: durationSeconds ? Math.round(durationSeconds / 60) : null,
      fare,
    };
  });
