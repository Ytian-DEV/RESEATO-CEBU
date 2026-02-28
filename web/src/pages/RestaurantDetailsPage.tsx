import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  getRestaurant,
  RestaurantDetails,
} from "../lib/api/restaurantDetails.api";
import { getSlots, Slot } from "../lib/api/reservations.api";
import { createReservationSupabase } from "../lib/api/reservations.supabase";
import { useAuth } from "../lib/auth/useAuth";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RestaurantDetailsPage() {
  const location = useLocation();
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
      const res = await createReservationSupabase({
        restaurantId: id,
        name,
        phone,
        date,
        time,
        guests,
      });
      setMsg(`Reservation confirmed! Ref: ${res.id}`);
    } catch (e: any) {
      setMsg(e?.payload?.message ?? e?.message ?? "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <div className="p-6 text-white/80">Loading...</div>;

  return (
    <section className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white">{data.name}</h1>
        <p className="mt-1 text-white/70">
          {data.cuisine} • {data.location}
        </p>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 backdrop-blur-xl">
        <p className="text-white/80 leading-relaxed">{data.description}</p>
      </div>

      {/* Reservation */}
      <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Reserve a table</h2>

        {authLoading ? (
          <p className="mt-3 text-white/70">Checking session…</p>
        ) : !isAuthed ? (
          <div className="mt-4 rounded-xl border border-[var(--maroon-border)] bg-[rgba(0,0,0,0.25)] p-4">
            <p className="text-sm text-white/80">
              You must be logged in to make a reservation.
            </p>
            <Link
              to="/log-in-sign-up"
              state={{ from: location.pathname }}
              className="
                mt-3 inline-flex rounded-xl
                border border-[rgba(127,58,65,0.45)]
                bg-[rgba(127,58,65,0.18)]
                px-4 py-2 text-sm font-medium text-white
                hover:bg-[rgba(127,58,65,0.28)]
                transition
              "
            >
              Login / Sign up
            </Link>
          </div>
        ) : (
          <>
            {/* Reservation form */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Date */}
              <label className="space-y-1">
                <div className="text-sm text-white/70">Date</div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="
                    w-full rounded-xl border border-[var(--maroon-border)]
                    bg-[rgba(127,58,65,0.12)] px-3 py-2 text-sm text-white
                    outline-none focus:border-[var(--maroon-light)]
                  "
                />
              </label>

              {/* Time */}
              <label className="space-y-1">
                <div className="text-sm text-white/70">Time</div>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={loadingSlots || availableTimes.length === 0}
                  className="
                    w-full rounded-xl border border-[var(--maroon-border)]
                    bg-[rgba(127,58,65,0.12)] px-3 py-2 text-sm text-white
                    outline-none focus:border-[var(--maroon-light)]
                    disabled:opacity-60
                  "
                >
                  {loadingSlots ? (
                    <option className="bg-neutral-950">Loading slots…</option>
                  ) : availableTimes.length === 0 ? (
                    <option className="bg-neutral-950">
                      No available slots
                    </option>
                  ) : (
                    availableTimes.map((s) => (
                      <option
                        key={s.time}
                        value={s.time}
                        className="bg-neutral-950"
                      >
                        {s.time}
                      </option>
                    ))
                  )}
                </select>
              </label>

              {/* Name */}
              <label className="space-y-1">
                <div className="text-sm text-white/70">Name</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="
                    w-full rounded-xl border border-[var(--maroon-border)]
                    bg-[rgba(127,58,65,0.12)] px-3 py-2 text-sm text-white
                    placeholder:text-white/40 outline-none
                    focus:border-[var(--maroon-light)]
                  "
                />
              </label>

              {/* Phone */}
              <label className="space-y-1">
                <div className="text-sm text-white/70">Phone</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="
                    w-full rounded-xl border border-[var(--maroon-border)]
                    bg-[rgba(127,58,65,0.12)] px-3 py-2 text-sm text-white
                    placeholder:text-white/40 outline-none
                    focus:border-[var(--maroon-light)]
                  "
                />
              </label>

              {/* Guests */}
              <label className="space-y-1 sm:col-span-2">
                <div className="text-sm text-white/70">Guests</div>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="
                    w-full rounded-xl border border-[var(--maroon-border)]
                    bg-[rgba(127,58,65,0.12)] px-3 py-2 text-sm text-white
                    outline-none focus:border-[var(--maroon-light)]
                  "
                />
              </label>
            </div>

            {msg && (
              <div className="mt-4 rounded-xl border border-[var(--maroon-border)] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-sm text-white/80">
                {msg}
              </div>
            )}

            <button
              onClick={onReserve}
              disabled={
                submitting ||
                !time ||
                availableTimes.length === 0 ||
                !name.trim() ||
                !phone.trim()
              }
              className="
                mt-4 w-full rounded-xl px-6 py-3 text-sm font-medium text-white
                border border-[rgba(127,58,65,0.45)]
                bg-[linear-gradient(135deg,#7f3a41,#5C252B)]
                hover:brightness-110 transition
                disabled:opacity-60
              "
            >
              {submitting ? "Reserving…" : "Confirm reservation"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
