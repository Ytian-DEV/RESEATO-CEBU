import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  getRestaurant,
  RestaurantDetails,
} from "../lib/api/restaurantDetails.api";
import { createReservation, getSlots, Slot } from "../lib/api/reservations.api";
import { useAuth } from "../lib/auth/useAuth";
import { ApiError } from "../lib/api/client";
import { ArrowLeft, Mail, MapPin, Phone, Star, TrendingUp, UtensilsCrossed } from "lucide-react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPrettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toPesoFromMinor(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
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
  const [note, setNote] = useState("");

  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const heroUrl =
    data?.imageUrl ??
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80&sat=-10";
  const bestSellers = data?.bestSellers ?? [];

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
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 overflow-hidden bg-[#f3f3f4] text-[#1f2937]">
        <div className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-[#f2dde2] blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-28 h-72 w-72 rounded-full bg-[#f8ecee] blur-3xl" />

        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="grid h-11 w-11 place-items-center rounded-xl bg-[#8b3d4a] text-white shadow-[0_10px_22px_rgba(139,61,74,0.26)]"
            >
              <UtensilsCrossed className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8b3d4a]">RESEATO</div>
              <div className="text-lg font-medium text-[#374151]">Preparing restaurant details...</div>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="rounded-[28px] border border-[#e8e2e3] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
          >
            <div className="h-8 w-64 rounded-xl bg-[#f3ecef]" />
            <div className="mt-4 h-4 w-[520px] max-w-full rounded-lg bg-[#f4eff1]" />
            <div className="mt-2 h-4 w-[460px] max-w-full rounded-lg bg-[#f4eff1]" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-24 rounded-2xl bg-[#f2e5e8]" />
              <div className="h-24 rounded-2xl bg-[#f2e5e8]" />
            </div>
          </motion.div>

          <div className="mt-6 text-sm text-[#7b8498]">Loading restaurant...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {msg ?? "Unable to load restaurant details."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <div className="relative h-[380px] overflow-hidden sm:h-[420px]">
        <img
          src={heroUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,58,65,0.18),transparent_55%)]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-sm text-white backdrop-blur transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Discovery
          </button>

          <div className="mt-10 max-w-3xl sm:mt-14">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/18 px-3 py-1 text-xs text-white/95 backdrop-blur">
                {data.cuisine}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/18 px-3 py-1 text-xs text-white/95 backdrop-blur">
                <Star className="h-3.5 w-3.5" aria-hidden /> {Number(data.rating).toFixed(1)}
              </span>
            </div>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {data.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {data.location}
              </span>
              <span className="text-white/40">|</span>
              <span className="text-sm text-white/85">
                Cebu dining | Reservations available
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.1)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">
                  About the Restaurant
                </h2>
                <span className="text-xs text-[#6b7280]">
                  {data.priceLevel ? `Price: ${data.priceLevel}` : ""}
                </span>
              </div>

              <div className="mt-4 leading-relaxed text-[#475467]">
                {data.description}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#ece8e9] bg-[#fafafa] p-4">
                  <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                    Contact details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[#374151]">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#8b3d4a]" aria-hidden />
                      <span>{data.contactPhone || "Contact not available"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#8b3d4a]" aria-hidden />
                      <span>{data.contactEmail || "support@reseato.com"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ece8e9] bg-[#fafafa] p-4">
                  <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                    Location
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#374151]">
                    <MapPin className="h-3.5 w-3.5 text-[#8b3d4a]" aria-hidden />
                    <span>{data.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-[#1f2937] sm:text-xl">
                House rules
              </h3>
              <p className="mt-2 text-sm text-[#667085]">
                Please arrive 10 minutes early. Reservations may be released after a short grace period,
                and special requests are subject to availability.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#1f2937] sm:text-xl">Best Sellers</h3>
                <span className="rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#6b7280]">
                  {bestSellers.length} item{bestSellers.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#667085]">
                Popular picks you might want to try when you dine in.
              </p>

              {bestSellers.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-[#ece8e9] bg-[#fafafa] px-4 py-3 text-sm text-[#667085]">
                  No best-seller items available yet for this restaurant.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {bestSellers.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-[#ece8e9] bg-[#fcfcfd]"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f7ebee_0%,#f5f7fb_100%)] text-[#8b3d4a]">
                            <UtensilsCrossed className="h-8 w-8" aria-hidden />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
                        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/35 bg-black/35 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                          <TrendingUp className="h-3 w-3" aria-hidden /> {item.soldCount} sold
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-base font-semibold text-[#1f2937]">{item.name}</div>
                        <div className="mt-1 text-xs text-[#6b7280]">
                          {item.stockQuantity > 0
                            ? `${item.stockQuantity} in stock`
                            : "Limited availability"}
                        </div>
                        <div className="mt-3 text-lg font-semibold text-[#7b2f3b]">
                          {toPesoFromMinor(item.priceMinor)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.1)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">
                    Book a Table
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Secure your spot in seconds
                  </p>
                </div>
                <div className="text-xs text-[#667085]">
                  {formatPrettyDate(date)}
                </div>
              </div>

              {authLoading ? (
                <p className="mt-4 text-[#6b7280]">Checking session...</p>
              ) : !isAuthed ? (
                <div className="mt-4 rounded-2xl border border-[#e8e2e3] bg-[#fafafa] p-4">
                  <p className="text-sm text-[#475467]">
                    You must be logged in to make a reservation.
                  </p>
                  <Link
                    to="/log-in-sign-up"
                    state={{ from: location.pathname }}
                    className="mt-3 inline-flex w-full justify-center rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-4 py-2 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f2dde2]"
                  >
                    Login / Sign up
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                      Select date
                    </div>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#b46d73]"
                    />
                  </div>

                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                      Number of guests
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-2xl border border-[#ece8e9] bg-[#fafafa] px-4 py-3">
                      <button
                        type="button"
                        onClick={decGuests}
                        className="h-10 w-10 rounded-full border border-[#ddd8da] bg-white text-[#1f2937] transition hover:bg-[#f5f2f3]"
                        aria-label="Decrease guests"
                      >
                        -
                      </button>

                      <div className="text-center">
                        <div className="text-2xl font-semibold text-[#1f2937]">
                          {guests}
                        </div>
                        <div className="text-xs text-[#667085]">Guests</div>
                      </div>

                      <button
                        type="button"
                        onClick={incGuests}
                        className="h-10 w-10 rounded-full border border-[#ddd8da] bg-white text-[#1f2937] transition hover:bg-[#f5f2f3]"
                        aria-label="Increase guests"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                      Select time
                    </div>

                    <div className="mt-2 rounded-2xl border border-[#ece8e9] bg-[#fafafa] p-4">
                      {loadingSlots ? (
                        <div className="text-sm text-[#667085]">Loading slots...</div>
                      ) : availableTimes.length === 0 ? (
                        <div className="text-sm text-[#667085]">
                          No available slots for this date.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {morningSlots.length > 0 && (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-[#7b8498]">
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
                                        ? "border-[#c98d98] bg-[#f8ecee] text-[#7b2f3b]"
                                        : "border-[#ddd8da] bg-white text-[#374151] hover:bg-[#f7f3f4]",
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
                              <div className="text-[11px] uppercase tracking-wider text-[#7b8498]">
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
                                        ? "border-[#c98d98] bg-[#f8ecee] text-[#7b2f3b]"
                                        : "border-[#ddd8da] bg-white text-[#374151] hover:bg-[#f7f3f4]",
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

                    <div className="mt-2 text-[11px] text-[#98a2b3]">
                      Times shown are in 30-minute intervals.
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                        Your name
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="mt-2 w-full rounded-2xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#98a2b3] outline-none focus:border-[#b46d73]"
                      />
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                        Phone
                      </div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="mt-2 w-full rounded-2xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#98a2b3] outline-none focus:border-[#b46d73]"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider text-[#7b8498]">
                      Special requests
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., birthday celebration, window seat..."
                      className="mt-2 min-h-[92px] w-full resize-none rounded-2xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#98a2b3] outline-none focus:border-[#b46d73]"
                    />
                  </div>

                  {msg && (
                    <div className="mt-4 rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
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
                    className="mt-5 w-full rounded-2xl border border-[#d5bcc2] bg-[linear-gradient(135deg,#9b4b56,#7f3a41)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting ? "Reserving..." : "Proceed to Payment"}
                  </button>

                  <div className="mt-2 text-center text-[11px] text-[#98a2b3]">
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
