import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;

const supabaseAuth = createClient(url, anon);

export type AuthedRequest = {
  user: { id: string };
};

export async function requireUser(req: any, res: any, next: any) {
  const header = String(req.headers.authorization ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Missing token' });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ message: 'Invalid token' });

  req.user = { id: data.user.id };
  next();
}