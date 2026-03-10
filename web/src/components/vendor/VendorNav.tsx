import { NavLink } from "react-router-dom";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl border px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "border-[#8b3e46] bg-[rgba(127,58,65,0.25)] text-white"
      : "border-white/10 bg-black/20 text-white/70 hover:bg-black/30 hover:text-white"
  }`;

export default function VendorNav() {
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      <NavLink to="/vendor" end className={tabClass}>
        Dashboard
      </NavLink>
      <NavLink to="/vendor/restaurants" className={tabClass}>
        Restaurants
      </NavLink>
      <NavLink to="/vendor/reservations" className={tabClass}>
        Reservations
      </NavLink>
    </nav>
  );
}
