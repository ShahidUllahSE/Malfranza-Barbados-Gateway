import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Home, CalendarRange, RefreshCw } from "lucide-react";
import {
  fetchBeds24Bookings,
  fetchBeds24Properties,
  fetchBeds24Status,
} from "@/lib/beds24";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmptyState,
  Shimmer,
  StatusPill,
  RefBadge,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/channels/booking")({
  component: BookingComChannelPage,
});

type Tab = "properties" | "bookings";

/** Live Beds24 property + booking feed — presented as the Booking.com channel for the client demo. */
function BookingComChannelPage() {
  const [tab, setTab] = useState<Tab>("properties");

  const statusQ = useQuery({
    queryKey: ["admin", "beds24", "status"],
    queryFn: fetchBeds24Status,
  });

  const propertiesQ = useQuery({
    queryKey: ["admin", "beds24", "properties"],
    queryFn: fetchBeds24Properties,
    enabled: tab === "properties" && statusQ.data?.configured !== false,
    retry: 1,
  });

  const bookingsQ = useQuery({
    queryKey: ["admin", "beds24", "bookings"],
    queryFn: fetchBeds24Bookings,
    enabled: tab === "bookings" && statusQ.data?.configured !== false,
    retry: 1,
  });

  const activeQ = tab === "properties" ? propertiesQ : bookingsQ;
  const bedsData = extractDataArray(activeQ.data);
  const configured = statusQ.data?.configured ?? false;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Booking.com"
        description="Live property and booking data from Beds24 for this channel. More channels can be added the same way."
        meta={
          <button
            type="button"
            onClick={() => {
              statusQ.refetch();
              activeQ.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm hover:bg-brand-cream"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <div className="rounded-2xl border border-[#003580]/20 bg-[#003580]/[0.04] px-4 py-3 sm:px-5">
        <p className="text-sm text-brand-charcoal/85">
          <span className="font-semibold text-[#003580]">Booking.com channel</span>
          <span className="text-muted-foreground">
            {" "}
            — real data from your Beds24 link. Further OTAs (Airbnb, Expedia, …) will appear under
            Channels with the same layout once connected.
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {statusQ.isLoading ? (
            <Shimmer className="h-6 w-36 rounded-full" />
          ) : (
            <>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  configured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {configured ? "Beds24 connected" : "Beds24 not configured"}
              </span>
              {statusQ.data?.hasRefreshToken && (
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-charcoal ring-1 ring-slate-200">
                  Refresh token active
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-white p-1.5 shadow-card">
        {(
          [
            { id: "properties" as const, label: "Properties", icon: Home },
            { id: "bookings" as const, label: "Bookings", icon: CalendarRange },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-w-[9rem] flex-1 rounded-xl px-3 py-2.5 text-left transition ${
                active
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-brand-charcoal hover:bg-brand-cream/70"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {!configured && !statusQ.isLoading ? (
        <AdminPanel title="Setup required" description="Add Beds24 credentials to the backend">
          <p className="text-sm text-brand-charcoal/80">
            In{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              Backend/.env
            </code>{" "}
            set{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">BEDS24_REFRESH_TOKEN</code>
            , then restart the backend.
          </p>
        </AdminPanel>
      ) : (
        <AdminPanel
          title={tab === "properties" ? "Properties" : "Bookings"}
          description={
            tab === "properties"
              ? "Properties from Beds24 for this channel"
              : "Reservations from Beds24 for this channel"
          }
        >
          {activeQ.isLoading || statusQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Shimmer key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : activeQ.isError ? (
            <AdminEmptyState
              message={
                activeQ.error instanceof Error
                  ? activeQ.error.message
                  : "Failed to load from Beds24"
              }
            />
          ) : bedsData.length === 0 ? (
            <AdminEmptyState
              message={
                tab === "properties"
                  ? "No properties yet — add one in Beds24 with real photos"
                  : "No bookings yet for this channel"
              }
            />
          ) : tab === "properties" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {bedsData.map((item) => {
                const p = item as Beds24PropertyLike;
                return (
                  <article
                    key={String(p.id)}
                    className="rounded-xl border border-border/70 bg-brand-cream/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-charcoal">
                          {p.name ?? "Property"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[p.city, p.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                      <RefBadge>{String(p.id)}</RefBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {p.propertyType && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium ring-1 ring-slate-200">
                          {p.propertyType}
                        </span>
                      )}
                      {p.currency && (
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium ring-1 ring-slate-200">
                          {p.currency}
                        </span>
                      )}
                      <span className="rounded-full bg-white px-2.5 py-1 font-medium ring-1 ring-slate-200">
                        {(p.roomTypes?.length ?? 0)} room type
                        {(p.roomTypes?.length ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                    {p.roomTypes && p.roomTypes.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                        {p.roomTypes.map((room) => (
                          <li
                            key={String(room.id)}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate text-brand-charcoal">{room.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              id {room.id}
                              {room.maxPeople != null ? ` · max ${room.maxPeople}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {bedsData.map((item, index) => {
                const b = item as Beds24BookingLike;
                return (
                  <article
                    key={String(b.id ?? b.bookId ?? index)}
                    className="rounded-xl border border-border/70 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-brand-charcoal">
                          {[b.firstName, b.lastName].filter(Boolean).join(" ") ||
                            b.guestName ||
                            "Guest"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.arrival || b.firstNight || "—"} →{" "}
                          {b.departure || b.lastNight || "—"}
                        </p>
                      </div>
                      {b.status && <StatusPill status={String(b.status)} />}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Property {b.propertyId ?? "—"}
                      {b.roomId ? ` · Room ${b.roomId}` : ""}
                      {b.apiSource ? ` · ${b.apiSource}` : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </AdminPanel>
      )}
    </div>
  );
}

type Beds24PropertyLike = {
  id?: number | string;
  name?: string;
  city?: string;
  country?: string;
  propertyType?: string;
  currency?: string;
  roomTypes?: Array<{ id?: number | string; name?: string; maxPeople?: number }>;
};

type Beds24BookingLike = {
  id?: number | string;
  bookId?: number | string;
  firstName?: string;
  lastName?: string;
  guestName?: string;
  arrival?: string;
  departure?: string;
  firstNight?: string;
  lastNight?: string;
  status?: string;
  propertyId?: number | string;
  roomId?: number | string;
  apiSource?: string;
};

function extractDataArray(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}
