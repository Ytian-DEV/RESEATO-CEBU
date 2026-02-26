import { api } from './client';

export type Slot = { time: string; available: boolean };

export type SlotsResponse = {
  restaurantId: string;
  date: string;
  slots: Slot[];
};

export type CreateReservationInput = {
  restaurantId: string;
  name: string;
  phone: string;
  date: string;  // YYYY-MM-DD
  time: string;  // HH:mm
  guests: number;
};

export type Reservation = CreateReservationInput & {
  id: string;
  createdAt: string;
};

export function getSlots(restaurantId: string, date: string) {
  return api<SlotsResponse>(`/restaurants/${restaurantId}/slots?date=${encodeURIComponent(date)}`);
}

export function createReservation(input: CreateReservationInput) {
  return api<Reservation>('/reservations', { method: 'POST', body: input });
}