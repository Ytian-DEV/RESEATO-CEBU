import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Settings2,
} from "lucide-react";
import {
  getVendorOverview,
  listVendorRestaurants,
  VendorOverview,
  VendorRestaurant,
} from "../lib/api/vendor.api";
import { ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function toCurrency(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

export default function VendorDashboardPage() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<VendorOverview | null>(null);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!isAuthed) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage(null);

        const [overviewData, restaurantsData] = await Promise.all([
          getVendorOverview(),
          listVendorRestaurants(),
        ]);

        if (!alive) return;
        setOverview(overviewData);
        setRestaurants(restaurantsData);
      } catch (error) {
        if (!alive) return;
        setMessage(getErrorMessage(error, "Unable to load vendor dashboard."));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [isAuthed]);

  const cards = useMemo(() => {
    const data = overview ?? {
      restaurantCount: 0,
      reservationCount: 0,
      pendingCount: 0,
      confirmedCount: 0,
      completedCount: 0,
      paidCount: 0,
      totalPaidAmountMinor: 0,
    };

    return [
      {
        key: "restaurants",
        label: "Restaurants",
        value: data.restaurantCount,
        icon: Building2,
      },
      {
        key: "reservations",
        label: "Reservations",
        value: data.reservationCount,
        icon: CalendarClock,
      },
      {
        key: "pending",
        label: "Pending",
        value: data.pendingCount,
        icon: Clock3,
      },
      {
        key: "confirmed",
        label: "Confirmed",
        value: data.confirmedCount,
        icon: CheckCircle2,
      },
    ];
  }, [overview]);

  if (authLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking session...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-3xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 text-white/85">
        Login is required to access the vendor portal.
      </div>
    );
  }

  return (
    <div>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5a6ab]">
          Vendor Portal
        </p>
        <h1 className="mt-2 text-5xl text-white">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-white/65">
          Manage restaurants, slot capacities, and incoming reservations.
        </p>
      </header>
      {message && (
        <div className="mt-5 rounded-2xl border border-[#b44a53]/40 bg-[#4a1e23]/30 px-4 py-3 text-sm text-[#f6c8cd]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-3xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 text-white/75">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vendor summary...
          </div>
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.key}
                  className="rounded-2xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/65">{card.label}</span>
                    <Icon className="h-4 w-4 text-[#d6aab0]" />
                  </div>
                  <div className="mt-3 text-4xl font-semibold text-white">
                    {card.value}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <h2 className="text-3xl text-white">Your Restaurants</h2>
              <p className="mt-1 text-sm text-white/60">
                Quick access to slot and reservation settings.
              </p>

              {restaurants.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  No restaurant assigned yet. Create one from the Restaurants tab.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {restaurants.slice(0, 4).map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl text-white">{restaurant.name}</h3>
                          <p className="text-sm text-white/60">
                            {restaurant.cuisine} - {restaurant.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/vendor/restaurants/${restaurant.id}/slots`}
                            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-medium text-white/85 hover:bg-black/35"
                          >
                            Configure Slots
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <h2 className="text-3xl text-white">Revenue Snapshot</h2>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-white/65">
                  <span>Paid reservations</span>
                  <CircleDollarSign className="h-4 w-4 text-[#d6aab0]" />
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {overview?.paidCount ?? 0}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-white/65">Collected reservation fees</div>
                <div className="mt-2 text-3xl font-semibold text-[#f3c5cb]">
                  {toCurrency(overview?.totalPaidAmountMinor ?? 0)}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Link
                  to="/vendor/reservations"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.18)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgba(127,58,65,0.28)]"
                >
                  <Settings2 className="h-4 w-4" />
                  Review Reservations
                </Link>
                <Link
                  to="/vendor/restaurants"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-black/30"
                >
                  Manage Restaurants
                </Link>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}




