import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Car,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Malfranza" },
      {
        name: "description",
        content:
          "View your Malfranza booking references, stay dates, and any added taxi transfers.",
      },
      { property: "og:title", content: "My Bookings — Malfranza" },
      {
        property: "og:description",
        content:
          "View your Malfranza booking references, stay dates, and any added taxi transfers.",
      },
    ],
  }),
  component: MyBookingsPage,
});

type PublicBooking = {
  booking_reference: string;
  apartment_name: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_amount: number;
  status: string;
  taxi_addon: boolean;
  taxi_date: string | null;
  taxi_time: string | null;
  taxi_pickup: string | null;
  taxi_dropoff: string | null;
  created_at: string;
};

const STORAGE_KEY = "mfz.myBookings";

function readRefs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRefs(refs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
  } catch {
    /* ignore */
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function MyBookingsPage() {
  const [refs, setRefs] = useState<string[]>([]);
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRef, setAddRef] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRefs(readRefs());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (refs.length === 0) {
        if (!cancelled) {
          setBookings([]);
          setLoading(false);
        }
        return;
      }
      const results = await Promise.all(
        refs.map(async (r) => {
          const { data } = await supabase.rpc("get_public_booking", {
            _reference: r,
          });
          return (Array.isArray(data) ? data[0] : null) as PublicBooking | null;
        }),
      );
      if (!cancelled) {
        setBookings(results.filter((b): b is PublicBooking => !!b));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = addRef.trim().toUpperCase();
    if (!value) return;
    setAdding(true);
    setError(null);
    const { data } = await supabase.rpc("get_public_booking", {
      _reference: value,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      setError("We couldn't find a booking with that reference.");
      setAdding(false);
      return;
    }
    if (!refs.includes(value)) {
      const next = [value, ...refs];
      writeRefs(next);
      setRefs(next);
    }
    setAddRef("");
    setAdding(false);
  }

  function handleRemove(reference: string) {
    const next = refs.filter((r) => r !== reference);
    writeRefs(next);
    setRefs(next);
  }

  return (
    <div className="min-h-screen bg-brand-cream/40">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-green sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every booking you complete on this device is saved here for quick
              reference.
            </p>
          </div>
          <Link
            to="/book"
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New booking
          </Link>
        </div>

        {/* Add existing booking */}
        <form
          onSubmit={handleAdd}
          className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center"
        >
          <label
            htmlFor="mfz-ref"
            className="text-sm font-medium text-brand-charcoal sm:min-w-[180px]"
          >
            Have a reference?
          </label>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              id="mfz-ref"
              value={addRef}
              onChange={(e) => setAddRef(e.target.value)}
              placeholder="MFZ-2026-0001"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !addRef.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-green px-5 py-2.5 text-sm font-semibold text-brand-green transition hover:bg-brand-cream disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {/* List */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-brand-green/30 bg-white p-10 text-center">
              <p className="text-base font-semibold text-brand-green">
                No bookings yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you finish a booking, its MFZ reference will show up here.
              </p>
              <Link
                to="/book"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                <Plus className="h-4 w-4" /> Start a booking
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4">
              {bookings.map((b) => (
                <li
                  key={b.booking_reference}
                  className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {b.status || "confirmed"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Booked {fmtDate(b.created_at)}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-brand-green">
                        {b.apartment_name ?? "Stay"}
                      </h2>
                      <p className="mt-0.5 text-xs font-mono text-brand-charcoal/80">
                        {b.booking_reference}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total paid
                      </div>
                      <div className="text-xl font-bold text-brand-green">
                        ${Number(b.total_amount).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Check-in"
                      value={fmtDate(b.check_in)}
                    />
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Check-out"
                      value={fmtDate(b.check_out)}
                    />
                    <InfoRow
                      icon={<Users className="h-4 w-4" />}
                      label="Guests · Nights"
                      value={`${b.guests} · ${b.nights}`}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {b.taxi_addon ? (
                      <div className="flex items-start gap-2 rounded-xl bg-brand-cream/60 px-3 py-2 text-sm text-brand-charcoal">
                        <Car className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                        <div>
                          <div className="font-semibold text-brand-green">
                            Taxi transfer added
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.taxi_pickup ?? "Airport pickup"}
                            {b.taxi_date ? ` · ${fmtDate(b.taxi_date)}` : ""}
                            {b.taxi_time ? ` at ${b.taxi_time.slice(0, 5)}` : ""}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="h-4 w-4" />
                        No taxi added ·{" "}
                        <Link
                          to="/taxi"
                          className="font-semibold text-brand-green underline-offset-2 hover:underline"
                        >
                          Book a ride
                        </Link>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemove(b.booking_reference)}
                      className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-red-300 hover:text-red-600"
                      aria-label={`Remove ${b.booking_reference} from this device`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove from this device
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Bookings are stored securely in our database. This page uses your
          browser to remember which references belong to you.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-brand-green">{icon}</div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium text-brand-charcoal">{value}</div>
      </div>
    </div>
  );
}
