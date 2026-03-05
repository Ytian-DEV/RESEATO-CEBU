import { supabase } from "../supabase";

export async function listRestaurants() {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id,name,cuisine,location,rating,price_level,description,image_url")
    .order("rating", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    location: r.location,
    rating: Number(r.rating),
    priceLevel: r.price_level,
    description: r.description ?? undefined,
    imageUrl: r.image_url ?? undefined, 
  }));
}