import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../lib/auth/useSession";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-white/10 text-white"
      : "text-neutral-300 hover:bg-white/5 hover:text-white"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const { session } = useSession();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/log-in-sign-up");
  }

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="font-semibold tracking-wide">RESEATO</div>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/restaurants" className={linkClass}>
            Restaurants
          </NavLink>

          {!session ? (
            <NavLink to="/log-in-sign-up" className={linkClass}>
              Login / Sign up
            </NavLink>
          ) : (
            <button
              onClick={logout}
              className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
