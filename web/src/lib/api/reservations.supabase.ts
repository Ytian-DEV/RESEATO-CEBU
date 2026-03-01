import { supabase } from "../supabase";

export type ReservationRow = {
  id: string;
  user_id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // "HH:mm" (or "HH:mm:ss" depending on DB)
  guests: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | string;
  created_at: string;
};

async function getAuthedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createReservationSupabase(input: {
  restaurantId: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
}) {
  const userId = await getAuthedUserId();

  // OPTIONAL: basic client-side validation (still keep it)
  if (!input.name.trim()) throw new Error("Name is required");
  if (!input.phone.trim()) throw new Error("Phone is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error("Invalid date format");
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error("Invalid time format");
  if (!Number.isFinite(input.guests) || input.guests < 1)
    throw new Error("Guests must be at least 1");

  // OPTIONAL: prevent double booking at UI layer (real protection should be unique constraint / RLS)
  const { data: existing, error: existingErr } = await supabase
    .from("reservations")
    .select("id")
    .eq("restaurant_id", input.restaurantId)
    .eq("date", input.date)
    .eq("time", input.time)
    .neq("status", "cancelled")
    .limit(1);

  if (existingErr) throw existingErr;
  if (existing && existing.length > 0)
    throw new Error("That time slot is already reserved.");

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id: userId,
      restaurant_id: input.restaurantId,
      name: input.name.trim(),
      phone: input.phone.trim(),
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
  const userId = await getAuthedUserId();

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // normalize time to HH:mm for UI consistency
  return (data ?? []).map((r: any) => ({
    ...r,
    time: String(r.time).slice(0, 5),
  })) as ReservationRow[];
}

export async function cancelReservationSupabase(reservationId: string) {
  const userId = await getAuthedUserId();

  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return {
    ...(data as ReservationRow),
    time: String((data as any).time).slice(0, 5),
  };
}
