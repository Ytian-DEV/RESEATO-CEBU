import { useEffect, useMemo, useState } from "react";
import RestaurantCard from "../components/RestaurantCard";
import type { Restaurant } from "../lib/types/restaurants";
import { listRestaurants } from "../lib/api/restaurants.api";

export default function RestaurantsPage() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listRestaurants();
        if (!alive) return;
        setItems(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load restaurants");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const cuisines = useMemo(
    () => ["All", ...Array.from(new Set(items.map((r) => r.cuisine)))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q);

      const matchesCuisine = cuisine === "All" || r.cuisine === cuisine;
      return matchesQuery && matchesCuisine;
    });
  }, [items, query, cuisine]);

  if (loading) return <div className="p-6 text-neutral-200">Loading...</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-neutral-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Restaurants</h1>
          <p className="mt-1 text-white/70">
            Discover and reserve top dining experiences.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, cuisine, location..."
            className="
          w-full sm:w-72
          rounded-xl
          border
          border-[var(--maroon-border)]
          bg-[var(--maroon-glass)]
          px-4 py-2 text-sm
          text-white
          placeholder:text-white/40
          outline-none
          focus:border-[var(--maroon-light)]
        "
          />

          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="
          w-full sm:w-56
          rounded-xl
          border
          border-[var(--maroon-border)]
          bg-[var(--maroon-glass)]
          px-4 py-2 text-sm
          text-white
          outline-none
          focus:border-[var(--maroon-light)]
        "
          >
            {cuisines.map((c) => (
              <option key={c} value={c} className="bg-neutral-950">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}
