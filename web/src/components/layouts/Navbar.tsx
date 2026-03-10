import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, LogOut, User } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../lib/auth/useSession";
import {
  AppNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/api/notifications.api";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
    isActive
      ? "text-white bg-[rgba(114,47,55,0.25)]"
      : "text-white/70 hover:text-white hover:bg-[rgba(114,47,55,0.15)]"
  }`;

type RoleKind = "guest" | "customer" | "vendor" | "admin";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

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

function normalizeRole(raw: unknown) {
  return String(raw ?? "customer").trim().toLowerCase();
}

function getRoleKind(role: string, hasSession: boolean): RoleKind {
  if (!hasSession) return "guest";
  if (role === "admin") return "admin";
  if (role === "vendor" || role === "owner" || role === "manager") {
    return "vendor";
  }
  return "customer";
}

function getRoleLabel(roleKind: RoleKind) {
  if (roleKind === "vendor") return "Vendor";
  if (roleKind === "admin") return "Admin";
  if (roleKind === "customer") return "Customer";
  return "Guest";
}

function getNavItems(roleKind: RoleKind): NavItem[] {
  if (roleKind === "vendor") {
    return [
      { to: "/vendor", label: "Dashboard", end: true },
      { to: "/vendor/restaurants", label: "Restaurants" },
      { to: "/vendor/reservations", label: "Reservations" },
    ];
  }

  if (roleKind === "admin") {
    return [
      { to: "/vendor", label: "Dashboard", end: true },
      { to: "/vendor/restaurants", label: "Restaurants" },
      { to: "/vendor/reservations", label: "Reservations" },
    ];
  }

  if (roleKind === "customer") {
    return [
      { to: "/", label: "Home", end: true },
      { to: "/restaurants", label: "Restaurants" },
      { to: "/my-reservations", label: "My Reservations" },
    ];
  }

  return [
    { to: "/", label: "Home", end: true },
    { to: "/restaurants", label: "Restaurants" },
  ];
}

function formatNotificationTime(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session } = useSession();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [role, setRole] = useState("customer");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const email = session?.user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";
  const fullName = useMemo(
    () =>
      deriveFullName(
        email,
        session?.user?.user_metadata as Record<string, unknown> | undefined,
      ),
    [email, session?.user?.user_metadata],
  );

  const roleKind = useMemo(
    () => getRoleKind(role, Boolean(session)),
    [role, session],
  );

  const roleLabel = useMemo(() => getRoleLabel(roleKind), [roleKind]);

  const navItems = useMemo(() => getNavItems(roleKind), [roleKind]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
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

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      if (!session?.user) {
        setRole("customer");
        return;
      }

      const metadataRole = normalizeRole(session.user.user_metadata?.role);
      if (metadataRole && metadataRole !== "customer") {
        if (alive) setRole(metadataRole);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data?.role) {
        setRole(metadataRole || "customer");
        return;
      }

      setRole(normalizeRole(data.role));
    }

    loadRole();

    return () => {
      alive = false;
    };
  }, [session?.user]);

  useEffect(() => {
    let alive = true;

    async function loadNotifications() {
      if (!session || !notifOpen) return;

      try {
        setLoadingNotifications(true);
        const items = await listMyNotifications();
        if (!alive) return;
        setNotifications(items);
      } catch {
        if (!alive) return;
        setNotifications([]);
      } finally {
        if (!alive) return;
        setLoadingNotifications(false);
      }
    }

    loadNotifications();

    return () => {
      alive = false;
    };
  }, [notifOpen, session]);

  async function logout() {
    await supabase.auth.signOut();
    setProfileOpen(false);
    navigate("/log-in-sign-up");
  }

  function openProfilePage() {
    setProfileOpen(false);
    navigate("/profile");
  }

  function handleBrandClick() {
    if (roleKind === "vendor" || roleKind === "admin") {
      navigate("/vendor");
      return;
    }
    navigate("/");
  }

  async function handleNotificationClick(item: AppNotification) {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
      } catch {
        // Ignore read failure and still navigate.
      }

      setNotifications((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                is_read: true,
              }
            : row,
        ),
      );
    }

    setNotifOpen(false);

    if (item.link) {
      navigate(item.link);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
    } catch {
      // Ignore for now.
    }
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
          onClick={handleBrandClick}
          className="cursor-pointer font-semibold tracking-wide text-white select-none"
        >
          RESEATO
        </div>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
              {item.label}
            </NavLink>
          ))}

          {!session ? (
            <NavLink to="/log-in-sign-up" className={linkClass}>
              Login / Sign up
            </NavLink>
          ) : (
            <>
              <span className="hidden rounded-full border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.2)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#f1c2c8] md:inline-flex">
                {roleLabel}
              </span>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileOpen(false);
                  }}
                  className="relative rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d14d5b] px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-[var(--maroon-border)] bg-[#1a1416] text-white shadow-[0_22px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div className="text-xl font-semibold">Notifications</div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white/80 hover:bg-black/30"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {loadingNotifications ? (
                      <div className="px-6 py-6 text-sm text-white/60">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="grid place-items-center gap-3 px-6 py-12 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--maroon-border)] bg-[rgba(127,58,65,0.12)] text-[#e6b9be]">
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className="text-sm text-white/60">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="max-h-[380px] overflow-y-auto">
                        {notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationClick(item)}
                            className={`w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-[rgba(127,58,65,0.18)] ${
                              item.is_read ? "bg-transparent" : "bg-[rgba(127,58,65,0.12)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <span className="shrink-0 text-[11px] text-white/45">
                                {formatNotificationTime(item.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-white/65">{item.body}</p>
                          </button>
                        ))}
                      </div>
                    )}
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
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#f1c2c8]">
                        {roleLabel}
                      </p>
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
