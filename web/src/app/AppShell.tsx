import Navbar from "../components/layouts/Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const { pathname } = useLocation();

  const isAuthPage = pathname === "/log-in-sign-up";
  const fullBleed = isAuthPage || pathname === "/" || pathname.startsWith("/restaurants/");

  return (
    <div className="min-h-screen">
      {!isAuthPage && <Navbar />}

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
