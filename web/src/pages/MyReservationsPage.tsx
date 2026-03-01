import { useEffect, useMemo, useState } from "react";
import {
  listMyReservationsSupabase,
  cancelReservationSupabase,
  ReservationWithRestaurant,
} from "../lib/api/reservations.supabase";

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();

  const cls =
    s === "confirmed"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : s === "cancelled"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
        : s === "completed"
          ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}
    >
      {s || "pending"}
    </span>
  );
}

export default function MyReservationsPage() {
  const [items, setItems] = useState<ReservationWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((r) => {
      const restaurantText = `${r.restaurant?.name ?? ""} ${r.restaurant?.location ?? ""} ${r.restaurant?.cuisine ?? ""}`;
      const rowText = `${restaurantText} ${r.restaurant_id} ${r.status} ${r.id} ${r.name} ${r.phone} ${r.date} ${r.time} ${r.guests}`;
      return rowText.toLowerCase().includes(q);
    });
  }, [items, query]);

  async function onCancel(id: string) {
    setMsg(null);
    try {
      const updated = await cancelReservationSupabase(id);
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e: any) {
      setMsg(e?.message ?? "Cancel failed");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MY RESERVATIONS</h1>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full sm:w-80 rounded-xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none"
        />
      </div>

      {msg && (
        <div className="rounded-xl border border-[var(--maroon-border)] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="text-white/70">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 text-white/70">
          No reservations found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-5 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {r.restaurant?.name ?? `Restaurant ${r.restaurant_id}`}
                  </div>
                  <div className="text-sm text-white/70">
                    {r.restaurant?.cuisine ? `${r.restaurant.cuisine} • ` : ""}
                    {r.restaurant?.location ?? ""}
                  </div>
                  <div className="text-sm text-white/70">
                    {r.date} • {r.time} • {r.guests} guests
                  </div>
                  <div className="mt-1 text-xs text-white/55">Ref: {r.id}</div>
                </div>

                <div className="text-sm text-white/80 flex items-center gap-2">
                  <span>Status</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => onCancel(r.id)}
                  disabled={r.status !== "pending"}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60"
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
