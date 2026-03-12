import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Loader2,
  MapPin,
  Settings2,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { listVendorRestaurants, VendorRestaurant } from "../lib/api/vendor.api";
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

function formatPriceLevel(level: number) {
  const count = Math.max(1, Math.min(4, Number(level) || 1));
  return "P".repeat(count);
}

export default function VendorTablesPage() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);

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
        const data = await listVendorRestaurants();
        if (!alive) return;
        setRestaurants(data);
      } catch (error) {
        if (!alive) return;
        setMessage(getErrorMessage(error, "Unable to load assigned restaurants."));
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

  const summary = useMemo(() => {
    const restaurantCount = restaurants.length;
    const totalTables = restaurants.reduce(
      (sum, restaurant) => sum + Math.max(0, Number(restaurant.totalTables) || 0),
      0,
    );
    const cuisineCount = new Set(
      restaurants
        .map((restaurant) => String(restaurant.cuisine || "").trim().toLowerCase())
        .filter(Boolean),
    ).size;

    return {
      restaurantCount,
      totalTables,
      cuisineCount,
    };
  }, [restaurants]);

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
            Login is required to access table controls.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">
              Vendor Portal
            </p>
            <h1 className="mt-2 text-5xl text-[#1f2937]">Table Control</h1>
            <p className="mt-1 text-sm text-[#5b6374]">
              Manage slot capacity for restaurants assigned by admin.
            </p>
          </div>

          <Link
            to="/vendor/reservations"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]"
          >
            <CalendarClock className="h-4 w-4" />
            Reservation List
          </Link>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Assigned Restaurants</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{summary.restaurantCount}</div>
          </article>
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Total Tables</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{summary.totalTables}</div>
          </article>
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Cuisine Types</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{summary.cuisineCount}</div>
          </article>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        <section className="mt-5">
          {loading ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#5b6374] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading assigned restaurants...
              </div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#e5e7eb] bg-[#fcfcfd] text-[#8b3d4a]">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[#1f2937]">No assigned restaurant yet</h2>
              <p className="mt-2 text-sm text-[#6b7280]">
                Ask admin to assign your vendor account to a restaurant profile.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {restaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  className="overflow-hidden rounded-3xl border border-[#e8e2e3] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                >
                  {restaurant.imageUrl ? (
                    <img
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-44 w-full place-items-center bg-[linear-gradient(135deg,#f7ebee_0%,#f5f7fb_100%)] text-[#8b3d4a]">
                      <UtensilsCrossed className="h-8 w-8" />
                    </div>
                  )}

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#1f2937]">{restaurant.name}</h3>
                      <p className="mt-1 text-sm text-[#6b7280]">{restaurant.cuisine}</p>
                    </div>

                    <div className="space-y-1 text-sm text-[#4b5563]">
                      <div className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#8b97a8]" />
                        <span className="line-clamp-1">{restaurant.location}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Store className="h-4 w-4 text-[#8b97a8]" />
                        <span>{restaurant.totalTables} total tables</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-[#8b97a8]" />
                        <span>Price Level {formatPriceLevel(restaurant.priceLevel)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        to={`/vendor/restaurants/${restaurant.id}/slots`}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]"
                      >
                        Configure Tables
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

