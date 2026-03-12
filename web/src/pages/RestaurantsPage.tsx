import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Beef,
  CookingPot,
  Drumstick,
  Fish,
  Globe2,
  Leaf,
  Pizza,
  Search,
  Shell,
  Soup,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import RestaurantCard from "../components/RestaurantCard";
import type { Restaurant } from "../lib/types/restaurants";
import { listRestaurants } from "../lib/api/restaurants.api";

type Category = {
  key: string;
  label: string;
  icon: LucideIcon;
  matches: (cuisine: string) => boolean;
};

function hasAnyCuisine(cuisine: string, keywords: string[]) {
  const value = cuisine.toLowerCase();
  return keywords.some((keyword) => value.includes(keyword));
}

const CATEGORIES: Category[] = [
  { key: "all", label: "All", icon: UtensilsCrossed, matches: () => true },
  {
    key: "asian",
    label: "Asian",
    icon: Globe2,
    matches: (c) =>
      hasAnyCuisine(c, [
        "asian",
        "vietnamese",
        "filipino",
        "cebuano",
        "korean",
        "japanese",
        "chinese",
        "thai",
        "ramen",
        "sushi",
      ]),
  },
  {
    key: "vietnamese",
    label: "Vietnamese",
    icon: Soup,
    matches: (c) => hasAnyCuisine(c, ["vietnamese", "pho"]),
  },
  {
    key: "filipino",
    label: "Filipino",
    icon: CookingPot,
    matches: (c) => hasAnyCuisine(c, ["filipino", "cebuano", "bisaya"]),
  },
  {
    key: "korean",
    label: "Korean",
    icon: Beef,
    matches: (c) => hasAnyCuisine(c, ["korean", "samgyeopsal", "kimchi"]),
  },
  {
    key: "japanese",
    label: "Japanese",
    icon: Fish,
    matches: (c) => hasAnyCuisine(c, ["japanese", "sushi", "ramen", "izakaya"]),
  },
  {
    key: "western",
    label: "Western",
    icon: Pizza,
    matches: (c) =>
      hasAnyCuisine(c, [
        "western",
        "american",
        "italian",
        "french",
        "steak",
        "burger",
        "pasta",
        "grill",
      ]),
  },
  {
    key: "chinese",
    label: "Chinese",
    icon: Drumstick,
    matches: (c) =>
      hasAnyCuisine(c, ["chinese", "cantonese", "sichuan", "szechuan", "dim sum"]),
  },
  {
    key: "thai",
    label: "Thai",
    icon: Leaf,
    matches: (c) => hasAnyCuisine(c, ["thai", "tom yum", "pad thai"]),
  },
  {
    key: "seafood",
    label: "Seafood",
    icon: Shell,
    matches: (c) => hasAnyCuisine(c, ["seafood", "fish", "crab", "shrimp"]),
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cuisineTone(key: string, active: boolean) {
  const palette: Record<
    string,
    {
      color: string;
      bg: string;
      border: string;
      activeBg: string;
      activeBorder: string;
    }
  > = {
    all: {
      color: "#8b3d4a",
      bg: "#f7e7ea",
      border: "#e3c2c8",
      activeBg: "#f2dbe0",
      activeBorder: "#cf8e99",
    },
    asian: {
      color: "#4338ca",
      bg: "#e8edff",
      border: "#bec9ff",
      activeBg: "#d9e2ff",
      activeBorder: "#7c8fff",
    },
    vietnamese: {
      color: "#0f766e",
      bg: "#e2fffb",
      border: "#9cf1e5",
      activeBg: "#cff9f2",
      activeBorder: "#2dc9b4",
    },
    filipino: {
      color: "#c2410c",
      bg: "#fff3e5",
      border: "#ffd0a3",
      activeBg: "#ffe7cc",
      activeBorder: "#f28f49",
    },
    korean: {
      color: "#dc2626",
      bg: "#ffe8ea",
      border: "#ffc2c7",
      activeBg: "#ffd8dc",
      activeBorder: "#f36a77",
    },
    japanese: {
      color: "#6d28d9",
      bg: "#f0e8ff",
      border: "#d8c2ff",
      activeBg: "#e6d7ff",
      activeBorder: "#a67cff",
    },
    western: {
      color: "#1d4ed8",
      bg: "#e8f2ff",
      border: "#bed9ff",
      activeBg: "#d8e9ff",
      activeBorder: "#6ea9ff",
    },
    chinese: {
      color: "#b91c1c",
      bg: "#ffe9e9",
      border: "#ffc3c3",
      activeBg: "#ffdcdc",
      activeBorder: "#ef7070",
    },
    thai: {
      color: "#15803d",
      bg: "#e9ffe9",
      border: "#bff0bf",
      activeBg: "#d9f9d9",
      activeBorder: "#61c561",
    },
    seafood: {
      color: "#0369a1",
      bg: "#e6f8ff",
      border: "#b5e8ff",
      activeBg: "#d8f2ff",
      activeBorder: "#58bef1",
    },
  };

  const tone = palette[key] ?? palette.all;
  return {
    color: tone.color,
    backgroundColor: active ? tone.activeBg : tone.bg,
    borderColor: active ? tone.activeBorder : tone.border,
  };
}

export default function RestaurantsPage() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

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

  const normalizedQuery = useMemo(
    () => query.replace(/\s+/g, " ").trim().toLowerCase(),
    [query],
  );

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0],
    [activeCategory],
  );

  const filtered = useMemo(() => {
    return items.filter((r) => {
      const name = String(r.name ?? "").toLowerCase();
      const location = String(r.location ?? "").toLowerCase();
      const cuisine = String(r.cuisine ?? "").toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 ||
        name.includes(normalizedQuery) ||
        location.includes(normalizedQuery) ||
        cuisine.includes(normalizedQuery);

      const matchesCategory = activeCat.matches(cuisine);
      return matchesQuery && matchesCategory;
    });
  }, [items, normalizedQuery, activeCat]);

  if (loading) {
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
              <div className="text-lg font-medium text-[#374151]">Preparing restaurants for you...</div>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="rounded-[28px] border border-[#e8e2e3] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
          >
            <div className="h-6 w-48 rounded-xl bg-[#f3ecef]" />
            <div className="mt-3 h-4 w-80 max-w-full rounded-lg bg-[#f4eff1]" />
            <div className="mt-2 h-4 w-72 max-w-full rounded-lg bg-[#f4eff1]" />
            <div className="mt-5 h-11 w-[420px] max-w-full rounded-2xl bg-[#f2e5e8]" />
          </motion.div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <motion.div
                key={idx}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.7, delay: idx * 0.2 }}
                className="overflow-hidden rounded-2xl border border-[#e8e2e3] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.07)]"
              >
                <div className="h-36 bg-[#f3ecef]" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-40 rounded-lg bg-[#f4eff1]" />
                  <div className="h-4 w-56 max-w-full rounded-lg bg-[#f5f1f2]" />
                  <div className="h-8 w-20 rounded-xl bg-[#f2e5e8]" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-sm text-[#7b8498]">Loading restaurants...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-[#f2cccf] bg-[#fff6f7] p-4 text-[#9f1239]">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <section className="mx-auto max-w-6xl space-y-7 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative h-[250px] overflow-hidden rounded-[28px] sm:h-[280px]"
        >
          <img
            src="https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=2400&q=80"
            alt="Food table"
            className="hero-bg-motion-slow absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/84 via-black/66 to-black/52" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,0,0,0.44),transparent_58%)]" />

          <div className="relative flex h-full flex-col justify-center px-7 sm:px-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
              Browse Restaurants
            </div>
            <h1
              className="mt-2 text-[42px] font-semibold leading-[1.02] tracking-tight text-white sm:text-[48px]"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
            >
              Welcome Folks!
            </h1>
            <p
              className="mt-2 max-w-[620px] text-[17px] leading-[1.35] text-white/95 sm:text-[18px]"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
            >
              Enjoy your order at our chosen best restaurant and get a taste of delicious food from our best menu.
            </p>

            <div className="mt-5 max-w-[420px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search restaurants..."
                  className="w-full rounded-2xl border border-white/50 bg-[rgba(10,10,10,0.42)] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/78 outline-none backdrop-blur focus:border-white/75"
                />
              </label>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {CATEGORIES.map((c) => {
            const active = c.key === activeCategory;
            const Icon = c.icon;
            const tone = cuisineTone(c.key, active);
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={cx(
                  "group flex min-w-[98px] flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition",
                  active
                    ? "border-[#c98d98] bg-[#f8ecee] text-[#7b2f3b] shadow-[0_8px_16px_rgba(139,61,74,0.14)]"
                    : "border-[#e7e1e3] bg-white text-[#5b6374] hover:border-[#d8c6cb] hover:bg-[#fcf8f9]",
                )}
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]"
                  style={{
                    backgroundColor: tone.backgroundColor,
                    borderColor: tone.borderColor,
                    color: tone.color,
                  }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider">{c.label}</div>
              </button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-[35px] font-semibold tracking-tight text-[#1f2937]">Recommended Restaurants</h2>
            <div className="text-sm text-[#7b8498]">
              Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-12 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <div className="text-lg text-[#475467]">No restaurants found</div>
              <p className="mt-2 text-sm text-[#98a2b3]">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r, idx) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(idx * 0.02, 0.12),
                    ease: "easeOut",
                  }}
                  className="rounded-2xl transition"
                >
                  <RestaurantCard r={r} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
