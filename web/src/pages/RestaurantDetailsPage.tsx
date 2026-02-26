import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getRestaurant,
  RestaurantDetails,
} from "../lib/api/restaurantDetails.api";
import { createReservation, getSlots, Slot } from "../lib/api/reservations.api";
import { useAuth } from '../lib/auth/useAuth';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RestaurantDetailsPage() {
  const { isAuthed, loading: authLoading } = useAuth();
  const { id } = useParams();
  const [data, setData] = useState<RestaurantDetails | null>(null);

  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then(setData);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingSlots(true);
    setMsg(null);
    getSlots(id, date)
      .then((r) => {
        setSlots(r.slots);
        const first = r.slots.find((s) => s.available)?.time ?? "";
        setTime(first);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [id, date]);

  const availableTimes = useMemo(
    () => slots.filter((s) => s.available),
    [slots],
  );

  async function onReserve() {
    if (!id) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await createReservation({
        restaurantId: id,
        name,
        phone,
        date,
        time,
        guests,
      });
      setMsg(`Reservation confirmed! Ref: ${res.id}`);
    } catch (e: any) {
      setMsg(e?.payload?.message ?? "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{data.name}</h1>
        <p className="mt-1 text-neutral-300">
          {data.cuisine} • {data.location}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p>{data.description}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Reserve a table</h2>

        {authLoading ? (
          <p className="mt-3 text-neutral-300">Checking session…</p>
        ) : !isAuthed ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-neutral-200">
              You must be logged in to make a reservation.
            </p>
            <Link
              to="/log-in-sign-up"
              className="mt-3 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Go to Login/SignUp
            </Link>
          </div>
        ) : (
          <>
            {/* ✅ Put your existing reservation form UI here */}
            {/* date/time/name/phone/guests + Confirm button */}

            {/* Example: keep your existing form exactly as-is */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* ... your existing inputs ... */}
            </div>

            {msg && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                {msg}
              </div>
            )}

            <button
              onClick={onReserve}
              disabled={submitting || !time || availableTimes.length === 0}
              className="mt-4 w-full rounded-xl bg-white/10 px-6 py-3 text-sm font-medium hover:bg-white/20 disabled:opacity-60"
            >
              {submitting ? "Reserving…" : "Confirm reservation"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
