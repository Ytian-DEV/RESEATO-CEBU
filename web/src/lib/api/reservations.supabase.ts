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
  payment_status?: "unpaid" | "processing" | "paid" | "failed" | "cancelled" | string | null;
  payment_amount?: number | null;
  payment_provider?: string | null;
  payment_checkout_session_id?: string | null;
  payment_reference?: string | null;
  payment_paid_at?: string | null;
  payment_error?: string | null;
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

  if (!input.name.trim()) throw new Error("Name is required");
  if (!input.phone.trim()) throw new Error("Phone is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error("Invalid date format");
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error("Invalid time format");
  if (!Number.isFinite(input.guests) || input.guests < 1)
    throw new Error("Guests must be at least 1");

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

  if (error) {
    if ((error as any).code === "23505") {
      throw new Error(
        "That time slot was just taken. Please choose another time.",
      );
    }
    throw error;
  }
  return data as ReservationRow;
}

export type RestaurantLite = {
  id: string;
  name: string;
  cuisine?: string | null;
  location?: string | null;
};

export type ReservationWithRestaurant = ReservationRow & {
  restaurant?: RestaurantLite | null;
};

export async function listMyReservationsSupabase() {
  const userId = await getAuthedUserId();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (reservations ?? []).map((r: any) => ({
    ...r,
    time: String(r.time).slice(0, 5),
  })) as ReservationRow[];

  const ids = Array.from(new Set(rows.map((r) => r.restaurant_id))).filter(
    Boolean,
  );

  if (ids.length === 0) return rows as ReservationWithRestaurant[];

  const { data: restaurants, error: restErr } = await supabase
    .from("restaurants")
    .select("id,name,cuisine,location")
    .in("id", ids);

  if (restErr) throw restErr;

  const map = new Map<string, RestaurantLite>(
    (restaurants ?? []).map((x: any) => [
      x.id,
      {
        id: x.id,
        name: x.name,
        cuisine: x.cuisine ?? null,
        location: x.location ?? null,
      },
    ]),
  );

  return rows.map((r) => ({
    ...r,
    restaurant: map.get(r.restaurant_id) ?? null,
  })) as ReservationWithRestaurant[];
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

export type Slot = {
  time: string; // "HH:mm"
  available: boolean;
};

const BASE_SLOTS = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export async function getSlotsSupabase(restaurantId: string, date: string) {
  if (!restaurantId) throw new Error("Missing restaurantId");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");

  const { data, error } = await supabase
    .from("reservations")
    .select("time,status")
    .eq("restaurant_id", restaurantId)
    .eq("date", date)
    .neq("status", "cancelled");

  if (error) throw error;

  const taken = new Set(
    (data ?? []).map((x: any) => String(x.time).slice(0, 5)),
  );

  const slots: Slot[] = BASE_SLOTS.map((t) => ({
    time: t,
    available: !taken.has(t),
  }));

  return { restaurantId, date, slots };
}
