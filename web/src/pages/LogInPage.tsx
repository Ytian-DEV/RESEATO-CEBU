import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onLogin() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMsg(error.message);
    else setMsg("Logged in!");
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>

      <input
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {msg && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
          {msg}
        </div>
      )}

      <button
        onClick={onLogin}
        className="w-full rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        Login
      </button>
    </div>
  );
}
