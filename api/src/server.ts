import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import { supabase } from "./supabase";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/restaurants", async (_req, res) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("rating", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  res.json(
    (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      location: r.location,
      rating: Number(r.rating),
      priceLevel: r.price_level,
      description: r.description,
    })),
  );
});

app.get("/restaurants/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data)
    return res.status(404).json({ message: "Restaurant not found" });

  res.json({
    id: data.id,
    name: data.name,
    cuisine: data.cuisine,
    location: data.location,
    rating: Number(data.rating),
    priceLevel: data.price_level,
    description: data.description,
  });
});

app.get("/restaurants/:id/slots", async (req, res) => {
  const restaurantId = req.params.id;
  const date = String(req.query.date ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "Invalid date. Use YYYY-MM-DD" });
  }

  const allSlots = [
    "10:00",
    "11:30",
    "13:00",
    "15:00",
    "17:00",
    "18:30",
    "20:00",
  ];

  const { data, error } = await supabase
    .from("reservations")
    .select("time")
    .eq("restaurant_id", restaurantId)
    .eq("date", date);

  if (error) return res.status(500).json({ message: error.message });

  const taken = new Set(
    (data ?? []).map((x: any) => String(x.time).slice(0, 5)),
  );

  res.json({
    restaurantId,
    date,
    slots: allSlots.map((t) => ({ time: t, available: !taken.has(t) })),
  });
});

app.post("/reservations", async (req, res) => {
  const { restaurantId, name, phone, date, time, guests } = req.body ?? {};

  if (!restaurantId)
    return res.status(400).json({ message: "restaurantId is required" });
  if (typeof name !== "string" || name.trim().length < 2)
    return res.status(400).json({ message: "name is too short" });
  if (typeof phone !== "string" || phone.trim().length < 7)
    return res.status(400).json({ message: "phone is invalid" });
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ message: "date must be YYYY-MM-DD" });
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time))
    return res.status(400).json({ message: "time must be HH:mm" });

  const guestsNum = Number(guests);
  if (!Number.isFinite(guestsNum) || guestsNum < 1 || guestsNum > 20)
    return res.status(400).json({ message: "guests must be 1-20" });

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      phone: phone.trim(),
      date,
      time,
      guests: guestsNum,
    })
    .select("*")
    .single();

  if (error) {
    // Ideally inspect error.code/message for unique constraint, but 409 is fine for now.
    return res.status(409).json({ message: "Time slot already reserved" });
  }

  res.status(201).json({
    id: data.id,
    restaurantId: data.restaurant_id,
    name: data.name,
    phone: data.phone,
    date: String(data.date),
    time: String(data.time).slice(0, 5),
    guests: data.guests,
    createdAt: data.created_at,
  });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
