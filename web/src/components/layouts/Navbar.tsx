import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-white/10 text-white"
      : "text-neutral-300 hover:bg-white/5 hover:text-white"
  }`;

export default function Navbar() {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="font-semibold tracking-wide">RESEATO</div>

        <nav className="flex gap-2">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/restaurants" className={linkClass}>
            Restaurants
          </NavLink>
          <NavLink to="/log-in-sign-up" className={linkClass}>
            LogIn/SignUp
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
