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

export default function RestaurantCard({ r }: { r: Restaurant }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{r.name}</h3>
          <p className="mt-1 text-sm text-neutral-300">
            {r.cuisine} • {r.location}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-neutral-300">{price(r.priceLevel)}</div>
          <div className="mt-1 text-sm font-medium">
            ⭐ {r.rating.toFixed(1)}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(`/restaurants/${r.id}`)}
        className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        View & Reserve
      </button>
    </div>
  );
}
