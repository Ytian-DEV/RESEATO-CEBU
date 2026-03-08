import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import { supabase } from "./supabase";
import { requireUser } from "./auth";

const app = express();

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const APP_BASE_URL = (process.env.APP_BASE_URL ?? WEB_ORIGIN).replace(
  /\/+$/,
  "",
);
const PAYMONGO_BASE_URL =
  process.env.PAYMONGO_BASE_URL ?? "https://api.paymongo.com/v1";
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY ?? "";
const RESERVATION_FEE_PHP = Number(process.env.RESERVATION_FEE_PHP ?? 100);

app.use(helmet());
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

type PaymentMethod = "card" | "wallet";
type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "cancelled";

function defaultReservationFeeMinor() {
  const value = Math.round(RESERVATION_FEE_PHP * 100);
  if (!Number.isFinite(value) || value <= 0) return 10000;
  return value;
}

function normalizePaymentStatus(raw: unknown): PaymentStatus {
  const value = String(raw ?? "unpaid").toLowerCase();
  if (value === "processing") return "processing";
  if (value === "paid") return "paid";
  if (value === "failed") return "failed";
  if (value === "cancelled") return "cancelled";
  return "unpaid";
}

function getPaymongoPaymentTypes(method: PaymentMethod) {
  if (method === "wallet") return ["gcash", "paymaya"];
  return ["card"];
}

function getPaymongoAuthHeader() {
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured on the API");
  }
  return `Basic ${Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString("base64")}`;
}

async function paymongoRequest(path: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(`${PAYMONGO_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: getPaymongoAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  const rawText = await res.text();
  const data = rawText ? JSON.parse(rawText) : {};

  if (!res.ok) {
    const detail =
      data?.errors?.[0]?.detail ??
      data?.errors?.[0]?.title ??
      data?.message ??
      `PayMongo request failed with status ${res.status}`;
    throw new Error(String(detail));
  }

  return data;
}

async function getReservationForUser(reservationId: string, userId: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id,
      user_id,
      restaurant_id,
      name,
      phone,
      date,
      time,
      guests,
      status,
      created_at,
      payment_status,
      payment_amount,
      payment_provider,
      payment_checkout_session_id,
      payment_reference,
      payment_paid_at,
      payment_error
    `,
    )
    .eq("id", reservationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as any;
}

async function getRestaurantName(restaurantId: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return "Restaurant Reservation";
  return data?.name ?? "Restaurant Reservation";
}

app.get("/version", (_req, res) => {
  res.json({
    version: "0.1.0",
    env: process.env.NODE_ENV ?? "dev",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/restaurants", async (_req, res) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("rating", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const restaurants = (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    location: r.location,
    rating: Number(r.rating),
    priceLevel: r.price_level,
    description: r.description,
    imageUrl: r.image_url,
  }));

  res.json(restaurants);
});

app.get("/restaurants/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  res.json({
    id: data.id,
    name: data.name,
    cuisine: data.cuisine,
    location: data.location,
    rating: Number(data.rating),
    priceLevel: data.price_level,
    description: data.description,
    imageUrl: data.image_url,
  });
});

app.get("/restaurants/:id/slots", async (req, res) => {
  const restaurantId = req.params.id;
  const date = String(req.query.date ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      message: "Invalid date. Use YYYY-MM-DD",
    });
  }

  const allSlots = [
    "10:00",
    "11:30",
    "13:00",
    "15:00",
    "17:00",
    "18:30",
    "20:00",
  ];

  const { data, error } = await supabase
    .from("reservations")
    .select("time")
    .eq("restaurant_id", restaurantId)
    .eq("date", date);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const taken = new Set(
    (data ?? []).map((x: any) => String(x.time).slice(0, 5)),
  );

  res.json({
    restaurantId,
    date,
    slots: allSlots.map((t) => ({
      time: t,
      available: !taken.has(t),
    })),
  });
});

app.post("/reservations", requireUser, async (req: any, res) => {
  const userId = req.user.id;

  const { restaurantId, name, phone, date, time, guests } = req.body ?? {};

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
      date,
      time,
      guests: Number(guests),
    })
    .select("*")
    .single();

  if (error) {
    return res.status(409).json({ message: "Time slot already reserved" });
  }

  res.status(201).json({
    id: data.id,
    restaurantId: data.restaurant_id,
    userId: data.user_id,
    name: data.name,
    phone: data.phone,
    date: String(data.date),
    time: String(data.time).slice(0, 5),
    guests: data.guests,
    createdAt: data.created_at,
  });
});

app.get("/me/reservations", requireUser, async (req: any, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  res.json(data ?? []);
});

app.get("/me/reservations/:reservationId/payment", requireUser, async (req: any, res) => {
  const userId = req.user.id;
  const reservationId = String(req.params.reservationId ?? "");

  try {
    const reservation = await getReservationForUser(reservationId, userId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const restaurantName = await getRestaurantName(reservation.restaurant_id);

    const paymentAmountMinor =
      Number.isFinite(Number(reservation.payment_amount)) &&
      Number(reservation.payment_amount) > 0
        ? Number(reservation.payment_amount)
        : defaultReservationFeeMinor();

    return res.json({
      reservationId: reservation.id,
      restaurantId: reservation.restaurant_id,
      restaurantName,
      date: String(reservation.date),
      time: String(reservation.time).slice(0, 5),
      guests: Number(reservation.guests),
      reservationStatus: String(reservation.status ?? "pending"),
      paymentStatus: normalizePaymentStatus(reservation.payment_status),
      paymentAmountMinor,
      paymentAmount: paymentAmountMinor / 100,
      paymentProvider: reservation.payment_provider ?? "paymongo",
      checkoutSessionId: reservation.payment_checkout_session_id ?? null,
      paidAt: reservation.payment_paid_at ?? null,
      paymentReference: reservation.payment_reference ?? null,
      paymentError: reservation.payment_error ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message ?? "Failed to load payment details",
    });
  }
});

app.post(
  "/me/reservations/:reservationId/payment/checkout",
  requireUser,
  async (req: any, res) => {
    const userId = req.user.id;
    const reservationId = String(req.params.reservationId ?? "");
    const rawMethod = String(req.body?.paymentMethod ?? "card").toLowerCase();
    const paymentMethod: PaymentMethod =
      rawMethod === "wallet" ? "wallet" : "card";

    try {
      if (!PAYMONGO_SECRET_KEY) {
        return res.status(500).json({
          message:
            "PAYMONGO_SECRET_KEY is missing. Configure it on the API server first.",
        });
      }

      const reservation = await getReservationForUser(reservationId, userId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const reservationStatus = String(reservation.status ?? "pending").toLowerCase();
      if (reservationStatus === "cancelled") {
        return res
          .status(409)
          .json({ message: "Cancelled reservations cannot be paid." });
      }

      const currentPaymentStatus = normalizePaymentStatus(reservation.payment_status);
      if (currentPaymentStatus === "paid") {
        return res.status(409).json({ message: "Reservation is already paid." });
      }

      const restaurantName = await getRestaurantName(reservation.restaurant_id);
      const amountMinor =
        Number.isFinite(Number(reservation.payment_amount)) &&
        Number(reservation.payment_amount) > 0
          ? Number(reservation.payment_amount)
          : defaultReservationFeeMinor();

      const paymongoPayload = {
        data: {
          attributes: {
            billing: {
              name: String(reservation.name ?? "RESEATO Customer"),
            },
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            line_items: [
              {
                currency: "PHP",
                amount: amountMinor,
                name: `Reservation Fee - ${restaurantName}`,
                quantity: 1,
                description: `Reservation #${reservation.id} on ${reservation.date} at ${String(reservation.time).slice(0, 5)}`,
              },
            ],
            payment_method_types: getPaymongoPaymentTypes(paymentMethod),
            description: `Reservation payment for ${restaurantName}`,
            success_url: `${APP_BASE_URL}/payment/${reservation.id}?status=success`,
            cancel_url: `${APP_BASE_URL}/payment/${reservation.id}?status=cancelled`,
            metadata: {
              reservation_id: reservation.id,
              restaurant_id: reservation.restaurant_id,
              user_id: reservation.user_id,
            },
          },
        },
      };

      const paymongoResponse: any = await paymongoRequest("/checkout_sessions", {
        method: "POST",
        body: paymongoPayload,
      });

      const checkoutSessionId = String(paymongoResponse?.data?.id ?? "");
      const checkoutUrl = String(
        paymongoResponse?.data?.attributes?.checkout_url ?? "",
      );

      if (!checkoutSessionId || !checkoutUrl) {
        return res.status(502).json({
          message: "Payment provider did not return a checkout session URL.",
        });
      }

      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          payment_status: "processing",
          payment_provider: "paymongo",
          payment_amount: amountMinor,
          payment_checkout_session_id: checkoutSessionId,
          payment_error: null,
        })
        .eq("id", reservation.id)
        .eq("user_id", userId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.json({
        reservationId: reservation.id,
        paymentStatus: "processing",
        checkoutSessionId,
        checkoutUrl,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message ?? "Failed to create payment session",
      });
    }
  },
);

app.post(
  "/me/reservations/:reservationId/payment/confirm",
  requireUser,
  async (req: any, res) => {
    const userId = req.user.id;
    const reservationId = String(req.params.reservationId ?? "");

    try {
      if (!PAYMONGO_SECRET_KEY) {
        return res.status(500).json({
          message:
            "PAYMONGO_SECRET_KEY is missing. Configure it on the API server first.",
        });
      }

      const reservation = await getReservationForUser(reservationId, userId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (normalizePaymentStatus(reservation.payment_status) === "paid") {
        return res.json({
          reservationId,
          paymentStatus: "paid",
          reservationStatus: reservation.status,
          message: "Reservation payment is already completed.",
        });
      }

      const checkoutSessionId = String(
        reservation.payment_checkout_session_id ?? "",
      );
      if (!checkoutSessionId) {
        return res.status(400).json({
          message:
            "No checkout session found for this reservation. Start payment first.",
        });
      }

      const paymongoSession: any = await paymongoRequest(
        `/checkout_sessions/${checkoutSessionId}`,
      );

      const attributes = paymongoSession?.data?.attributes ?? {};
      const payments = Array.isArray(attributes?.payments)
        ? attributes.payments
        : [];

      const paidPayment = payments.find(
        (payment: any) =>
          String(payment?.attributes?.status ?? "").toLowerCase() === "paid",
      );

      const failedPayment = payments.find((payment: any) =>
        ["failed", "cancelled"].includes(
          String(payment?.attributes?.status ?? "").toLowerCase(),
        ),
      );

      const sessionStatus = String(attributes?.status ?? "").toLowerCase();
      const paymentIntentStatus = String(
        attributes?.payment_intent?.attributes?.status ??
          attributes?.payment_intent?.status ??
          "",
      ).toLowerCase();
      const isPaid =
        Boolean(paidPayment) ||
        ["paid", "completed", "succeeded"].includes(sessionStatus) ||
        ["paid", "succeeded", "awaiting_capture"].includes(paymentIntentStatus);

      if (isPaid) {
        const paidAtRaw = paidPayment?.attributes?.paid_at;
        const paidAt =
          typeof paidAtRaw === "number"
            ? new Date(paidAtRaw * 1000).toISOString()
            : typeof paidAtRaw === "string" && !Number.isNaN(Date.parse(paidAtRaw))
              ? new Date(paidAtRaw).toISOString()
              : new Date().toISOString();

        const nextReservationStatus =
          String(reservation.status ?? "pending").toLowerCase() === "pending"
            ? "confirmed"
            : reservation.status;

        const { error: updateError } = await supabase
          .from("reservations")
          .update({
            status: nextReservationStatus,
            payment_status: "paid",
            payment_reference:
              paidPayment?.id ?? reservation.payment_checkout_session_id,
            payment_paid_at: paidAt,
            payment_error: null,
          })
          .eq("id", reservation.id)
          .eq("user_id", userId);

        if (updateError) {
          return res.status(500).json({ message: updateError.message });
        }

        return res.json({
          reservationId: reservation.id,
          paymentStatus: "paid",
          reservationStatus: nextReservationStatus,
          paidAt,
          message: "Payment completed successfully.",
        });
      }

      const nextPaymentStatus = failedPayment ? "failed" : "processing";
      const errorMessage = failedPayment
        ? String(failedPayment?.attributes?.status ?? "Payment failed")
        : null;

      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          payment_status: nextPaymentStatus,
          payment_error: errorMessage,
        })
        .eq("id", reservation.id)
        .eq("user_id", userId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.json({
        reservationId: reservation.id,
        paymentStatus: nextPaymentStatus,
        reservationStatus: reservation.status,
        message:
          nextPaymentStatus === "failed"
            ? "Payment failed on provider."
            : "Payment is still processing.",
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message ?? "Failed to confirm payment",
      });
    }
  },
);

app.post(
  "/me/reservations/:reservationId/payment/cancel",
  requireUser,
  async (req: any, res) => {
    const userId = req.user.id;
    const reservationId = String(req.params.reservationId ?? "");

    try {
      const reservation = await getReservationForUser(reservationId, userId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const currentPaymentStatus = normalizePaymentStatus(reservation.payment_status);
      if (currentPaymentStatus === "paid") {
        return res.status(409).json({
          message: "Paid reservations cannot be marked as cancelled payment.",
        });
      }

      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          payment_status: "cancelled",
          payment_error: "Checkout cancelled by user",
        })
        .eq("id", reservation.id)
        .eq("user_id", userId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.json({
        reservationId: reservation.id,
        paymentStatus: "cancelled",
        message: "Payment attempt cancelled.",
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message ?? "Failed to cancel payment attempt",
      });
    }
  },
);

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});



