import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, LogOut, User } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../lib/auth/useSession";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
    isActive
      ? "text-white bg-[rgba(114,47,55,0.25)]"
      : "text-white/70 hover:text-white hover:bg-[rgba(114,47,55,0.15)]"
  }`;

function deriveFullName(
  email: string,
  metadata: Record<string, unknown> | undefined,
) {
  if (!metadata) return email.split("@")[0];

  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName) return fullName;

  const firstName =
    typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName =
    typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
  const combined = `${firstName} ${lastName}`.trim();

  return combined || email.split("@")[0];
}

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session } = useSession();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const email = session?.user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";
  const fullName = useMemo(
    () => deriveFullName(email, session?.user?.user_metadata as Record<string, unknown> | undefined),
    [email, session?.user?.user_metadata],
  );

  useEffect(() => {
    setNotifOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    if (notifOpen || profileOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [notifOpen, profileOpen]);

  async function logout() {
    await supabase.auth.signOut();
    setProfileOpen(false);
    navigate("/log-in-sign-up");
  }

  function openProfilePage() {
    setProfileOpen(false);
    navigate("/profile");
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
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileOpen(false);
                  }}
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

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setProfileOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(114,47,55,0.35)] bg-[rgba(114,47,55,0.2)] text-sm font-semibold text-white transition hover:bg-[rgba(114,47,55,0.35)]"
                  aria-label="Open account menu"
                >
                  {initial}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-[var(--maroon-border)] bg-[#1a1416] text-white shadow-[0_22px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="border-b border-white/10 px-4 py-4">
                      <p className="truncate text-base font-semibold text-white">
                        {fullName}
                      </p>
                      <p className="truncate text-sm text-white/60">{email}</p>
                    </div>

                    <button
                      onClick={openProfilePage}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-base text-white/85 transition hover:bg-[rgba(127,58,65,0.2)]"
                    >
                      <User className="h-4 w-4 text-[#e6b9be]" />
                      My Profile
                    </button>

                    <div className="h-px bg-white/10" />

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-base text-[#ff8f9d] transition hover:bg-[rgba(127,58,65,0.2)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}