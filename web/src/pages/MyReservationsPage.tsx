import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Filter,
  MapPin,
  UsersRound,
  X,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import {
  listMyReservationsSupabase,
  cancelReservationSupabase,
  ReservationWithRestaurant,
} from "../lib/api/reservations.supabase";

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function normalizeStatus(status: string | undefined) {
  return (status ?? "pending").toLowerCase();
}

function normalizePaymentStatus(status: string | undefined | null) {
  const value = String(status ?? "unpaid").toLowerCase();
  if (value === "processing") return "processing";
  if (value === "paid") return "paid";
  if (value === "failed") return "failed";
  if (value === "cancelled") return "cancelled";
  return "unpaid";
}

function toTimeLabel(raw: string) {
  return String(raw).slice(0, 5);
}

function toPrettyDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function toDateOnly(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sortByDateTime(rows: ReservationWithRestaurant[]) {
  return [...rows].sort((a, b) => {
    const da = new Date(`${a.date}T${toTimeLabel(a.time)}:00`).getTime();
    const db = new Date(`${b.date}T${toTimeLabel(b.time)}:00`).getTime();
    return da - db;
  });
}

function statusPillClass(status: string) {
  const s = normalizeStatus(status);

  if (s === "confirmed") return "bg-[#e6f7ef] text-[#227a4c] border-[#bfe6d0]";
  if (s === "completed") return "bg-[#eaf4ff] text-[#1d5f93] border-[#bdd8f2]";
  if (s === "cancelled") return "bg-[#ffecec] text-[#a63d3d] border-[#f4c3c3]";

  return "bg-[#fff5e5] text-[#9a6a19] border-[#f0d5a5]";
}

function paymentPillClass(paymentStatus: string) {
  if (paymentStatus === "paid") return "bg-[#e6f7ef] text-[#227a4c] border-[#bfe6d0]";
  if (paymentStatus === "processing") return "bg-[#eaf4ff] text-[#1d5f93] border-[#bdd8f2]";
  if (paymentStatus === "failed") return "bg-[#ffecec] text-[#a63d3d] border-[#f4c3c3]";
  if (paymentStatus === "cancelled") return "bg-[#f8eef2] text-[#7f3a41] border-[#e8ccd5]";
  return "bg-[#fff5e5] text-[#9a6a19] border-[#f0d5a5]";
}

export default function MyReservationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReservationWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await listMyReservationsSupabase();
        if (!alive) return;
        setItems(data);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ?? "Failed to load reservations");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const statusCount = useMemo(() => {
    return items.reduce<Record<StatusFilter, number>>(
      (acc, row) => {
        const s = normalizeStatus(row.status) as StatusFilter;
        if (s in acc) acc[s] += 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
    );
  }, [items]);

  const visibleItems = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? items
        : items.filter((row) => normalizeStatus(row.status) === statusFilter);

    if (statusFilter !== "all") return sortByDateTime(byStatus);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sortByDateTime(
      byStatus.filter((row) => {
        const s = normalizeStatus(row.status);
        if (s === "completed" || s === "cancelled") return false;

        const d = toDateOnly(row.date);
        if (!d) return true;
        return d >= today;
      }),
    );
  }, [items, statusFilter]);

  const sectionTitle =
    statusFilter === "all"
      ? "Upcoming Reservations"
      : `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} Reservations`;

  async function onCancel(id: string) {
    setMsg(null);

    try {
      const updated = await cancelReservationSupabase(id);
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
    } catch (e: any) {
      setMsg(e?.message ?? "Cancel failed");
    }
  }

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <section className="mx-auto max-w-5xl px-6 py-8 sm:py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-[#ddd7d9] bg-white px-4 py-2 text-sm text-[#6b7280] shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:text-[#7b2f3b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mt-5 flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#8b3e46] to-[#6a2f35] text-white shadow-lg">
            <CalendarDays className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#1f2937]">
              My Reservations
            </h1>
            <p className="mt-1 text-[15px] text-[#667085]">
              Manage your restaurant bookings
            </p>
          </div>
        </div>

        {msg && (
          <div className="mt-6 rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {msg}
          </div>
        )}

        <div className="mt-7 rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-base font-semibold text-[#1f2937]">
              <Filter className="h-4 w-4 text-[#8b3e46]" />
              Filter by Status
            </div>
            <div className="text-sm text-[#667085]">
              {visibleItems.length} reservation
              {visibleItems.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const isActive = statusFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-[#c98d98] bg-[#8b3d4a] text-white shadow-[0_6px_18px_rgba(139,62,70,0.18)]"
                      : "border-[#e6e1e3] bg-[#faf7f8] text-[#5b6374] hover:bg-[#f5eff1]"
                  }`}
                >
                  {filter.label}
                  {filter.key !== "all" ? ` (${statusCount[filter.key]})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <h2 className="mt-8 text-3xl font-semibold tracking-tight text-[#1f2937]">
          {sectionTitle}
        </h2>

        {loading ? (
          <div className="mt-5 rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#6b7280] shadow-[0_10px_26px_rgba(15,23,42,0.07)]">
            Loading reservations...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#6b7280] shadow-[0_10px_26px_rgba(15,23,42,0.07)]">
            No reservations found for this status.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {visibleItems.map((row) => {
              const status = normalizeStatus(row.status);
              const paymentStatus = normalizePaymentStatus(row.payment_status ?? null);
              const canPay =
                status !== "cancelled" &&
                status !== "completed" &&
                paymentStatus !== "paid";

              return (
                <article
                  key={row.id}
                  className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold text-[#1f2937]">
                        {row.restaurant?.name ?? `Restaurant ${row.restaurant_id}`}
                      </h3>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        Booking ID: {row.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClass(status)}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-3">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#8b3e46]" />
                        Date
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[#1f2937]">
                        {toPrettyDate(row.date)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-3">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <Clock3 className="h-3.5 w-3.5 text-[#8b3e46]" />
                        Time
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[#1f2937]">
                        {toTimeLabel(row.time)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-3">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <UsersRound className="h-3.5 w-3.5 text-[#8b3e46]" />
                        Guests
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[#1f2937]">
                        {row.guests} {row.guests === 1 ? "Person" : "People"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-3">
                      <div className="inline-flex items-center gap-2 text-xs text-[#6b7280]">
                        <MapPin className="h-3.5 w-3.5 text-[#8b3e46]" />
                        Location
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-[#374151]">
                        {row.restaurant?.location ?? "Location not available"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#ece8e9] bg-[#fafafa] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-[#6b7280]">Payment</span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${paymentPillClass(paymentStatus)}`}
                      >
                        {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-5 grid gap-2 ${canPay ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
                    {canPay && (
                      <Link
                        to={`/payment/${row.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-4 py-2.5 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f2dde2]"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Reservation Fee
                      </Link>
                    )}

                    <button
                      onClick={() => onCancel(row.id)}
                      disabled={status !== "pending"}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8c0c6] px-4 py-2.5 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f8ecee] disabled:cursor-not-allowed disabled:border-[#ece8e9] disabled:text-[#9ca3af] disabled:hover:bg-transparent"
                    >
                      <X className="h-4 w-4" />
                      Cancel Reservation
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[#ece8e9] pt-3 text-sm text-[#667085]">
                    <div className="flex items-center justify-between">
                      <span>Restaurant</span>
                      <span className="font-medium text-[#1f2937]">
                        {row.restaurant?.name ?? "Unavailable"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span>Location</span>
                      <span className="font-medium text-[#1f2937]">
                        {row.restaurant?.location ?? "Unavailable"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-12 h-16 bg-[#ebecef]" />

      <footer className="border-t border-[#e8e2e3] bg-white text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <h3 className="text-3xl font-semibold tracking-wide">RESEATO</h3>
              <p className="mt-4 max-w-xs text-sm text-[#667085] leading-relaxed">
                Making restaurant reservations simple and elegant for Cebu's
                best dining spots.
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Quick Links</h4>
              <div className="mt-4 space-y-2 text-sm text-[#667085]">
                <Link to="/restaurants" className="block hover:text-[#7b2f3b]">
                  Browse Restaurants
                </Link>
                <Link to="/my-reservations" className="block hover:text-[#7b2f3b]">
                  My Reservations
                </Link>
                <Link to="/" className="block hover:text-[#7b2f3b]">
                  Home
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Contact</h4>
              <div className="mt-4 space-y-2 text-sm text-[#667085]">
                <p>SM Seaside, Cebu City</p>
                <p>support@reseato.com</p>
                <p>+63 123 456 7890</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#ece8e9] pt-6 text-center text-sm text-[#98a2b3]">
            © 2026 RESEATO. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}


