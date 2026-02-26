import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRestaurant, RestaurantDetails } from '../lib/api/restaurantDetails.api';

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<RestaurantDetails | null>(null);

  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then(setData);
  }, [id]);

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">{data.name}</h1>
      <p className="text-neutral-300">
        {data.cuisine} • {data.location}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p>{data.description}</p>
      </div>

      <button className="rounded-xl bg-white/10 px-6 py-3 hover:bg-white/20">
        Reserve Table
      </button>
    </section>
  );
}