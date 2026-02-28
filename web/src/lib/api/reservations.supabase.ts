import { supabase } from "../supabase";

export type ReservationRow = {
  id: string;
  user_id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | string;
  created_at: string;
};

export async function createReservationSupabase(input: {
  restaurantId: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
}) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      restaurant_id: input.restaurantId,
      name: input.name,
      phone: input.phone,
      date: input.date,
      time: input.time,
      guests: input.guests,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ReservationRow;
}

export async function listMyReservationsSupabase() {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReservationRow[];
}

export async function cancelReservationSupabase(reservationId: string) {
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) throw error;
  return data as ReservationRow;
}