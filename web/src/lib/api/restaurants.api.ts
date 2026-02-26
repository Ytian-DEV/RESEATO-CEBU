import { api } from './client';
import type { Restaurant } from '../types/restaurants';

export async function listRestaurants(): Promise<Restaurant[]> {
  // later this becomes: return api<Restaurant[]>('/restaurants')
  // for now, we keep a fallback mock while backend is not ready:
  try {
    return await api<Restaurant[]>('/restaurants');
  } catch {
    return [
      { id: '1', name: 'Baybay Bistro', cuisine: 'Filipino', location: 'Tacloban', rating: 4.6, priceLevel: 2 },
      { id: '2', name: 'Pangasugan Grill', cuisine: 'Seafood', location: 'Baybay', rating: 4.4, priceLevel: 2 },
      { id: '3', name: 'Samar Spice House', cuisine: 'Asian Fusion', location: 'Catbalogan', rating: 4.2, priceLevel: 1 },
      { id: '4', name: 'Green Table', cuisine: 'Healthy', location: 'Ormoc', rating: 4.7, priceLevel: 3 }
    ];
  }
}