import { useEffect, useMemo, useState } from "react";
import {
  listMyReservationsSupabase,
  cancelReservationSupabase,
} from "../lib/api/reservations.supabase";

export default function MyReservationsPage() {
  const [items, setItems] = useState<any[]>([]);
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
    return items.filter((r) =>
      `${r.restaurant_id} ${r.status} ${r.id} ${r.name} ${r.phone}`
        .toLowerCase()
        .includes(q),
    );
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
          <h1 className="text-2xl font-semibold text-white">My Reservations</h1>
          <p className="mt-1 text-white/70">
            Your real reservations from Supabase.
          </p>
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
                    Restaurant ID: {r.restaurant_id}
                  </div>
                  <div className="text-sm text-white/70">
                    {r.date} • {r.time} • {r.guests} guests
                  </div>
                  <div className="mt-1 text-xs text-white/55">Ref: {r.id}</div>
                </div>

                <div className="text-sm text-white/80">
                  Status: <span className="text-white">{r.status}</span>
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
