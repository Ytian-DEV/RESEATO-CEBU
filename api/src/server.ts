import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import { supabase } from "./supabase";
import { requireUser } from "./auth";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  }),
);

app.get("/version", (_req, res) => {
  res.json({ version: "0.1.0", env: process.env.NODE_ENV ?? "dev" });
});

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

app.post("/reservations", requireUser, async (req: any, res) => {
  const userId = req.user.id;

  const { restaurantId, name, phone, date, time, guests } = req.body ?? {};

  // validate same as before...

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurantId,
      user_id: userId, // ✅ important
      name: name.trim(),
      phone: phone.trim(),
      date,
      time,
      guests: Number(guests),
    })
    .select("*")
    .single();

  if (error)
    return res.status(409).json({ message: "Time slot already reserved" });

  res.status(201).json({
    id: data.id,
    restaurantId: data.restaurant_id,
    userId: data.user_id,
    name: data.name,
    phone: data.phone,
    date: String(data.date),
    time: String(data.time).slice(0, 5),
    guests: data.guests,
    createdAt: data.created_at,
  });
});

app.get("/me/reservations", requireUser, async (req: any, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data ?? []);
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
