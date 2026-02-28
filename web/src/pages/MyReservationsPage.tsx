import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type ReservationUI = {
  id: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

const demoData: ReservationUI[] = [
  {
    id: "RSV-10231",
    restaurantName: "Green Table",
    date: "2026-02-28",
    time: "19:00",
    guests: 2,
    status: "confirmed",
  },
  {
    id: "RSV-10210",
    restaurantName: "Cebu Grill House",
    date: "2026-03-02",
    time: "18:30",
    guests: 4,
    status: "pending",
  },
];

function StatusBadge({ status }: { status: ReservationUI["status"] }) {
  const cls =
    status === "pending"
      ? "status-pending"
      : status === "confirmed"
        ? "status-confirmed"
        : status === "cancelled"
          ? "status-cancelled"
          : "status-completed";

  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function MyReservationsPage() {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return demoData;
    return demoData.filter((r) =>
      `${r.restaurantName} ${r.id} ${r.status}`.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Reservations</h1>
          <p className="mt-1 text-white/70">
            Track your bookings and reservation statuses.
          </p>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reservations…"
          className="
            w-full sm:w-80
            rounded-xl border border-[var(--maroon-border)]
            bg-[var(--maroon-glass)]
            px-4 py-2 text-sm text-white
            placeholder:text-white/40 outline-none
            focus:border-[var(--maroon-light)]
          "
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 backdrop-blur-xl">
          <p className="text-white/75">No reservations found.</p>
          <Link
            to="/restaurants"
            className="
              mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-medium text-white
              border border-[rgba(127,58,65,0.45)]
              bg-[linear-gradient(135deg,#7f3a41,#5C252B)]
              hover:brightness-110 transition
            "
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="
                rounded-2xl border border-[var(--maroon-border)]
                bg-[var(--maroon-glass)]
                p-5 backdrop-blur-xl
              "
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate text-lg font-semibold text-white">
                      {r.restaurantName}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-white/70">
                    Ref: <span className="text-white/85">{r.id}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-white/80">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {r.date}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {r.time}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {r.guests} guests
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="
                    rounded-xl px-4 py-2 text-sm font-medium text-white
                    border border-[rgba(127,58,65,0.45)]
                    bg-[rgba(127,58,65,0.18)]
                    hover:bg-[rgba(127,58,65,0.28)]
                    transition
                  "
                >
                  View details
                </button>

                <button
                  className="
                    rounded-xl px-4 py-2 text-sm font-medium text-white
                    border border-white/10 bg-white/5
                    hover:bg-white/10 transition
                    disabled:opacity-60
                  "
                  disabled={r.status !== "pending"}
                  title={
                    r.status !== "pending"
                      ? "Only pending reservations can be cancelled (UI placeholder)"
                      : "Cancel reservation (UI placeholder)"
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
