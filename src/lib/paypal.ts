import { apiRequest } from "./api";

export type PayPalConfig = {
  configured: boolean;
  mode: "sandbox" | "live";
  clientId: string | null;
};

export async function fetchPayPalConfig(): Promise<PayPalConfig> {
  return apiRequest<PayPalConfig>("/payments/paypal/config");
}

export async function createPayPalOrder(input: {
  amount: number;
  currency?: string;
  description?: string;
}): Promise<{ orderId: string; status: string }> {
  return apiRequest("/payments/paypal/create-order", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function capturePayPalOrder(
  orderId: string,
): Promise<{ orderId: string; status: string; captureId: string; amount: number; currency: string }> {
  return apiRequest("/payments/paypal/capture-order", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}
