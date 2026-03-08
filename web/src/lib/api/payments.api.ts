import { api } from "./client";

export type ReservationPaymentDetails = {
  reservationId: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  reservationStatus: string;
  paymentStatus: "unpaid" | "processing" | "paid" | "failed" | "cancelled";
  paymentAmountMinor: number;
  paymentAmount: number;
  paymentProvider: string;
  checkoutSessionId: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  paymentError: string | null;
};

export type CheckoutResponse = {
  reservationId: string;
  paymentStatus: "processing";
  checkoutSessionId: string;
  checkoutUrl: string;
};

export type ConfirmResponse = {
  reservationId: string;
  paymentStatus: "processing" | "paid" | "failed" | "cancelled";
  reservationStatus: string;
  message: string;
  paidAt?: string;
};

export async function getReservationPaymentDetails(reservationId: string) {
  return api<ReservationPaymentDetails>(`/me/reservations/${reservationId}/payment`);
}

export async function createCheckoutSession(
  reservationId: string,
  paymentMethod: "card" | "wallet",
) {
  return api<CheckoutResponse>(`/me/reservations/${reservationId}/payment/checkout`, {
    method: "POST",
    body: { paymentMethod },
  });
}

export async function confirmReservationPayment(reservationId: string) {
  return api<ConfirmResponse>(`/me/reservations/${reservationId}/payment/confirm`, {
    method: "POST",
  });
}

export async function cancelReservationPayment(reservationId: string) {
  return api<{ reservationId: string; paymentStatus: "cancelled"; message: string }>(
    `/me/reservations/${reservationId}/payment/cancel`,
    {
      method: "POST",
    },
  );
}

