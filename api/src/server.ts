import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

type Reservation = {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guests: number;
  createdAt: string;
};

const reservations: Reservation[] = [];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

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

app.get("/restaurants", (_req, res) => {
  res.json([
    {
      id: "1",
      name: "Baybay Bistro",
      cuisine: "Filipino",
      location: "Tacloban",
      rating: 4.6,
      priceLevel: 2,
    },
    {
      id: "2",
      name: "Pangasugan Grill",
      cuisine: "Seafood",
      location: "Baybay",
      rating: 4.4,
      priceLevel: 2,
    },
    {
      id: "3",
      name: "Samar Spice House",
      cuisine: "Asian Fusion",
      location: "Catbalogan",
      rating: 4.2,
      priceLevel: 1,
    },
    {
      id: "4",
      name: "Green Table",
      cuisine: "Healthy",
      location: "Ormoc",
      rating: 4.7,
      priceLevel: 3,
    },
  ]);
});

app.get("/restaurants/:id", (req, res) => {
  const restaurants = [
    {
      id: "1",
      name: "Baybay Bistro",
      cuisine: "Filipino",
      location: "Tacloban",
      rating: 4.6,
      priceLevel: 2,
      description: "Modern Filipino dining experience.",
    },
    {
      id: "2",
      name: "Pangasugan Grill",
      cuisine: "Seafood",
      location: "Baybay",
      rating: 4.4,
      priceLevel: 2,
      description: "Fresh seafood near the coast.",
    },
    {
      id: "3",
      name: "Samar Spice House",
      cuisine: "Asian Fusion",
      location: "Catbalogan",
      rating: 4.2,
      priceLevel: 1,
      description: "Bold Asian-inspired flavors.",
    },
    {
      id: "4",
      name: "Green Table",
      cuisine: "Healthy",
      location: "Ormoc",
      rating: 4.7,
      priceLevel: 3,
      description: "Healthy and organic meals.",
    },
  ];

  const restaurant = restaurants.find((r) => r.id === req.params.id);

  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  res.json(restaurant);
});

app.get("/restaurants/:id/slots", (req, res) => {
  const { id } = req.params;
  const date = String(req.query.date ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "Invalid date. Use YYYY-MM-DD" });
  }

  // simple fixed slots for now
  const allSlots = [
    "10:00",
    "11:30",
    "13:00",
    "15:00",
    "17:00",
    "18:30",
    "20:00",
  ];

  // mark taken slots as unavailable
  const taken = new Set(
    reservations
      .filter((r) => r.restaurantId === id && r.date === date)
      .map((r) => r.time),
  );

  const slots = allSlots.map((t) => ({ time: t, available: !taken.has(t) }));
  res.json({ restaurantId: id, date, slots });
});

app.get('/restaurants/:id/slots', (req, res) => {
  const { id } = req.params;
  const date = String(req.query.date ?? '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date. Use YYYY-MM-DD' });
  }

  // simple fixed slots for now
  const allSlots = ['10:00', '11:30', '13:00', '15:00', '17:00', '18:30', '20:00'];

  // mark taken slots as unavailable
  const taken = new Set(
    reservations
      .filter((r) => r.restaurantId === id && r.date === date)
      .map((r) => r.time),
  );

  const slots = allSlots.map((t) => ({ time: t, available: !taken.has(t) }));
  res.json({ restaurantId: id, date, slots });
});

app.post('/reservations', (req, res) => {
  const body = req.body as Partial<Reservation>;

  const restaurantId = String(body.restaurantId ?? '');
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const date = String(body.date ?? '');
  const time = String(body.time ?? '');
  const guests = Number(body.guests ?? 0);

  if (!restaurantId) return res.status(400).json({ message: 'restaurantId is required' });
  if (name.length < 2) return res.status(400).json({ message: 'name is too short' });
  if (phone.length < 7) return res.status(400).json({ message: 'phone is invalid' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
  if (!/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ message: 'time must be HH:mm' });
  if (!Number.isFinite(guests) || guests < 1 || guests > 20)
    return res.status(400).json({ message: 'guests must be 1-20' });

  // prevent double booking for the same restaurant/date/time
  const exists = reservations.some(
    (r) => r.restaurantId === restaurantId && r.date === date && r.time === time,
  );
  if (exists) return res.status(409).json({ message: 'Time slot already reserved' });

  const reservation: Reservation = {
    id: makeId(),
    restaurantId,
    name,
    phone,
    date,
    time,
    guests,
    createdAt: new Date().toISOString(),
  };

  reservations.push(reservation);
  res.status(201).json(reservation);
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
