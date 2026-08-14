import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";
import { RefundRequestDialog } from "@/components/RefundRequestDialog";
import type { CancellationPreview } from "@/lib/cancellation";
import { refundStatusLabel } from "@/lib/cancellation";
import { cancelMyStayBooking, getMyBooking, submitMyStayRefundRequest } from "@/lib/user";
import { useUserAuth } from "@/context/UserAuthContext";

export const Route = createFileRoute("/my-bookings_/$reference")({
  head: ({ params }) => ({
    meta: [
      { title: `Booking ${params.reference} — Malfranza` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingDetailPage,
});

function fmtDate(iso: string) {
  try {
    return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

function BookingDetailPage() {
  const { reference } = Route.useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useUserAuth();
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    if (user) return;
    openAuthModal({
      mode: "signin",
      reason: "Sign in to view this booking.",
      redirectTo: `/my-bookings/${encodeURIComponent(reference)}`,
    });
    navigate({ to: "/" });
  }, [user, openAuthModal, navigate, reference]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyBooking(reference);
        if (!cancelled) setBooking(data);
      } catch (err) {
        if (!cancelled) {
          setBooking(null);
          setError(err instanceof Error ? err.message : "Couldn't load this booking.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reference]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading booking…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-brand-green">Booking not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "This booking isn't linked to your account."}
        </p>
        <Link
          to="/my-bookings"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Bookings
        </Link>
      </div>
    );
  }

  const checkIn = String(booking.checkIn).slice(0, 10);
  const checkOut = String(booking.checkOut).slice(0, 10);
  const taxi = booking.taxi;
  const cancellation = booking.cancellation as CancellationPreview | undefined;
  const canCancel = Boolean(cancellation?.allowed);

  return (
    <div className="min-h-screen bg-brand-cream/40">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/my-bookings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" /> My Bookings
        </Link>

        <div className="mt-5 rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {booking.status}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-brand-green sm:text-3xl">
                {booking.apartmentName ?? "Stay booking"}
                {booking.unitName ? ` · ${booking.unitName}` : ""}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{booking.bookingReference}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-brand-green">${Number(booking.totalAmount).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground capitalize">Payment: {booking.paymentStatus}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DetailCard icon={<Calendar className="h-4 w-4" />} label="Check-in" value={fmtDate(checkIn)} />
            <DetailCard icon={<Calendar className="h-4 w-4" />} label="Check-out" value={fmtDate(checkOut)} />
            <DetailCard
              icon={<Users className="h-4 w-4" />}
              label="Guests · Nights"
              value={`${booking.guests} guest${booking.guests > 1 ? "s" : ""} · ${booking.nights} night${booking.nights > 1 ? "s" : ""}`}
            />
            <DetailCard
              icon={<CreditCard className="h-4 w-4" />}
              label="Nightly rate"
              value={`$${Number(booking.nightlyRate).toFixed(0)} / night`}
            />
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Guest details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailCard icon={<User className="h-4 w-4" />} label="Name" value={booking.guestName} />
              <DetailCard icon={<MapPin className="h-4 w-4" />} label="Email" value={booking.guestEmail} />
              <DetailCard icon={<Phone className="h-4 w-4" />} label="Phone" value={booking.guestPhone} />
            </div>
          </div>

          {booking.specialRequests && (
            <div className="mt-6 rounded-xl bg-brand-cream/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Special requests</p>
              <p className="mt-1 text-sm text-brand-charcoal whitespace-pre-wrap">{booking.specialRequests}</p>
            </div>
          )}

          {taxi && (
            <div className="mt-6 rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-green">
                <Car className="h-4 w-4 text-brand-orange" />
                Airport pickup included
              </div>
              <div className="mt-3 grid gap-2 text-sm text-brand-charcoal">
                <p>
                  <span className="text-muted-foreground">When: </span>
                  {fmtDate(String(taxi.date).slice(0, 10))} at {taxi.time}
                </p>
                <p>
                  <span className="text-muted-foreground">From: </span>
                  {taxi.pickup}
                </p>
                <p>
                  <span className="text-muted-foreground">To: </span>
                  {taxi.dropoff}
                </p>
                <p>
                  <span className="text-muted-foreground">Passengers: </span>
                  {taxi.passengers}
                  {taxi.fare != null ? ` · $${Number(taxi.fare).toFixed(0)}` : ""}
                </p>
                {taxi.notes && (
                  <p>
                    <span className="text-muted-foreground">Notes: </span>
                    {taxi.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-2 border-t border-border pt-5 text-sm">
            <PriceRow label="Stay subtotal" value={`$${Number(booking.staySubtotal).toFixed(0)}`} />
            {Number(booking.serviceFee) > 0 && (
              <PriceRow label="Service fee" value={`$${Number(booking.serviceFee).toFixed(0)}`} />
            )}
            {taxi?.fare != null && Number(taxi.fare) > 0 && (
              <PriceRow label="Taxi" value={`$${Number(taxi.fare).toFixed(0)}`} />
            )}
            <PriceRow label="Total" value={`$${Number(booking.totalAmount).toFixed(0)}`} bold />
          </div>

          {booking.status === "cancelled" && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <p className="font-semibold">This stay is cancelled</p>
              {Number(booking.refundPercent) > 0 ? (
                <>
                  <p className="mt-1">{refundStatusLabel(booking.refundStatus)}</p>
                  <p className="mt-1 text-[13px]">
                    50% of ${Number(booking.totalAmount).toFixed(2)} = ${Number(booking.refundAmount).toFixed(2)}
                  </p>
                  {booking.refundAdminNote && (
                    <p className="mt-2 text-[13px]">Admin note: {booking.refundAdminNote}</p>
                  )}
                  {booking.refundStatus === "eligible" && (
                    <button
                      type="button"
                      onClick={() => setRefundOpen(true)}
                      className="mt-3 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Submit refund request
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-1">No refund applies under the 7-day cancellation policy.</p>
              )}
            </div>
          )}

          {canCancel && (
            <div className="mt-6 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Cancel this booking
              </button>
              {cancellation && (
                <p className="mt-2 text-xs text-muted-foreground">{cancellation.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {cancelOpen && cancellation && (
        <CancelBookingDialog
          preview={cancellation}
          eventLabel="check-in"
          pending={cancelling}
          onClose={() => !cancelling && setCancelOpen(false)}
          onConfirm={async (input) => {
            setCancelling(true);
            try {
              await cancelMyStayBooking(booking.bookingReference, input);
              toast.success(
                cancellation.refundEligible
                  ? "Booking cancelled. You can submit your refund request now."
                  : "Booking cancelled. No refund applies.",
              );
              setCancelOpen(false);
              const data = await getMyBooking(reference);
              setBooking(data);
              if (cancellation.refundEligible) setRefundOpen(true);
            } finally {
              setCancelling(false);
            }
          }}
        />
      )}

      {refundOpen && Number(booking.refundAmount) > 0 && (
        <RefundRequestDialog
          amount={Number(booking.refundAmount)}
          pending={refunding}
          onClose={() => !refunding && setRefundOpen(false)}
          onSubmit={async (payout) => {
            setRefunding(true);
            try {
              await submitMyStayRefundRequest(booking.bookingReference, payout);
              toast.success("Refund request sent to admin");
              setRefundOpen(false);
              const data = await getMyBooking(reference);
              setBooking(data);
            } finally {
              setRefunding(false);
            }
          }}
        />
      )}
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-brand-cream/40 px-4 py-3">
      <div className="flex items-center gap-2 text-brand-green">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 break-words text-sm font-medium text-brand-charcoal">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold text-brand-green" : "text-brand-charcoal"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
