import { api } from './client';
import type { Restaurant } from '../types/restaurants';

export type RestaurantDetails = Restaurant & {
  description: string;
};

export function getRestaurant(id: string) {
  return api<RestaurantDetails>(`/restaurants/${id}`);
}