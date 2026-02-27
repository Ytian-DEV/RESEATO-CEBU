import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../lib/auth/useSession";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
    isActive
      ? "text-white bg-[rgba(114,47,55,0.25)]"
      : "text-white/70 hover:text-white hover:bg-[rgba(114,47,55,0.15)]"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const { session } = useSession();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/log-in-sign-up");
  }

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-[rgba(114,47,55,0.25)]
        bg-[rgba(48, 27, 27, 0.65)]
        backdrop-blur-xl
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer font-semibold tracking-wide text-white select-none"
        >
          RESEATO
        </div>

        {/* Navigation */}
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
              className="
                rounded-lg px-3 py-2 text-sm
                text-white/70
                hover:text-white
                hover:bg-[rgba(114,47,55,0.15)]
                transition-all
              "
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
