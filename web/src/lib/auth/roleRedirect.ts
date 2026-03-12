import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

function normalizeRole(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isVendorRole(role: string) {
  return role === "vendor" || role === "owner" || role === "manager";
}

function mapRoleToRoute(role: string) {
  if (role === "admin") return "/admin";
  if (isVendorRole(role)) return "/vendor";
  return "/restaurants";
}

function normalizePath(value: unknown) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!path || !path.startsWith("/")) return "";
  return path;
}

function canAccessRequestedPath(path: string, role: string) {
  if (!path || path === "/log-in-sign-up") return false;

  if (role === "admin") {
    return path.startsWith("/admin") || path === "/profile";
  }

  if (isVendorRole(role)) {
    return path.startsWith("/vendor") || path === "/profile";
  }

  return !path.startsWith("/admin") && !path.startsWith("/vendor");
}

export function getRouteForRole(role: unknown) {
  return mapRoleToRoute(normalizeRole(role));
}

export async function getPostAuthRedirect(
  session: Session | null,
  requestedPath?: string | null,
) {
  const cleanRequestedPath = normalizePath(requestedPath);
  const metadataRole = normalizeRole(session?.user?.user_metadata?.role);

  if (metadataRole) {
    return canAccessRequestedPath(cleanRequestedPath, metadataRole)
      ? cleanRequestedPath
      : mapRoleToRoute(metadataRole);
  }

  const userId = session?.user?.id;
  if (!userId) {
    return canAccessRequestedPath(cleanRequestedPath, "customer")
      ? cleanRequestedPath
      : "/restaurants";
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const profileRole = !error && data?.role ? normalizeRole(data.role) : "";
    if (profileRole) {
      return canAccessRequestedPath(cleanRequestedPath, profileRole)
        ? cleanRequestedPath
        : mapRoleToRoute(profileRole);
    }
  } catch {
    // Ignore role lookup failure and fall back to customer route.
  }

  return canAccessRequestedPath(cleanRequestedPath, "customer")
    ? cleanRequestedPath
    : "/restaurants";
}
