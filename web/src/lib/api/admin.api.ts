import { api, RequestOptions } from "./client";

const ADMIN_TIMEOUT_MS = 20000;

function adminApi<T>(path: string, options?: RequestOptions) {
  return api<T>(path, { timeoutMs: ADMIN_TIMEOUT_MS, ...(options ?? {}) });
}

export type AdminOverview = {
  users: number;
  vendors: number;
  customers: number;
  admins: number;
  restaurants: number;
  reservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  paidReservations: number;
  totalPaidAmountMinor: number;
};

export type AdminChartPoint = {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  paid: number;
  revenueMinor: number;
};

export type AdminChartsResponse = {
  from: string;
  to: string;
  days: AdminChartPoint[];
  summary: {
    totalReservations: number;
    totalCompleted: number;
    totalCancelled: number;
    totalPaid: number;
    totalRevenueMinor: number;
    completionRate: number;
    cancellationRate: number;
  };
};

export type AdminUser = {
  id: string;
  role: string;
  fullName: string | null;
  createdAt: string | null;
  email: string | null;
};

export type AdminRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceLevel: number;
  description: string | null;
  imageUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  ownerId: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  totalTables: number;
  createdAt: string | null;
};

export type AdminReservation = {
  id: string;
  restaurant_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  restaurant_name?: string | null;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  payment_amount?: number | null;
  payment_provider?: string | null;
  payment_paid_at?: string | null;
  payment_reference?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  decline_reason?: string | null;
};

export type AdminAuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export function getAdminOverview() {
  return adminApi<AdminOverview>("/admin/overview");
}

export function getAdminCharts(params: { from: string; to: string }) {
  const search = new URLSearchParams();
  search.set("from", params.from);
  search.set("to", params.to);
  return adminApi<AdminChartsResponse>(`/admin/charts?${search.toString()}`);
}

export function listAdminUsers(params?: {
  search?: string;
  role?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();

  if (params?.search) search.set("search", params.search);
  if (params?.role) search.set("role", params.role);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const query = search.toString();
  const path = query ? `/admin/users?${query}` : "/admin/users";

  return adminApi<AdminUser[]>(path);
}

export function updateAdminUserRole(targetUserId: string, role: "customer" | "vendor" | "admin") {
  return adminApi<{ ok: boolean; targetUserId: string; role: string }>(
    `/admin/users/${targetUserId}/role`,
    {
      method: "PATCH",
      body: { role },
    },
  );
}

export function listAdminRestaurants(params?: {
  search?: string;
  ownerId?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();

  if (params?.search) search.set("search", params.search);
  if (params?.ownerId) search.set("ownerId", params.ownerId);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const query = search.toString();
  const path = query ? `/admin/restaurants?${query}` : "/admin/restaurants";

  return adminApi<AdminRestaurant[]>(path);
}


export type AdminRestaurantInput = {
  name: string;
  cuisine: string;
  location: string;
  rating?: number;
  priceLevel?: number;
  description?: string;
  imageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  totalTables?: number;
  ownerId?: string | null;
};

export function createAdminRestaurant(payload: AdminRestaurantInput) {
  return adminApi<AdminRestaurant>("/admin/restaurants", {
    method: "POST",
    body: payload,
  });
}

export function assignAdminRestaurantOwner(restaurantId: string, ownerId?: string | null) {
  return adminApi<AdminRestaurant>(`/admin/restaurants/${restaurantId}/owner`, {
    method: "PATCH",
    body: {
      ownerId: ownerId ?? null,
    },
  });
}

export function listAdminReservations(params?: {
  status?: string;
  paymentStatus?: string;
  restaurantId?: string;
  date?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();

  if (params?.status) search.set("status", params.status);
  if (params?.paymentStatus) search.set("paymentStatus", params.paymentStatus);
  if (params?.restaurantId) search.set("restaurantId", params.restaurantId);
  if (params?.date) search.set("date", params.date);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const query = search.toString();
  const path = query ? `/admin/reservations?${query}` : "/admin/reservations";

  return adminApi<AdminReservation[]>(path);
}

export function updateAdminReservationStatus(
  reservationId: string,
  status: "pending" | "confirmed" | "declined" | "cancelled" | "completed",
  reason?: string,
) {
  return adminApi<{ reservation: AdminReservation; message: string }>(
    `/admin/reservations/${reservationId}/status`,
    {
      method: "PATCH",
      body: {
        status,
        reason,
      },
    },
  );
}

export function listAdminAuditLogs(params?: { limit?: number }) {
  const search = new URLSearchParams();
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  const path = query ? `/admin/audit-logs?${query}` : "/admin/audit-logs";

  return adminApi<AdminAuditLog[]>(path);
}





