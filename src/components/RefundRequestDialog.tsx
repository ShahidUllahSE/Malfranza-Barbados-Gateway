import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { RefundPayoutInput } from "@/lib/cancellation";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15";

type Props = {
  amount: number;
  onClose: () => void;
  onSubmit: (payout: RefundPayoutInput) => Promise<void>;
  pending?: boolean;
};

export function RefundRequestDialog({ amount, onClose, onSubmit, pending }: Props) {
  const [method, setMethod] = useState<RefundPayoutInput["method"]>("paypal");
  const [accountName, setAccountName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingOrSortCode, setRoutingOrSortCode] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountName.trim()) {
      setError("Enter the name on the payout account");
      return;
    }
    if (method === "paypal" && !paypalEmail.trim()) {
      setError("Enter your PayPal email");
      return;
    }
    if (method === "bank" && (!bankName.trim() || !accountNumber.trim())) {
      setError("Enter bank name and account number");
      return;
    }
    if (method === "other" && !notes.trim()) {
      setError("Describe how we should send the refund");
      return;
    }
    try {
      await onSubmit({
        method,
        accountName: accountName.trim(),
        paypalEmail: method === "paypal" ? paypalEmail.trim() : undefined,
        bankName: method === "bank" ? bankName.trim() : undefined,
        accountNumber: method === "bank" ? accountNumber.trim() : undefined,
        routingOrSortCode: method === "bank" ? routingOrSortCode.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit refund request");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={pending ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-charcoal">Request refund</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit payout details for your <strong className="text-brand-charcoal">${amount.toFixed(2)}</strong>{" "}
              (50%) refund. Admin will process this manually — not automatic on the website.
            </p>
          </div>
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

        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as RefundPayoutInput["method"])}
              className={inputClass}
            >
              <option value="paypal">PayPal</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Account name</span>
            <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
          </label>
          {method === "paypal" && (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">PayPal email</span>
              <input
                type="email"
                required
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className={inputClass}
              />
            </label>
          )}
          {method === "bank" && (
            <>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Bank name</span>
                <input required value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Account number
                </span>
                <input
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Routing / sort code (optional)
                </span>
                <input
                  value={routingOrSortCode}
                  onChange={(e) => setRoutingOrSortCode(e.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}
          {method === "other" && (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                How should we send the refund?
              </span>
              <textarea
                required
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} h-auto py-2`}
              />
            </label>
          )}

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
