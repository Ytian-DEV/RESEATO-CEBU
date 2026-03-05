import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  const { pathname } = useLocation();
  const { session } = useSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const initial = session?.user?.email?.charAt(0).toUpperCase() ?? "U";

  useEffect(() => {
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!notifRef.current) return;
      if (notifRef.current.contains(event.target as Node)) return;
      setNotifOpen(false);
    }

    if (notifOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [notifOpen]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/log-in-sign-up");
  }

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-[rgba(114,47,55,0.25)]
        bg-[rgba(48,27,27,0.65)]
        backdrop-blur-xl
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer font-semibold tracking-wide text-white select-none"
        >
          RESEATO
        </div>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>

          <NavLink to="/restaurants" className={linkClass}>
            Restaurants
          </NavLink>

          {session && (
            <NavLink to="/my-reservations" className={linkClass}>
              My Reservations
            </NavLink>
          )}

          {!session ? (
            <NavLink to="/log-in-sign-up" className={linkClass}>
              Login / Sign up
            </NavLink>
          ) : (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-[var(--maroon-border)] bg-[#1a1416] text-white shadow-[0_22px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="border-b border-white/10 px-5 py-4 text-xl font-semibold">
                      Notifications
                    </div>
                    <div className="grid place-items-center gap-3 px-6 py-12 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--maroon-border)] bg-[rgba(127,58,65,0.12)] text-[#e6b9be]">
                        <Bell className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-white/60">No notifications yet</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/profile")}
                className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(114,47,55,0.35)] bg-[rgba(114,47,55,0.2)] text-sm font-semibold text-white transition hover:bg-[rgba(114,47,55,0.35)]"
                aria-label="Open profile"
              >
                {initial}
              </button>

              <button
                onClick={logout}
                className="rounded-lg px-3 py-2 text-sm text-white/70 transition-all hover:text-white hover:bg-[rgba(114,47,55,0.15)]"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}