import { useEffect, useState } from "react";
import { getMyReservations, MyReservation } from "../lib/api/me.api";

export default function MyReservationsPage() {
  const [items, setItems] = useState<MyReservation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMyReservations()
      .then(setItems)
      .catch((e: any) => setErr(e?.payload?.message ?? "Failed to load"));
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">My Reservations</h1>

      {err && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {err}
        </div>
      )}

      {!items ? (
        <div className="text-neutral-300">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-neutral-300">No reservations yet.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="font-medium">
                {r.date} • {String(r.time).slice(0, 5)}
              </div>
              <div className="mt-1 text-sm text-neutral-300">
                Guests: {r.guests} • {r.name} • {r.phone}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
