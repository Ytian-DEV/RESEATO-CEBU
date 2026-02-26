import { api } from './client';

export type MyReservation = {
  id: string;
  restaurant_id: string;
  user_id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  created_at: string;
};

export function getMyReservations() {
  return api<MyReservation[]>('/me/reservations');
}