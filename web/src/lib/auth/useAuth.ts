import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRole(value: unknown) {
  const role = asText(value).toLowerCase();
  return role === 'vendor' || role === 'customer' || role === 'admin' ? role : null;
}

async function syncProfileFromUser(user: User | null) {
  if (!user?.id) return;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = asText(metadata.first_name);
  const lastName = asText(metadata.last_name);
  const fullName = asText(metadata.full_name) || `${firstName} ${lastName}`.trim();
  const phone = asText(metadata.phone);
  const role = normalizeRole(metadata.role);

  const payload: Record<string, unknown> = { id: user.id };
  if (fullName) payload.full_name = fullName;
  if (phone) payload.phone = phone;
  if (role) payload.role = role;

  if (Object.keys(payload).length <= 1) return;

  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await supabase
      .from('profiles')
      .upsert(currentPayload, { onConflict: 'id' });

    if (!result.error) return;

    const msg = String(result.error.message ?? '').toLowerCase();
    let changed = false;

    if (msg.includes('phone') && 'phone' in currentPayload) {
      delete currentPayload.phone;
      changed = true;
    }

    if (msg.includes('role') && 'role' in currentPayload) {
      delete currentPayload.role;
      changed = true;
    }

    if (msg.includes('full_name') && 'full_name' in currentPayload) {
      delete currentPayload.full_name;
      changed = true;
    }

    if (!changed || Object.keys(currentPayload).length <= 1) {
      return;
    }
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;

      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        void syncProfileFromUser(nextUser);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextUser = newSession?.user ?? null;

      setSession(newSession);
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        void syncProfileFromUser(nextUser);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading, isAuthed: !!user };
}