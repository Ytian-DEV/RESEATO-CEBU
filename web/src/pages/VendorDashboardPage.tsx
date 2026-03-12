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

const EMPTY_OVERVIEW: VendorOverview = {
  restaurantCount: 0,
  reservationCount: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  paidCount: 0,
  totalPaidAmountMinor: 0,
};

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

        const [overviewResult, restaurantsResult] = await Promise.allSettled([
          getVendorOverview(),
          listVendorRestaurants(),
        ]);

        if (!alive) return;

        if (overviewResult.status === "fulfilled") {
          setOverview(overviewResult.value);
        } else {
          setOverview(EMPTY_OVERVIEW);
        }

        if (restaurantsResult.status === "fulfilled") {
          setRestaurants(restaurantsResult.value);
        } else {
          setRestaurants([]);
        }

        if (
          overviewResult.status === "rejected" &&
          restaurantsResult.status === "rejected"
        ) {
          setMessage(
            getErrorMessage(
              overviewResult.reason ?? restaurantsResult.reason,
              "Unable to load vendor dashboard.",
            ),
          );
        }
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
    const data = overview ?? EMPTY_OVERVIEW;

    return [
      {
        key: "restaurants",
        label: "Assigned Restaurants",
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
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="inline-flex items-center gap-2 text-[#5b6374]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#4b5563]">
            Login is required to access the vendor portal.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">
            Vendor Portal
          </p>
          <h1 className="mt-2 text-5xl text-[#1f2937]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#5b6374]">
            Review reservations and manage table slots for restaurants assigned by admin.
          </p>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#5b6374] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
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
                    className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6b7280]">{card.label}</span>
                      <Icon className="h-4 w-4 text-[#8b3d4a]" />
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-[#1f2937]">
                      {card.value}
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <h2 className="text-3xl text-[#1f2937]">Assigned Restaurants</h2>
                <p className="mt-1 text-sm text-[#5b6374]">
                  Assigned and managed by admin. You can only configure table slots.
                </p>

                {restaurants.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm text-[#4b5563]">
                    No restaurant assigned yet. Ask admin to assign your vendor profile.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {restaurants.slice(0, 4).map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl text-[#1f2937]">{restaurant.name}</h3>
                            <p className="text-sm text-[#6b7280]">
                              {restaurant.cuisine} - {restaurant.location}
                            </p>
                          </div>
                          <Link
                            to={`/vendor/restaurants/${restaurant.id}/slots`}
                            className="rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-medium text-[#7b2f3b] hover:bg-[#f3dde1]"
                          >
                            Configure Tables
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <h2 className="text-3xl text-[#1f2937]">Revenue Snapshot</h2>
                <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4">
                  <div className="flex items-center justify-between text-[#6b7280]">
                    <span>Paid reservations</span>
                    <CircleDollarSign className="h-4 w-4 text-[#8b3d4a]" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#1f2937]">
                    {overview?.paidCount ?? 0}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4">
                  <div className="text-[#6b7280]">Collected reservation fees</div>
                  <div className="mt-2 text-3xl font-semibold text-[#7b2f3b]">
                    {toCurrency(overview?.totalPaidAmountMinor ?? 0)}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Link
                    to="/vendor/reservations"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]"
                  >
                    <Settings2 className="h-4 w-4" />
                    Open Reservation List
                  </Link>
                  <Link
                    to="/vendor/tables"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[#d8dbe2] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f8fafc]"
                  >
                    Manage Tables
                  </Link>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
