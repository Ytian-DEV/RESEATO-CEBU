import Navbar from "../components/layouts/Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();
  const { pathname } = location;

  const isAuthPage = pathname === "/log-in-sign-up";
  const isHomePage = pathname === "/";
  const hideNavbar = isAuthPage || isHomePage;

  const isCustomerFullBleed =
    pathname.startsWith("/restaurants") ||
    pathname === "/my-reservations" ||
    pathname === "/profile" ||
    pathname.startsWith("/payment/");

  const isVendorFullBleed = pathname.startsWith("/vendor");
  const fullBleed = hideNavbar || isCustomerFullBleed || isVendorFullBleed;

  return (
    <div className="min-h-screen">
      {!hideNavbar && <Navbar />}

      {fullBleed ? (
        <main>
          <Outlet />
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      )}
    </div>
  );
}
