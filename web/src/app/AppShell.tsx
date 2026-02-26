import Navbar from "../components/layouts/Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const { pathname } = useLocation();

  // Full-bleed pages (no max-width container)
  const fullBleed =
    pathname === "/" ||
    pathname.startsWith("/restaurants/"); // details page often wants full width hero too (optional)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      {fullBleed ? (
        // FULL WIDTH (Home hero will now occupy entire screen)
        <main>
          <Outlet />
        </main>
      ) : (
        // CONTAINER WIDTH (for About/Terms/Auth/Restaurants list etc.)
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      )}
    </div>
  );
}