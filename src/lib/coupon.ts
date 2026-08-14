/** Temporary single test coupon — full coupon system later. */
export const TEST_COUPON_CODE = "MFZTEST99";
export const TEST_COUPON_PERCENT = 99;
const PAYPAL_MIN_USD = 0.5;

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export type CouponPreview = {
  originalAmount: number;
  amount: number;
  discountPercent: number;
  couponApplied: boolean;
  code: string | null;
};

/** Client-side preview only — PayPal create-order re-validates on the server. */
export function previewCheckoutCoupon(
  amount: number,
  couponCode?: string | null,
): CouponPreview {
  const originalAmount = money(Number(amount) || 0);
  const code = couponCode?.trim().toUpperCase() || "";
  if (!code) {
    return {
      originalAmount,
      amount: originalAmount,
      discountPercent: 0,
      couponApplied: false,
      code: null,
    };
  }
  if (code !== TEST_COUPON_CODE) {
    return {
      originalAmount,
      amount: originalAmount,
      discountPercent: 0,
      couponApplied: false,
      code: null,
    };
  }
  const afterDiscount = money(originalAmount * (1 - TEST_COUPON_PERCENT / 100));
  return {
    originalAmount,
    amount: Math.max(PAYPAL_MIN_USD, afterDiscount),
    discountPercent: TEST_COUPON_PERCENT,
    couponApplied: true,
    code: TEST_COUPON_CODE,
  };
}

export function isValidTestCouponFormat(couponCode: string) {
  return couponCode.trim().toUpperCase() === TEST_COUPON_CODE;
}
