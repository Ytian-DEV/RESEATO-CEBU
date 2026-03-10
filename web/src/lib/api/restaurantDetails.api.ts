import { api } from "./client";
import type { Restaurant } from "../types/restaurants";

export type RestaurantDetails = Restaurant & {
  description: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export function getRestaurant(id: string) {
  return api<RestaurantDetails>(`/restaurants/${id}`);
}
