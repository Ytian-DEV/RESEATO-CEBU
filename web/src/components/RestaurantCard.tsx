import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Restaurant } from "../lib/types/restaurants";

const price = (level: number) => {
  const normalized = Math.min(4, Math.max(1, Number(level) || 1));
  return "P".repeat(normalized);
};

function RatingBadge({ value }: { value: number }) {
  const label = Number.isFinite(value) ? value.toFixed(1) : "0.0";
  return (
    <div
      className="
        inline-flex items-center gap-1
        rounded-full border border-[#e4d2d7] bg-[#fff4f6] px-2.5 py-1
        text-[11px] font-semibold text-[#8b3d4a]
      "
      title={`Rating ${label}`}
    >
      <Star className="h-3.5 w-3.5 fill-[#f4c430] text-[#f4c430]" />
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
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          navigate(`/restaurants/${r.id}`);
        }
      }}
      className="
        group overflow-hidden rounded-2xl
        border border-[#e8e2e3]
        bg-white
        shadow-[0_14px_34px_rgba(15,23,42,0.08)]
        transition-all duration-300
        hover:-translate-y-1 hover:border-[#d7b8bf] hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b46d73]
      "
    >
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={r.imageUrl || FALLBACK_IMG}
          alt={r.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1518]/58 via-[#2a1518]/14 to-transparent" />

        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <RatingBadge value={r.rating} />
          <span className="rounded-full border border-[#eadde1] bg-[rgba(91,42,49,0.72)] px-2.5 py-1 text-[11px] text-white/95 backdrop-blur">
            {r.cuisine}
          </span>
        </div>

        <div className="absolute right-3 top-3 rounded-full border border-[#eadde1] bg-[rgba(91,42,49,0.72)] px-2.5 py-1 text-[11px] text-white/95 backdrop-blur">
          {price(r.priceLevel)}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[19px] font-semibold text-[#1f2937]">{r.name}</h3>
            <p className="mt-1 truncate text-sm text-[#6b7280]">{r.location}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-[#98a2b3]">10:00 - 21:00</div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/restaurants/${r.id}`);
            }}
            className="
              rounded-xl border border-[#d5bcc2] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b]
              transition hover:bg-[#f2dde2]
            "
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
