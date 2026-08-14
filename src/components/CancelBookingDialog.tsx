import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";
import type { CancellationPreview, GuestCancelInput } from "@/lib/cancellation";

type Props = {
  preview: CancellationPreview;
  eventLabel: "check-in" | "pickup";
  onClose: () => void;
  onConfirm: (input: GuestCancelInput) => Promise<void>;
  pending?: boolean;
};

export function CancelBookingDialog({ preview, eventLabel, onClose, onConfirm, pending }: Props) {
  const [reason, setReason] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onYes() {
    setError(null);
    if (!policyAccepted) {
      setError("Please confirm you understand the cancellation and refund policy.");
      return;
    }
    try {
      await onConfirm({ reason: reason.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={pending ? undefined : onClose} />
      <div
        role="alertdialog"
        aria-labelledby="cancel-confirm-title"
        aria-describedby="cancel-confirm-desc"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="cancel-confirm-title" className="font-display text-xl font-bold text-brand-charcoal">
            Cancel this booking?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id="cancel-confirm-desc" className="text-sm text-muted-foreground">
          Cancel 7 or more days before {eventLabel} for a <strong className="text-brand-charcoal">50% refund</strong>.
          Within 7 days there is <strong className="text-brand-charcoal">no refund (0%)</strong>.
        </p>

        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            preview.refundEligible
              ? "border-brand-green/30 bg-brand-green/8 text-brand-charcoal"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <p className="font-semibold">
            {preview.refundEligible
              ? `Eligible for 50% refund · $${preview.refundAmount.toFixed(2)}`
              : "No refund for this cancellation"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed">{preview.message}</p>
          {preview.refundEligible && (
            <p className="mt-2 text-[13px] leading-relaxed">
              After you cancel, you can submit a refund request with payout details. Admin will process it manually.
            </p>
          )}
        </div>

        <label className="mt-4 block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Reason (optional)
          </span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-auto w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50 px-3.5 py-3.5 text-sm text-brand-charcoal">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-green accent-brand-green focus:ring-brand-green/30"
          />
          <span className="leading-relaxed text-muted-foreground">
            I understand and agree to Malfranza&apos;s cancellation and refund terms in the{" "}
            <Link
              to="/booking-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-green underline underline-offset-2 hover:opacity-90"
              onClick={(e) => e.stopPropagation()}
            >
              booking policy
            </Link>
            .
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => void onYes()}
            disabled={pending || !policyAccepted}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
