export type GuestCancelInput = {
  reason?: string;
};

export type RefundPayoutInput = {
  method: "paypal" | "bank" | "other";
  accountName: string;
  paypalEmail?: string;
  bankName?: string;
  accountNumber?: string;
  routingOrSortCode?: string;
  notes?: string;
};

export type CancellationPreview = {
  allowed: boolean;
  daysUntil: number;
  refundPercent: number;
  refundAmount: number;
  refundEligible: boolean;
  requiresPayoutDetails: boolean;
  message: string;
};

export function refundStatusLabel(status?: string | null) {
  switch (status) {
    case "eligible":
      return "Refund available — submit request";
    case "requested":
      return "Refund requested — awaiting admin";
    case "reviewing":
      return "Refund in review";
    case "processed":
      return "Refund processed";
    case "rejected":
      return "Refund rejected";
    default:
      return "No refund";
  }
}
