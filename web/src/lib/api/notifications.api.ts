import { api } from "./client";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export function listMyNotifications() {
  return api<AppNotification[]>("/me/notifications");
}

export function markNotificationRead(notificationId: string) {
  return api<{ ok: boolean }>(`/me/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsRead() {
  return api<{ ok: boolean }>("/me/notifications/read-all", {
    method: "POST",
  });
}
