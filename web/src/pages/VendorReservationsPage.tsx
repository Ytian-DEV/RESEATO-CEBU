import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Phone,
  Receipt,
  User,
  XCircle,
} from "lucide-react";
import {
  decideVendorReservation,
  listVendorReservations,
  listVendorRestaurants,
  VendorReservation,
  VendorRestaurant,
} from "../lib/api/vendor.api";
import { ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function toPrettyDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function toPesoFromMinor(minor: number | null | undefined) {
  const value = Number(minor ?? 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value / 100);
}

function normalizeStatus(status: string) {
  return String(status || "pending").toLowerCase();
}

function normalizePaymentStatus(status: string | null | undefined) {
  return String(status || "unpaid").toLowerCase();
}

function statusClass(status: string) {
  const value = normalizeStatus(status);

  if (value === "confirmed") return "border-[#b7e4c7] bg-[#ecfdf3] text-[#166534]";
  if (value === "declined") return "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]";
  if (value === "cancelled") return "border-[#e4d5d8] bg-[#faf6f7] text-[#6b5561]";
  if (value === "completed") return "border-[#c4def3] bg-[#eef7ff] text-[#1d4f7a]";

  return "border-[#f8d9a5] bg-[#fff7ed] text-[#b45309]";
}

function paymentStatusClass(status: string) {
  const value = normalizePaymentStatus(status);

  if (value === "paid") return "border-[#b7e4c7] bg-[#ecfdf3] text-[#166534]";
  if (value === "processing") return "border-[#f8d9a5] bg-[#fff7ed] text-[#b45309]";
  if (value === "failed") return "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]";
  if (value === "cancelled") return "border-[#e4d5d8] bg-[#faf6f7] text-[#6b5561]";

  return "border-[#d6dbe6] bg-[#f8fafc] text-[#475467]";
}

export default function VendorReservationsPage() {
  const { isAuthed, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [reservations, setReservations] = useState<VendorReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [restaurantIdFilter, setRestaurantIdFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    if (!isAuthed) {
      setLoading(false);
      return;
    }

    listVendorRestaurants()
      .then((data) => setRestaurants(data))
      .catch((error) =>
        setMessage(getErrorMessage(error, "Unable to load restaurants filter.")),
      );
  }, [isAuthed]);

  useEffect(() => {
    let alive = true;

    async function loadReservations() {
      if (!isAuthed) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage(null);

        const data = await listVendorReservations({
          restaurantId: restaurantIdFilter || undefined,
          status: statusFilter,
          date: dateFilter || undefined,
        });

        if (!alive) return;
        setReservations(data);
      } catch (error) {
        if (!alive) return;
        setMessage(getErrorMessage(error, "Unable to load reservations."));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadReservations();

    return () => {
      alive = false;
    };
  }, [dateFilter, isAuthed, restaurantIdFilter, statusFilter]);

  const pendingCount = useMemo(
    () => reservations.filter((reservation) => normalizeStatus(reservation.status) === "pending").length,
    [reservations],
  );

  async function handleDecision(
    reservationId: string,
    action: "approve" | "decline",
  ) {
    try {
      setActingId(reservationId);
      setMessage(null);

      let reason: string | undefined;
      if (action === "decline") {
        const input = window.prompt("Decline reason (optional):", "No available table");
        if (input === null) {
          setActingId(null);
          return;
        }
        reason = input;
      }

      const result = await decideVendorReservation(reservationId, action, reason);
      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId ? result.reservation : reservation,
        ),
      );
      setMessage(result.message);
    } catch (error) {
      setMessage(getErrorMessage(error, `Failed to ${action} reservation.`));
    } finally {
      setActingId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="inline-flex items-center gap-2 text-[#5b6374]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#4b5563]">
            Login is required to access vendor reservations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">
            Vendor Portal
          </p>
          <h1 className="mt-2 text-5xl text-[#1f2937]">Reservation List</h1>
          <p className="mt-1 text-sm text-[#5b6374]">
            Approve or decline incoming reservations from your restaurants.
          </p>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-[#4b5563]">
              Restaurant
              <select
                value={restaurantIdFilter}
                onChange={(event) => setRestaurantIdFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none"
              >
                <option value="">All restaurants</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[#4b5563]">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <label className="text-sm text-[#4b5563]">
              Date
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none"
              />
            </label>

            <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2.5 text-sm text-[#4b5563]">
              <div className="text-xs uppercase tracking-wide text-[#8b97a8]">
                Pending decisions
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#1f2937]">{pendingCount}</div>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#5b6374] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reservations...
              </div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#6b7280] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              No reservations found.
            </div>
          ) : (
            reservations.map((reservation) => {
              const status = normalizeStatus(reservation.status);
              const isPending = status === "pending";
              const isActing = actingId === reservation.id;
              const paymentStatus = normalizePaymentStatus(reservation.payment_status);

              return (
                <article
                  key={reservation.id}
                  className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl text-[#1f2937]">
                        {reservation.restaurant?.name ?? reservation.restaurant_id}
                      </h3>
                      <p className="text-sm text-[#6b7280]">
                        {toPrettyDate(reservation.date)} at {reservation.time}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-[#8b97a8]">
                        Ref: {reservation.id}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(status)}`}
                      >
                        {status}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide ${paymentStatusClass(
                          paymentStatus,
                        )}`}
                      >
                        Payment: {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] p-3 text-sm text-[#1f2937]">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <User className="h-3.5 w-3.5" />
                        Guest
                      </div>
                      <div className="mt-1">{reservation.name}</div>
                    </div>

                    <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] p-3 text-sm text-[#1f2937]">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <Phone className="h-3.5 w-3.5" />
                        Phone
                      </div>
                      <div className="mt-1">{reservation.phone}</div>
                    </div>

                    <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] p-3 text-sm text-[#1f2937]">
                      <div className="text-xs text-[#6b7280]">Guests</div>
                      <div className="mt-1">{reservation.guests}</div>
                    </div>

                    <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] p-3 text-sm text-[#1f2937]">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <CreditCard className="h-3.5 w-3.5" />
                        Amount
                      </div>
                      <div className="mt-1">{toPesoFromMinor(reservation.payment_amount)}</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] p-3 text-sm text-[#4b5563]">
                    <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                      <Receipt className="h-3.5 w-3.5" />
                      Transaction Reference
                    </div>
                    <div className="mt-1 break-all">
                      {reservation.payment_reference || "Not available yet"}
                    </div>
                  </div>

                  {reservation.decline_reason && (
                    <div className="mt-3 rounded-xl border border-[#f2cccf] bg-[#fff6f7] px-3 py-2 text-sm text-[#9f1239]">
                      Decline reason: {reservation.decline_reason}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision(reservation.id, "approve")}
                      disabled={!isPending || isActing}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#b7e4c7] bg-[#ecfdf3] px-3 py-2 text-sm font-semibold text-[#166534] hover:bg-[#ddf8e8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision(reservation.id, "decline")}
                      disabled={!isPending || isActing}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#be123c] hover:bg-[#ffe4e8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Decline
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
