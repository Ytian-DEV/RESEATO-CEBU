import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  getRestaurant,
  RestaurantDetails,
} from "../lib/api/restaurantDetails.api";
import { createReservation, getSlots, Slot } from "../lib/api/reservations.api";
import { useAuth } from "../lib/auth/useAuth";
import { ApiError } from "../lib/api/client";
import { ArrowLeft, Mail, MapPin, Phone, Star } from "lucide-react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPrettyDate(iso: string) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export default function RestaurantDetailsPage() {
  const navigate = useNavigate();
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
  const [note, setNote] = useState(""); // UI-only for now (not saved)

  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const heroUrl =
    data?.imageUrl ??
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80&sat=-10";

  useEffect(() => {
    if (!id) return;
    let alive = true;

    async function loadRestaurant() {
      try {
        setLoadingRestaurant(true);
        setMsg(null);
        const restaurantId = id;
        if (!restaurantId) return;

        const details = await getRestaurant(restaurantId);
        if (!alive) return;
        setData(details);
      } catch (error) {
        if (!alive) return;
        setData(null);
        setMsg(getErrorMessage(error, "Unable to load restaurant details."));
      } finally {
        if (!alive) return;
        setLoadingRestaurant(false);
      }
    }

    loadRestaurant();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    setLoadingSlots(true);
    setMsg(null);

    getSlots(id, date)
      .then((r) => {
        if (!alive) return;
        setSlots(r.slots);
        const first = r.slots.find((s) => s.available)?.time ?? "";
        setTime(first);
      })
      .catch((error) => {
        if (!alive) return;
        setSlots([]);
        setTime("");
        setMsg(getErrorMessage(error, "Unable to load available slots."));
      })
      .finally(() => {
        if (!alive) return;
        setLoadingSlots(false);
      });

    return () => {
      alive = false;
    };
  }, [id, date]);

  const availableTimes = useMemo(
    () => slots.filter((s) => s.available),
    [slots],
  );

  const morningSlots = useMemo(
    () => availableTimes.filter((s) => Number(s.time.slice(0, 2)) < 12),
    [availableTimes],
  );
  const afternoonSlots = useMemo(
    () => availableTimes.filter((s) => Number(s.time.slice(0, 2)) >= 12),
    [availableTimes],
  );

  function decGuests() {
    setGuests((g) => Math.max(1, g - 1));
  }
  function incGuests() {
    setGuests((g) => Math.min(20, g + 1));
  }

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

      setMsg(`Reservation created. Redirecting to payment for Ref: ${res.id}`);
      navigate(`/payment/${res.id}`);
    } catch (e: any) {
      setMsg(e?.payload?.message ?? e?.message ?? "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRestaurant) {
    return <div className="p-6 text-white/80">Loading restaurant...</div>;
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[#b44a53]/40 bg-[#4a1e23]/30 px-4 py-3 text-sm text-[#f6c8cd]">
          {msg ?? "Unable to load restaurant details."}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* HERO */}
      <div className="relative h-[380px] sm:h-[420px] overflow-hidden">
        <img
          src={heroUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,58,65,0.22),transparent_55%)]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-white/15 bg-black/30 px-3 py-2
              text-sm text-white/90 backdrop-blur
              hover:bg-black/40 transition
            "
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Discovery
          </button>

          <div className="mt-10 sm:mt-14 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/85 backdrop-blur">
                {data.cuisine}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/85 backdrop-blur">
                <Star className="h-3.5 w-3.5" aria-hidden /> {Number(data.rating).toFixed(1)}
              </span>
            </div>

            <h1 className="mt-3 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
              {data.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-white/80">
              <span className="inline-flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {data.location}
              </span>
              <span className="text-white/30">�</span>
              <span className="text-sm text-white/70">
                Cebu dining � Reservations available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="-mt-16 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* LEFT: ABOUT */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.06)] p-6 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  About the Restaurant
                </h2>
                <span className="text-xs text-white/50">
                  {data.priceLevel ? `Price: ${data.priceLevel}` : ""}
                </span>
              </div>

              <div className="mt-4 text-white/80 leading-relaxed">
                {data.description}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">
                    Contact details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      <span>{data.contactPhone || "Contact not available"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      <span>{data.contactEmail || "support@reseato.com"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">
                    Location
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    <span>{data.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* optional extra section placeholder for future */}
            <div className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-xl">
              <h3 className="text-base font-semibold text-white">
                House notes
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Add policies here later (cancellation window, dress code, etc.).
              </p>
            </div>
          </div>

          {/* RIGHT: BOOKING (sticky) */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <div className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.06)] p-6 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Book a Table
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    Secure your spot in seconds
                  </p>
                </div>
                <div className="text-xs text-white/60">
                  {formatPrettyDate(date)}
                </div>
              </div>

              {authLoading ? (
                <p className="mt-4 text-white/70">Checking session...</p>
              ) : !isAuthed ? (
                <div className="mt-4 rounded-2xl border border-[var(--maroon-border)] bg-black/25 p-4">
                  <p className="text-sm text-white/80">
                    You must be logged in to make a reservation.
                  </p>
                  <Link
                    to="/log-in-sign-up"
                    state={{ from: location.pathname }}
                    className="
                      mt-3 inline-flex w-full justify-center rounded-xl
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
                  {/* Date */}
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-white/55">
                      Select date
                    </div>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="
                        mt-2 w-full rounded-2xl border border-[var(--maroon-border)]
                        bg-black/20 px-4 py-3 text-sm text-white
                        outline-none focus:border-[var(--maroon-light)]
                      "
                    />
                  </div>

                  {/* Guests stepper */}
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-white/55">
                      Number of guests
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <button
                        type="button"
                        onClick={decGuests}
                        className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
                        aria-label="Decrease guests"
                      >
                        -
                      </button>

                      <div className="text-center">
                        <div className="text-2xl font-semibold text-white">
                          {guests}
                        </div>
                        <div className="text-xs text-white/60">Guests</div>
                      </div>

                      <button
                        type="button"
                        onClick={incGuests}
                        className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
                        aria-label="Increase guests"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-white/55">
                      Select time
                    </div>

                    <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                      {loadingSlots ? (
                        <div className="text-sm text-white/70">
                          Loading slots...
                        </div>
                      ) : availableTimes.length === 0 ? (
                        <div className="text-sm text-white/70">
                          No available slots for this date.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {morningSlots.length > 0 && (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-white/45">
                                Morning
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {morningSlots.map((s) => (
                                  <button
                                    type="button"
                                    key={s.time}
                                    onClick={() => setTime(s.time)}
                                    className={cx(
                                      "rounded-xl border px-3 py-2 text-sm transition",
                                      time === s.time
                                        ? "border-[rgba(127,58,65,0.75)] bg-[rgba(127,58,65,0.25)] text-white"
                                        : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                                    )}
                                  >
                                    {s.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {afternoonSlots.length > 0 && (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-white/45">
                                Afternoon
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {afternoonSlots.map((s) => (
                                  <button
                                    type="button"
                                    key={s.time}
                                    onClick={() => setTime(s.time)}
                                    className={cx(
                                      "rounded-xl border px-3 py-2 text-sm transition",
                                      time === s.time
                                        ? "border-[rgba(127,58,65,0.75)] bg-[rgba(127,58,65,0.25)] text-white"
                                        : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                                    )}
                                  >
                                    {s.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-white/45">
                      Times shown are in 30-minute intervals.
                    </div>
                  </div>

                  {/* Contact fields (kept for your current DB) */}
                  <div className="mt-5 grid gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-white/55">
                        Your name
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="
                          mt-2 w-full rounded-2xl border border-[var(--maroon-border)]
                          bg-black/20 px-4 py-3 text-sm text-white
                          placeholder:text-white/35 outline-none
                          focus:border-[var(--maroon-light)]
                        "
                      />
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wider text-white/55">
                        Phone
                      </div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="
                          mt-2 w-full rounded-2xl border border-[var(--maroon-border)]
                          bg-black/20 px-4 py-3 text-sm text-white
                          placeholder:text-white/35 outline-none
                          focus:border-[var(--maroon-light)]
                        "
                      />
                    </div>
                  </div>

                  {/* Special requests (UI only) */}
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-white/55">
                      Special requests
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., birthday celebration, window seat..."
                      className="
                        mt-2 w-full min-h-[92px] resize-none rounded-2xl
                        border border-white/10 bg-black/20 px-4 py-3
                        text-sm text-white placeholder:text-white/35 outline-none
                        focus:border-[var(--maroon-light)]
                      "
                    />
                  </div>

                  {/* Message */}
                  {msg && (
                    <div className="mt-4 rounded-2xl border border-[var(--maroon-border)] bg-black/25 px-4 py-3 text-sm text-white/80">
                      {msg}
                    </div>
                  )}

                  {/* CTA */}
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
                      mt-5 w-full rounded-2xl px-6 py-3 text-sm font-medium text-white
                      border border-[rgba(127,58,65,0.45)]
                      bg-[linear-gradient(135deg,#7f3a41,#5C252B)]
                      hover:brightness-110 transition
                      disabled:opacity-60
                    "
                  >
                    {submitting ? "Reserving..." : "Proceed to Payment"}
                  </button>

                  <div className="mt-2 text-[11px] text-white/45 text-center">
                    Reservation payment is required to secure your slot.
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}









