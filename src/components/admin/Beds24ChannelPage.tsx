import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Home, CalendarRange, RefreshCw, Search, X, Users, Moon } from "lucide-react";
import {
  fetchBeds24Bookings,
  fetchBeds24Health,
  fetchBeds24Properties,
} from "@/lib/beds24";
import { BEDS24_CHANNELS, type Beds24ChannelId } from "@/lib/beds24-channels";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmptyState,
  Shimmer,
  StatusPill,
  RefBadge,
  FilterChip,
} from "@/components/admin/AdminBits";

type Tab = "properties" | "bookings";

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
  numAdult?: number;
  numChild?: number;
  price?: number | string;
};

function nightsBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function guestLabel(b: Beds24BookingLike): string {
  return [b.firstName, b.lastName].filter(Boolean).join(" ") || b.guestName || "Guest";
}

function extractDataArray(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export function Beds24ChannelPage({ channelId }: { channelId: Beds24ChannelId }) {
  const channel = BEDS24_CHANNELS[channelId];
  const [tab, setTab] = useState<Tab>("properties");

  const healthQ = useQuery({
    queryKey: ["admin", "beds24", "health"],
    queryFn: fetchBeds24Health,
  });

  const configured = healthQ.data?.configured ?? false;
  const apiOk = healthQ.data?.apiOk ?? false;

  const propertiesQ = useQuery({
    queryKey: ["admin", "beds24", "properties"],
    queryFn: fetchBeds24Properties,
    enabled: tab === "properties" && configured,
    retry: 1,
  });

  const bookingsQ = useQuery({
    queryKey: ["admin", "beds24", "bookings", channelId],
    // Always fetched (not just on the Bookings tab) so we know whether this
    // channel is already live and can hide the setup instructions below.
    queryFn: () => fetchBeds24Bookings(channelId),
    enabled: configured,
    retry: 1,
  });

  const activeQ = tab === "properties" ? propertiesQ : bookingsQ;
  const bedsData = extractDataArray(activeQ.data);
  const channelBookings = extractDataArray(bookingsQ.data) as Beds24BookingLike[];
  const propertyCount = healthQ.data?.propertyCount ?? 0;
  const needsProperties = configured && apiOk && propertyCount === 0;
  const channelIsLive = apiOk && extractDataArray(bookingsQ.data).length > 0;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of channelBookings) {
      const s = item.status ? String(item.status).toLowerCase() : undefined;
      if (s) set.add(s);
    }
    return ["all", ...Array.from(set).sort()];
  }, [channelBookings]);

  const filteredBookings = useMemo(() => {
    let items = channelBookings;
    if (statusFilter !== "all") {
      items = items.filter((b) => String(b.status ?? "").toLowerCase() === statusFilter);
    }
    if (fromDate) {
      items = items.filter((b) => (b.arrival ?? b.firstNight ?? "") >= fromDate);
    }
    if (toDate) {
      items = items.filter((b) => (b.departure ?? b.lastNight ?? "") <= toDate);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((b) => {
        const haystack = [
          guestLabel(b),
          b.apiSource,
          String(b.id ?? b.bookId ?? ""),
          String(b.roomId ?? ""),
          String(b.propertyId ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return [...items].sort((a, b) =>
      (a.arrival ?? a.firstNight ?? "").localeCompare(b.arrival ?? b.firstNight ?? ""),
    );
  }, [channelBookings, statusFilter, fromDate, toDate, search]);

  const hasActiveFilters = Boolean(search || fromDate || toDate || statusFilter !== "all");

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={channel.title}
        description={channel.description}
        meta={
          <button
            type="button"
            onClick={() => {
              healthQ.refetch();
              activeQ.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm hover:bg-brand-cream"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <div
        className={`rounded-2xl border px-4 py-3 sm:px-5 ${channel.accentBorder} ${channel.accentBg}`}
      >
        <p className="text-sm text-brand-charcoal/85">
          <span className={`font-semibold ${channel.accentText}`}>{channel.title} channel</span>
          <span className="text-muted-foreground"> — {channel.channelBlurb}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {healthQ.isLoading ? (
            <Shimmer className="h-6 w-36 rounded-full" />
          ) : (
            <>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  configured && apiOk
                    ? "bg-emerald-100 text-emerald-800"
                    : configured
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {!configured
                  ? "Token not set"
                  : apiOk
                    ? "Beds24 connected"
                    : "Token set — API error"}
              </span>
              {healthQ.data?.hasRefreshToken && (
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-charcoal ring-1 ring-slate-200">
                  Refresh token active
                </span>
              )}
              {apiOk && (
                <>
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-charcoal ring-1 ring-slate-200">
                    {propertyCount} propert{propertyCount === 1 ? "y" : "ies"}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-charcoal ring-1 ring-slate-200">
                    {healthQ.data?.bookingCount ?? 0} total booking
                    {(healthQ.data?.bookingCount ?? 0) === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {channel.otaSetup && !channelIsLive ? (
        <AdminPanel title={channel.otaSetup.title} description={channel.otaSetup.note}>
          <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-brand-charcoal/85">
            {channel.otaSetup.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            All OTA logins and Hotel IDs are entered in Beds24 and the Expedia / Booking.com extranet
            only — nothing else is added to website code.
          </p>
        </AdminPanel>
      ) : null}

      {!configured && !healthQ.isLoading ? (
        <Beds24SetupPanel mode="token" />
      ) : configured && !apiOk && !healthQ.isLoading ? (
        <AdminPanel title="API connection failed" description="Check your Beds24 refresh token">
          <p className="text-sm text-brand-charcoal/80">
            {healthQ.data?.error ??
              "The backend could not reach Beds24. Generate a new refresh token from your current Beds24 account and update Backend/.env."}
          </p>
          <div className="mt-4">
            <Beds24SetupPanel mode="token" compact />
          </div>
        </AdminPanel>
      ) : needsProperties ? (
        <>
          <Beds24SetupPanel mode="properties" channelTitle={channel.title} />
          <ChannelTabs tab={tab} setTab={setTab} />
          <AdminPanel title="Properties" description="Waiting for your first property in Beds24">
            <AdminEmptyState message="No properties yet — add them in Beds24, then click Refresh." />
          </AdminPanel>
        </>
      ) : (
        <>
          <ChannelTabs tab={tab} setTab={setTab} />

          {tab === "bookings" && !activeQ.isLoading && !activeQ.isError && channelBookings.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search guest or reference…"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-brand-charcoal"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <label className="relative flex items-center">
                  <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15 lg:w-40"
                  />
                </label>
                <label className="relative flex items-center">
                  <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15 lg:w-40"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((s) => (
                    <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                      {s}
                    </FilterChip>
                  ))}
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setFromDate("");
                      setToDate("");
                    }}
                    className="text-xs font-semibold text-muted-foreground hover:text-brand-green"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          <AdminPanel
            title={tab === "properties" ? "Properties" : "Bookings"}
            description={
              tab === "properties"
                ? "All properties in your Beds24 account (shared across channels)"
                : `${filteredBookings.length} shown · ${channelBookings.length} total reservation${channelBookings.length === 1 ? "" : "s"} from ${channel.title}`
            }
          >
            {activeQ.isLoading || healthQ.isLoading ? (
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
                    ? "No properties returned from Beds24"
                    : `No ${channel.title} bookings yet — they will appear here once reservations come through this channel`
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
                          <p className="font-semibold text-brand-charcoal">{p.name ?? "Property"}</p>
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
            ) : filteredBookings.length === 0 ? (
              <AdminEmptyState message="No bookings match your filters" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBookings.map((b, index) => {
                  const arrival = b.arrival || b.firstNight;
                  const departure = b.departure || b.lastNight;
                  const nights = nightsBetween(arrival, departure);
                  const guests = (b.numAdult ?? 0) + (b.numChild ?? 0);
                  const price = Number(b.price ?? 0);
                  return (
                    <article
                      key={String(b.id ?? b.bookId ?? index)}
                      className={`overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm transition hover:shadow-md`}
                    >
                      <div className={`h-1 w-full ${channel.accentBg} ${channel.accentBorder} border-b`} />
                      <div className="px-4 py-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-brand-charcoal">
                              {guestLabel(b)}
                            </p>
                            <div className="mt-1">
                              <RefBadge>{String(b.id ?? b.bookId ?? "—")}</RefBadge>
                            </div>
                          </div>
                          {b.status && <StatusPill status={String(b.status).toLowerCase()} />}
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal">
                          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{arrival || "—"}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{departure || "—"}</span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                          {nights != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-cream/70 px-2.5 py-1 font-medium text-brand-charcoal">
                              <Moon className="h-3 w-3" />
                              {nights} night{nights === 1 ? "" : "s"}
                            </span>
                          )}
                          {guests > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-cream/70 px-2.5 py-1 font-medium text-brand-charcoal">
                              <Users className="h-3 w-3" />
                              {guests}
                            </span>
                          )}
                          {price > 0 && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                              ${price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 truncate border-t border-slate-100 pt-2.5 text-xs text-muted-foreground">
                          Property {b.propertyId ?? "—"}
                          {b.roomId ? ` · Room ${b.roomId}` : ""}
                          {b.apiSource ? ` · ${b.apiSource}` : " · direct"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </AdminPanel>
        </>
      )}
    </div>
  );
}

function ChannelTabs({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
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
  );
}

function Beds24SetupPanel({
  mode,
  channelTitle,
  compact = false,
}: {
  mode: "token" | "properties";
  channelTitle?: string;
  compact?: boolean;
}) {
  const title =
    mode === "token"
      ? "One-time Beds24 setup"
      : "Add properties in Beds24";
  const description =
    mode === "token"
      ? "Code is ready — only Beds24 account setup remains"
      : "API connected — add inventory to see live data here";

  const steps =
    mode === "token"
      ? [
          "Create or sign in to your Beds24 account (choose Vacation Rental, not Hotel).",
          "Beds24 → Marketplace → API → generate invite code → open the setup link → copy the refresh token.",
          "Paste the token into Backend/.env as BEDS24_REFRESH_TOKEN and restart the backend.",
          "Add properties in Beds24 (see next step) and connect OTAs in Channel Manager when ready.",
        ]
      : [
          "In Beds24, click Add property and enter name, address, room types, rates, and photos.",
          "Optional: Booking.com → Import from Booking.com (needs Hotel ID) when extranet login works.",
          "Connect Expedia, Airbnb, or VRBO under Beds24 → Settings → Channel Manager.",
          `Open Admin → Channels → ${channelTitle ?? "any channel"} and click Refresh — properties and bookings will load automatically.`,
        ];

  if (compact) {
    return (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-charcoal/85">
        {steps.slice(1, 3).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    );
  }

  return (
    <AdminPanel title={title} description={description}>
      <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-brand-charcoal/85">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Backend check: run{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run beds24:check</code> in the
        Backend folder after updating the token.
      </p>
    </AdminPanel>
  );
}
