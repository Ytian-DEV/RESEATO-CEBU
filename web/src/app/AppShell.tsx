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
  const isAdminFullBleed = pathname.startsWith("/admin");

  const fullBleed = hideNavbar || isCustomerFullBleed || isVendorFullBleed || isAdminFullBleed;
  const appShellClass = isAdminFullBleed ? "min-h-screen bg-[#f3f3f4]" : "min-h-screen";
  const fullBleedClass = isAdminFullBleed ? "min-h-screen bg-[#f3f3f4]" : undefined;

  return (
    <div className={appShellClass}>
      {!hideNavbar && <Navbar />}

      {fullBleed ? (
        <main className={fullBleedClass}>
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
