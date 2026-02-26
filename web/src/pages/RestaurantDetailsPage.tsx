import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRestaurant, RestaurantDetails } from '../lib/api/restaurantDetails.api';
import { createReservation, getSlots, Slot } from '../lib/api/reservations.api';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<RestaurantDetails | null>(null);

  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [time, setTime] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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
        const first = r.slots.find((s) => s.available)?.time ?? '';
        setTime(first);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [id, date]);

  const availableTimes = useMemo(() => slots.filter((s) => s.available), [slots]);

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
      setMsg(e?.payload?.message ?? 'Reservation failed');
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm text-neutral-300">Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm text-neutral-300">Time</div>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={loadingSlots || availableTimes.length === 0}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20 disabled:opacity-60"
            >
              {loadingSlots ? (
                <option>Loading...</option>
              ) : availableTimes.length === 0 ? (
                <option>No available slots</option>
              ) : (
                availableTimes.map((s) => (
                  <option key={s.time} value={s.time} className="bg-neutral-950">
                    {s.time}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm text-neutral-300">Your name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/20"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm text-neutral-300">Phone</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/20"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <div className="text-sm text-neutral-300">Guests</div>
            <input
              type="number"
              min={1}
              max={20}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/20"
            />
          </label>
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
          {submitting ? 'Reserving…' : 'Confirm reservation'}
        </button>
      </div>
    </section>
  );
}