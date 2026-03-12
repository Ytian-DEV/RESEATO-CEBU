import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  LogOut,
  User,
  UtensilsCrossed,
} from "lucide-react";
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
  `relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[#f8ecee] text-[#7b2f3b]"
      : "text-[#5b6374] hover:bg-[#f7f3f4] hover:text-[#7b2f3b]"
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
      { to: "/admin", label: "Dashboard", end: true },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/restaurants", label: "Restaurants" },
      { to: "/admin/reservations", label: "Reservations" },
    ];
  }

  if (roleKind === "customer") {
    return [
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
  const [profileFullName, setProfileFullName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const email = session?.user?.email ?? "";
  const fullName = useMemo(
    () =>
      deriveFullName(
        email,
        session?.user?.user_metadata as Record<string, unknown> | undefined,
      ),
    [email, session?.user?.user_metadata],
  );
  const metadataAvatarUrl = useMemo(() => {
    const value = session?.user?.user_metadata?.avatar_url;
    return typeof value === "string" ? value.trim() : "";
  }, [session?.user?.user_metadata]);
  const displayFullName = profileFullName || fullName;
  const displayAvatarUrl = metadataAvatarUrl || profileAvatarUrl;
  const initial = (displayFullName || email).charAt(0).toUpperCase() || "U";
  const shouldShowAvatar = Boolean(displayAvatarUrl) && !avatarLoadError;

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

    async function loadProfileContext() {
      if (!session?.user) {
        setRole("customer");
        setProfileFullName("");
        setProfileAvatarUrl("");
        setAvatarLoadError(false);
        return;
      }

      const metadataRole = normalizeRole(session.user.user_metadata?.role);
      const metadataAvatar =
        typeof session.user.user_metadata?.avatar_url === "string"
          ? session.user.user_metadata.avatar_url.trim()
          : "";

      if (alive) {
        setRole(metadataRole || "customer");
        setProfileAvatarUrl(metadataAvatar);
        setAvatarLoadError(false);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!alive || error || !data) return;

      if (data.role) {
        setRole(normalizeRole(data.role));
      }

      if (typeof data.full_name === "string" && data.full_name.trim()) {
        setProfileFullName(data.full_name.trim());
      }

      if (typeof data.avatar_url === "string") {
        setProfileAvatarUrl(data.avatar_url.trim());
        setAvatarLoadError(false);
      }
    }

    loadProfileContext();

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
    if (roleKind === "admin") {
      navigate("/admin");
      return;
    }

    if (roleKind === "vendor") {
      navigate("/vendor");
      return;
    }

    if (roleKind === "customer") {
      navigate("/restaurants");
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
        border-b border-[#e8dfe2]
        bg-[rgba(255,255,255,0.92)]
        backdrop-blur-xl
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <button
          onClick={handleBrandClick}
          className="group inline-flex items-center gap-2.5 rounded-xl px-1 text-left"
          aria-label="Go to dashboard"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#8b3d4a] shadow-sm shadow-[#e8ccd1] transition-all duration-300 group-hover:bg-[#7b2f3b]">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </span>
          <span className="text-[24px] font-semibold tracking-tight text-[#1f2937]">RESEATO</span>
        </button>

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
              <span className="hidden rounded-full border border-[#dfc8cd] bg-[#f8ecee] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#7b2f3b] md:inline-flex">
                {roleLabel}
              </span>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileOpen(false);
                  }}
                  className="relative rounded-full border border-[#e0d6d8] bg-white p-2 text-[#7b2f3b] transition hover:bg-[#f7f3f4]"
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
                  <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-[#eadde1] bg-white text-[#1f2937] shadow-[0_22px_48px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center justify-between border-b border-[#f0e8ea] px-5 py-4">
                      <div className="text-lg font-semibold">Notifications</div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e8dfe2] bg-[#faf7f8] px-2.5 py-1.5 text-xs text-[#5b6374] hover:bg-[#f5eff1]"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {loadingNotifications ? (
                      <div className="px-6 py-6 text-sm text-[#6b7280]">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="grid place-items-center gap-3 px-6 py-12 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-full border border-[#eadde1] bg-[#f8ecee] text-[#7b2f3b]">
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className="text-sm text-[#6b7280]">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="max-h-[380px] overflow-y-auto">
                        {notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationClick(item)}
                            className={`w-full border-b border-[#f4edf0] px-4 py-3 text-left transition hover:bg-[#faf5f7] ${
                              item.is_read ? "bg-transparent" : "bg-[#fff8fa]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-[#1f2937]">{item.title}</p>
                              <span className="shrink-0 text-[11px] text-[#8b97a8]">
                                {formatNotificationTime(item.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#5b6374]">{item.body}</p>
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
                  className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#d8c0c6] bg-[#f8ecee] text-sm font-semibold text-[#7b2f3b] transition hover:bg-[#f4e0e5]"
                  aria-label="Open account menu"
                >
                  {shouldShowAvatar ? (
                    <img
                      src={displayAvatarUrl}
                      alt="Profile avatar"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    initial
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-[#eadde1] bg-white text-[#1f2937] shadow-[0_22px_48px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-[#f0e8ea] px-4 py-4">
                      <p className="truncate text-base font-semibold text-[#1f2937]">
                        {displayFullName}
                      </p>
                      <p className="truncate text-sm text-[#6b7280]">{email}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#8b3d4a]">
                        {roleLabel}
                      </p>
                    </div>

                    <button
                      onClick={openProfilePage}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#374151] transition hover:bg-[#faf5f7]"
                    >
                      <User className="h-4 w-4 text-[#8b3d4a]" />
                      My Profile
                    </button>

                    <div className="h-px bg-[#f0e8ea]" />

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#b42336] transition hover:bg-[#fff3f5]"
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

