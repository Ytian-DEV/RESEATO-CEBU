import Navbar from "../components/layouts/Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const { pathname } = useLocation();

  const isAuthPage = pathname === "/log-in-sign-up";
  const isHomePage = pathname === "/";
  const hideNavbar = isAuthPage || isHomePage;

  const fullBleed = hideNavbar || pathname.startsWith("/restaurants/");

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
