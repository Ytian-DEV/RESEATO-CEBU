import { useNavigate } from "react-router-dom";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceLevel: 1 | 2 | 3;
};

const price = (lvl: 1 | 2 | 3) => "₱".repeat(lvl);

function RatingPill({ value }: { value: number }) {
  const label = value.toFixed(1);
  return (
    <div
      className="
        inline-flex items-center gap-2
        rounded-full
        border border-[var(--maroon-border)]
        bg-[rgba(127,58,65,0.18)]
        px-3 py-1
        text-xs text-white/85
      "
      title={`Rating ${label}`}
    >
      <span className="text-[11px] leading-none">★</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="
        inline-flex items-center
        rounded-full
        border border-white/10
        bg-white/5
        px-3 py-1
        text-xs text-white/70
      "
    >
      {children}
    </span>
  );
}

export default function RestaurantCard({ r }: { r: Restaurant }) {
  const navigate = useNavigate();

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl
        border border-[var(--maroon-border)]
        bg-[rgba(127,58,65,0.10)]
        p-5
        backdrop-blur-xl
        transition-all duration-300
        hover:-translate-y-1
        hover:border-[rgba(127,58,65,0.55)]
      "
    >
      {/* subtle glow */}
      <div
        className="
          pointer-events-none absolute -inset-24 opacity-0
          bg-[radial-gradient(circle,rgba(127,58,65,0.22),transparent_60%)]
          transition-opacity duration-300
          group-hover:opacity-100
        "
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">
            {r.name}
          </h3>

          <div className="mt-2 flex flex-wrap gap-2">
            <Chip>{r.cuisine}</Chip>
            <Chip>{r.location}</Chip>
          </div>
        </div>

        <div className="shrink-0 text-right space-y-2">
          <div className="text-xs text-white/70">{price(r.priceLevel)}</div>
          <RatingPill value={r.rating} />
        </div>
      </div>

      <button
        onClick={() => navigate(`/restaurants/${r.id}`)}
        className="
          relative mt-5 w-full rounded-xl px-4 py-2.5
          text-sm font-medium text-white
          border border-[rgba(127,58,65,0.45)]
          bg-[linear-gradient(135deg,#7f3a41,#5C252B)]
          shadow-lg shadow-black/30
          transition-all duration-200
          hover:brightness-110
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--maroon-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-black
        "
      >
        View & Reserve
      </button>
    </div>
  );
}