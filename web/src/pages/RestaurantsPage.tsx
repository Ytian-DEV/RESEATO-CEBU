import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantCard from "../components/RestaurantCard";
import type { Restaurant } from "../lib/types/restaurants";
import { listRestaurants } from "../lib/api/restaurants.api";

type Category = {
  key: string;
  label: string;
  emoji: string;
  matches: (cuisine: string) => boolean;
};

const CATEGORIES: Category[] = [
  { key: "all", label: "All", emoji: "🍽️", matches: () => true },
  {
    key: "seafood",
    label: "Seafood",
    emoji: "🦐",
    matches: (c) => c.toLowerCase().includes("seafood"),
  },
  {
    key: "filipino",
    label: "Filipino",
    emoji: "🍛",
    matches: (c) => c.toLowerCase().includes("filipino"),
  },
  {
    key: "korean",
    label: "Korean",
    emoji: "🥢",
    matches: (c) => c.toLowerCase().includes("korean"),
  },
  {
    key: "ramen",
    label: "Ramen",
    emoji: "🍜",
    matches: (c) => c.toLowerCase().includes("ramen"),
  },
  {
    key: "buffet",
    label: "Buffet",
    emoji: "🥘",
    matches: (c) => c.toLowerCase().includes("buffet"),
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RestaurantsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // selection for right panel
  const [selected, setSelected] = useState<Restaurant | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listRestaurants(); // ✅ from Supabase (via your API wrapper)
        if (!alive) return;
        setItems(data);

        // set default selection (first item) to populate the right panel
        if (data?.length) setSelected((prev) => prev ?? data[0]);
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

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0],
    [activeCategory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q);

      const matchesCategory = activeCat.matches(r.cuisine);
      return matchesQuery && matchesCategory;
    });
  }, [items, query, activeCat]);

  // if filtered list no longer contains selected, clear it
  useEffect(() => {
    if (!selected) return;
    const stillThere = filtered.some((x) => x.id === selected.id);
    if (!stillThere) setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, query]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-white/70">
          Loading restaurants…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-neutral-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* HERO + RIGHT PANEL */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] items-start">
        {/* hero */}
        <div className="relative overflow-hidden rounded-3xl h-[230px] sm:h-[270px]">
          <img
            src="https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=2400&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(127,58,65,0.20),transparent_55%)]" />

          <div className="relative h-full flex flex-col justify-center px-8">
            <div className="text-white/70 text-xs uppercase tracking-wider">
              Browse Restaurants
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">
              Welcome Folks!
            </h1>
            <p className="mt-2 text-white/80 max-w-md text-sm sm:text-base">
              Enjoy your order at our chosen best restaurant and get a taste of
              delicious food from our best menu.
            </p>

            <div className="mt-5 max-w-md">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants..."
                className="
                  w-full rounded-2xl border border-white/10 bg-black/35
                  px-4 py-3 text-sm text-white placeholder:text-white/40
                  outline-none focus:border-[var(--maroon-light)] backdrop-blur
                "
              />
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY ROW */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {CATEGORIES.map((c) => {
          const active = c.key === activeCategory;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={cx(
                "flex flex-col items-center gap-2 rounded-2xl px-4 py-3 min-w-[92px] transition",
                active
                  ? "bg-[linear-gradient(135deg,#7f3a41,#5C252B)] text-white"
                  : "bg-[rgba(255,255,255,0.05)] text-white/70 hover:bg-white/10",
              )}
            >
              <div
                className={cx(
                  "h-10 w-10 rounded-2xl grid place-items-center border",
                  active
                    ? "border-white/15 bg-white/10"
                    : "border-white/10 bg-white/5",
                )}
              >
                <span className="text-lg">{c.emoji}</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                {c.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* RESTAURANTS GRID */}
      <div>
        <div className="flex items-end justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">
            Recommended Restaurants
          </h2>
          <div className="text-xs text-white/50">
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-12 text-center">
            <div className="text-white/60 text-lg">No restaurants found</div>
            <p className="text-white/40 text-sm mt-2">
              Try adjusting your filters or search term
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => {
              const isSelected = selected?.id === r.id;
              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setSelected((prev) => prev ?? r)}
                  onClick={() => setSelected(r)}
                  className={cx(
                    "rounded-2xl transition",
                    isSelected && "ring-2 ring-[var(--maroon-light)] ring-offset-2 ring-offset-black/60",
                  )}
                >
                  <RestaurantCard r={r} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}