import { useNavigate } from "react-router-dom";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceLevel: 1 | 2 | 3;
  imageUrl?: string; // ✅ from Supabase
};

const price = (lvl: 1 | 2 | 3) => "₱".repeat(lvl);

function RatingBadge({ value }: { value: number }) {
  const label = Number.isFinite(value) ? value.toFixed(1) : "0.0";
  return (
    <div
      className="
        inline-flex items-center gap-1
        rounded-full px-2.5 py-1
        text-[11px] font-medium
        border border-[var(--maroon-border)]
        bg-[rgba(127,58,65,0.18)]
        text-white/90
      "
      title={`Rating ${label}`}
    >
      <span className="text-[10px] leading-none">★</span>
      <span>{label}</span>
    </div>
  );
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80";

export default function RestaurantCard({ r }: { r: Restaurant }) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/restaurants/${r.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          navigate(`/restaurants/${r.id}`);
      }}
      className="
        group overflow-hidden rounded-2xl
        border border-white/10
        bg-[rgba(255,255,255,0.04)]
        backdrop-blur-xl
        transition-all duration-300
        hover:-translate-y-1 hover:border-[rgba(127,58,65,0.55)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--maroon-light)]
      "
    >
      {/* Image header */}
      <div className="relative h-36 w-full overflow-hidden">
        <img
          src={r.imageUrl || FALLBACK_IMG}
          alt={r.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            // if DB image url is broken, fallback to a safe image
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute left-3 bottom-3 flex items-center gap-2">
          <RatingBadge value={r.rating} />
          <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur">
            {r.cuisine}
          </span>
        </div>

        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur">
          {price(r.priceLevel)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">
              {r.name}
            </h3>
            <p className="mt-1 truncate text-xs text-white/60">{r.location}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] text-white/50">10:00 - 21:00</div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/restaurants/${r.id}`);
            }}
            className="
              rounded-xl px-3 py-2 text-xs font-semibold text-white
              border border-[rgba(127,58,65,0.45)]
              bg-[rgba(127,58,65,0.18)]
              hover:bg-[rgba(127,58,65,0.28)]
              transition
            "
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
