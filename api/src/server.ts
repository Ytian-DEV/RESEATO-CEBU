import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

app.get('/restaurants', (_req, res) => {
  res.json([
    { id: '1', name: 'Baybay Bistro', cuisine: 'Filipino', location: 'Tacloban', rating: 4.6, priceLevel: 2 },
    { id: '2', name: 'Pangasugan Grill', cuisine: 'Seafood', location: 'Baybay', rating: 4.4, priceLevel: 2 },
    { id: '3', name: 'Samar Spice House', cuisine: 'Asian Fusion', location: 'Catbalogan', rating: 4.2, priceLevel: 1 },
    { id: '4', name: 'Green Table', cuisine: 'Healthy', location: 'Ormoc', rating: 4.7, priceLevel: 3 }
  ]);
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
