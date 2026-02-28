export type Slot = {
  time: string;
  available: boolean;
};

// UI-only slot generator for now.
// Later, we can move this to Supabase (slots table) or compute based on restaurant capacity rules.
export async function getSlots(restaurantId: string, date: string) {
  // simulate fetch delay
  await new Promise((r) => setTimeout(r, 250));

  const baseTimes = [
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

  // simple deterministic availability (so it looks consistent per date)
  const seed = (restaurantId + date).length;
  const slots: Slot[] = baseTimes.map((t, i) => ({
    time: t,
    available: (i + seed) % 4 !== 0, // 1 out of 4 unavailable
  }));

  return { slots };
}