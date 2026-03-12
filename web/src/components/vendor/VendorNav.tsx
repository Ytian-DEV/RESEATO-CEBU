import { NavLink } from "react-router-dom";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl border px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "border-[#c98d98] bg-[#f8ecee] text-[#7b2f3b]"
      : "border-[#ddd8da] bg-white text-[#5b6374] hover:bg-[#f8fafc] hover:text-[#1f2937]"
  }`;

export default function VendorNav() {
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      <NavLink to="/vendor" end className={tabClass}>
        Dashboard
      </NavLink>
      <NavLink to="/vendor/reservations" className={tabClass}>
        Reservation List
      </NavLink>
      <NavLink to="/vendor/tables" className={tabClass}>
        Tables
      </NavLink>
    </nav>
  );
}
